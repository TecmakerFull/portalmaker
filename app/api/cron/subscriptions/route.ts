// =============================================================================
// PORTALMAKER — GET /api/cron/subscriptions (tarea diaria)
// La dispara Supabase pg_cron (supabase/migrations/20261110_subscriptions_cron.sql)
// con Authorization: Bearer CRON_SECRET.
//
//   1. Avisos 7 días y 1 día antes del vencimiento.
//   2. Entrada en período de gracia (estado_pago = 'gracia', aviso una vez).
//   3. Pausa de la tienda al terminar la gracia (suscripcion_activa = false).
//   4. Vence las facturas pendientes viejas y reconcilia pagos con webhook perdido.
//
// Idempotente: el estado se deriva siempre de las fechas, los updates son
// condicionales y cada aviso se registra (clave única) antes de enviarse.
// =============================================================================

import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getPlanConfig } from '@/lib/plans'
import { sendSubscriptionEmail, type SubscriptionEmailKind } from '@/lib/subscriptions/emails'
import {
  classifyCycle,
  addDays,
  isBillablePlan,
  resolveInvoiceAmount,
  resolveListPrice,
  todayArgentina,
} from '@/lib/subscriptions/billing'
import { reconcilePendingInvoices } from '@/lib/subscriptions/server'
import { isAutodebitEnabled, reconcileMandatePayments, reconcileMandatesWithStores, syncAllMandates } from '@/lib/subscriptions/autodebit'

export const maxDuration = 60

const PAGE = 500

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === 'production') {
    // Falla cerrado: sin secreto configurado nadie puede disparar el cron.
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 })
  }

  const admin = createSupabaseAdminClient()
  const today = todayArgentina()
  const result = { evaluadas: 0, recordatorios: 0, enGracia: 0, pausadas: 0, expiradas: 0, reconciliadas: 0, errores: 0 }

  // Precios de lista y mandatos de débito automático, cargados una vez por corrida.
  const { data: planRows } = await admin.from('plans').select('id, price_ars')
  const listPrices = new Map<string, number>((planRows ?? []).map((p) => [p.id, Number(p.price_ars)]))
  const { data: mandates } = await admin.from('subscription_mandates').select('store_id').eq('status', 'authorized')
  const autoDebitStores = new Set((mandates ?? []).map((m) => m.store_id))

  /** Registra el aviso antes de enviarlo; si el envío falla se borra para reintentar mañana. */
  async function sendOnce(
    store: { id: string; nombre: string; admin_email: string | null },
    dueDate: string,
    kind: SubscriptionEmailKind,
    data: Parameters<typeof sendSubscriptionEmail>[2]
  ): Promise<boolean> {
    const { error: logErr } = await admin.from('subscription_notifications_log').insert({
      store_id: store.id,
      due_date: dueDate,
      notification_type: kind,
      sent_to: store.admin_email ?? '',
    })
    if (logErr) return false // ya enviado (clave única) o error de base: no se duplica
    const sent = await sendSubscriptionEmail(kind, { nombre: store.nombre, admin_email: store.admin_email ?? '' }, data)
    if (!sent.ok) {
      await admin
        .from('subscription_notifications_log')
        .delete()
        .eq('store_id', store.id)
        .eq('due_date', dueDate)
        .eq('notification_type', kind)
      return false
    }
    return true
  }

  for (let from = 0; ; from += PAGE) {
    const { data: stores, error } = await admin
      .from('stores')
      .select('id, nombre, admin_email, plan, precio_mensual, fecha_proximo_vencimiento, estado_pago, suscripcion_activa, dias_gracia')
      .not('fecha_proximo_vencimiento', 'is', null)
      // Solo planes que se cobran: una tienda Free con fecha (período de prueba) no se
      // pausa ni recibe avisos de cobro, y bonificado queda exento.
      .in('plan', ['starter', 'maker_pro', 'enterprise'])
      .order('id')
      .range(from, from + PAGE - 1)

    if (error) {
      console.error('cron/subscriptions: error leyendo tiendas:', error.message)
      result.errores++
      break
    }
    if (!stores || stores.length === 0) break

    for (const store of stores) {
      try {
        result.evaluadas++
        const cycle = classifyCycle(store, today)
        if (cycle.phase === 'exempt') continue

        const due = store.fecha_proximo_vencimiento as string
        const graceDays = store.dias_gracia ?? 3
        const planKey = isBillablePlan(store.plan) ? store.plan : null
        const amount = planKey
          ? resolveInvoiceAmount(store, planKey, resolveListPrice(listPrices.get(planKey), planKey))
          : Number(store.precio_mensual ?? 0)
        const emailData = {
          amount,
          planName: getPlanConfig(store.plan).nombre,
          dueDate: due,
          graceEnds: cycle.graceEnds ?? undefined,
          graceDays,
          autoDebit: autoDebitStores.has(store.id),
        }

        if (cycle.phase === 'reminder_7d' || cycle.phase === 'reminder_1d') {
          if (await sendOnce(store, due, cycle.phase, emailData)) result.recordatorios++
        }

        // Próximo a vencer: solo cambia el estado visible, la tienda sigue activa.
        if (cycle.daysToDue !== null && cycle.daysToDue >= 0 && cycle.daysToDue <= 7) {
          await admin.from('stores').update({ estado_pago: 'pendiente' }).eq('id', store.id).eq('estado_pago', 'al_dia')
        }

        if (cycle.phase === 'in_grace') {
          const { data: moved } = await admin
            .from('stores')
            .update({ estado_pago: 'gracia' })
            .eq('id', store.id)
            .eq('fecha_proximo_vencimiento', due)
            .in('estado_pago', ['al_dia', 'pendiente'])
            .select('id')
          if (moved && moved.length > 0) result.enGracia++
          await sendOnce(store, due, 'grace_started', emailData)
        }

        if (cycle.phase === 'paused') {
          // La condición sobre fecha_proximo_vencimiento evita pausar una tienda que
          // acaba de pagar: el pago mueve la fecha y este update ya no coincide.
          const { data: paused } = await admin
            .from('stores')
            .update({ estado_pago: 'vencido', suscripcion_activa: false })
            .eq('id', store.id)
            .eq('fecha_proximo_vencimiento', due)
            .or('estado_pago.neq.vencido,suscripcion_activa.neq.false')
            .select('id')
          if (paused && paused.length > 0) {
            result.pausadas++
            await sendOnce(store, due, 'store_paused', emailData)
          }
        }
      } catch (err: any) {
        result.errores++
        console.error(`cron/subscriptions: error con la tienda ${store.id}:`, err?.message)
      }
    }

    if (stores.length < PAGE) break
  }

  // Facturas pendientes más viejas que la vigencia del link: se cierran.
  const cutoff = `${addDays(today, -7)}T00:00:00Z`
  const { data: expired } = await admin
    .from('subscription_invoices')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .select('id')
  result.expiradas = expired?.length ?? 0

  try {
    const rec = await reconcilePendingInvoices()
    result.reconciliadas = rec.credited
  } catch (err: any) {
    result.errores++
    console.error('cron/subscriptions: error en la reconciliación:', err?.message)
  }

  // Red de seguridad: se corre aunque el flag esté apagado, para que un débito ya creado
  // nunca siga cobrando a una tienda que pasó a Free o Bonificado.
  try {
    await reconcileMandatesWithStores()
  } catch (err: any) {
    result.errores++
    console.error('cron/subscriptions: error alineando débitos con los planes:', err?.message)
  }

  // Débito automático (si está habilitado): estado de las suscripciones y cobros recientes.
  if (isAutodebitEnabled()) {
    try {
      await syncAllMandates()
      result.reconciliadas += await reconcileMandatePayments()
    } catch (err: any) {
      result.errores++
      console.error('cron/subscriptions: error en el débito automático:', err?.message)
    }
  }

  return NextResponse.json({ ok: true, fecha: today, ...result })
}
