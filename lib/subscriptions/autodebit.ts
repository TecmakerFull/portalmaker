// =============================================================================
// PORTALMAKER — Débito automático opcional (suscripción de Mercado Pago, /preapproval)
// Solo servidor. Detrás del flag SUBSCRIPTION_AUTODEBIT_ENABLED: hasta validar en
// sandbox cómo MP relaciona cada cobro recurrente, no se ofrece a las tiendas.
//
// Cada cobro aprobado termina en la MISMA acreditación que el pago manual
// (applyPlatformPayment -> RPC process_subscription_payment), así que vencimientos,
// gracia, pausa, comprobantes y reembolsos se comportan igual.
// =============================================================================

import { randomUUID } from 'node:crypto'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getMpApiBaseUrl } from '@/lib/mp-payments'
import { getSafeReturnOrigin } from '@/lib/mercadopago'
import { notifyPlatformAlert } from '@/lib/email-notifications'
import { getPlanConfig } from '@/lib/plans'
import { sendSubscriptionEmail } from '@/lib/subscriptions/emails'
import {
  addDays,
  checkPaymentAmount,
  computeNextDue,
  isBillablePlan,
  resolveInvoiceAmount,
  resolveListPrice,
  todayArgentina,
} from '@/lib/subscriptions/billing'
import { applyPlatformPayment, getPlatformMpToken, type PlatformPaymentResult } from '@/lib/subscriptions/server'
import type { BillablePlan, Store, SubscriptionInvoice, SubscriptionMandate } from '@/types/database'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isAutodebitEnabled(): boolean {
  return process.env.SUBSCRIPTION_AUTODEBIT_ENABLED === 'true'
}

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://portalmaker.com.ar').replace(/\/$/, '')
}

async function mpFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getPlatformMpToken()
  if (!token) throw new Error('PLATFORM_TOKEN_MISSING')
  return fetch(`${getMpApiBaseUrl()}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    cache: 'no-store',
  })
}

type MandateStatus = SubscriptionMandate['status']

/** MP usa 'canceled' (una l) en algunos endpoints y 'cancelled' en otros: se normaliza. */
function normalizeStatus(raw: unknown): MandateStatus | null {
  const v = String(raw ?? '').toLowerCase()
  if (v === 'authorized' || v === 'pending' || v === 'paused') return v
  // 'finished' / 'expired': la suscripción llegó a su fecha de fin (48 cuotas); la tienda vuelve a pago manual.
  if (v === 'cancelled' || v === 'canceled' || v === 'finished' || v === 'expired') return 'cancelled'
  return null
}

// -----------------------------------------------------------------------------
// Alta: crea la suscripción en MP (pending) y devuelve el link para autorizar
// -----------------------------------------------------------------------------
export async function createMandate(params: {
  store: Store
  returnOrigin?: string | null
}): Promise<{ initPoint: string; mandateId: string }> {
  const { store } = params
  if (!isBillablePlan(store.plan)) throw new Error('PLAN_NOT_BILLABLE')
  const plan = store.plan as BillablePlan
  const admin = createSupabaseAdminClient()

  const { data: existing } = await admin.from('subscription_mandates').select('*').eq('store_id', store.id).maybeSingle()
  if (existing?.status === 'authorized') throw new Error('ALREADY_ACTIVE')
  // Un alta pendiente o cancelada se reemplaza: se cierra la suscripción vieja en MP.
  if (existing) {
    if (existing.mp_preapproval_id && existing.status !== 'cancelled') {
      await mpFetch(`/preapproval/${existing.mp_preapproval_id}`, { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) }).catch(() => null)
    }
    await admin.from('subscription_mandates').delete().eq('id', existing.id)
  }

  const { data: planRow } = await admin.from('plans').select('price_ars').eq('id', plan).maybeSingle()
  const amount = resolveInvoiceAmount(store, plan, resolveListPrice(planRow ? Number(planRow.price_ars) : null, plan))
  if (!(amount > 0)) throw new Error('INVALID_AMOUNT')
  // Con credenciales de prueba MP exige que el pagador sea un usuario de prueba: en
  // desarrollo se puede forzar su email. En producción siempre se usa el del dueño.
  const payerEmail =
    process.env.NODE_ENV !== 'production' && process.env.MP_TEST_PAYER_EMAIL ? process.env.MP_TEST_PAYER_EMAIL : store.admin_email
  if (!payerEmail) throw new Error('MISSING_PAYER_EMAIL')

  const mandateId = randomUUID()
  const { error: insErr } = await admin.from('subscription_mandates').insert({
    id: mandateId,
    store_id: store.id,
    status: 'pending',
    target_plan: plan,
    amount,
    payer_email: payerEmail,
  })
  if (insErr) throw new Error(`MANDATE_INSERT_FAILED:${insErr.message}`)

  // Si la tienda ya pagó este mes, el primer cobro automático arranca en su vencimiento
  // para no cobrar dos veces; si ya venció, cobra de inmediato (es la renovación).
  const today = todayArgentina()
  const due = store.fecha_proximo_vencimiento
  const startDate = due && due > today ? `${due}T12:00:00.000-03:00` : undefined

  const safeOrigin = getSafeReturnOrigin(params.returnOrigin, store)
  const backBase = safeOrigin.startsWith('https://') ? safeOrigin : appBaseUrl()

  const payload = {
    reason: `Suscripción Portalmaker - Plan ${getPlanConfig(plan).nombre}`,
    external_reference: `mandate_${mandateId}`,
    payer_email: payerEmail,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: amount,
      currency_id: 'ARS',
      ...(startDate ? { start_date: startDate } : {}),
      // La documentación exige fecha de fin: 5 años, cancelable en cualquier momento.
      end_date: new Date(Date.now() + 5 * 365 * 86_400_000).toISOString(),
    },
    back_url: `${backBase}/tienda/admin/suscripcion?autodebit=return`,
    status: 'pending',
  }

  try {
    const res = await mpFetch('/preapproval', { method: 'POST', body: JSON.stringify(payload) })
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 400)
      throw new Error(`MP_PREAPPROVAL_FAILED:${res.status}:${detail}`)
    }
    const data = await res.json()
    if (!data.id || !data.init_point) throw new Error('MP_PREAPPROVAL_NO_INIT_POINT')
    await admin.from('subscription_mandates').update({ mp_preapproval_id: String(data.id), updated_at: new Date().toISOString() }).eq('id', mandateId)
    return { initPoint: data.init_point, mandateId }
  } catch (err) {
    await admin.from('subscription_mandates').delete().eq('id', mandateId)
    throw err
  }
}

// -----------------------------------------------------------------------------
// Baja: la tienda vuelve a pago manual (el período ya pagado se conserva)
// -----------------------------------------------------------------------------
export async function cancelMandate(storeId: string): Promise<{ cancelled: boolean }> {
  const admin = createSupabaseAdminClient()
  const { data: mandate } = await admin.from('subscription_mandates').select('*').eq('store_id', storeId).maybeSingle()
  if (!mandate || mandate.status === 'cancelled') return { cancelled: false }

  if (mandate.mp_preapproval_id) {
    const res = await mpFetch(`/preapproval/${mandate.mp_preapproval_id}`, { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) })
    // Si MP ya no la conoce (404) igual se marca cancelada acá; otro error se reintenta.
    if (!res.ok && res.status !== 404) throw new Error(`MP_CANCEL_FAILED:${res.status}`)
  }
  await admin.from('subscription_mandates').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', mandate.id)
  return { cancelled: true }
}

// -----------------------------------------------------------------------------
// Sincroniza el estado de la suscripción consultando siempre MP (nunca el body del webhook)
// -----------------------------------------------------------------------------
export async function syncMandate(preapprovalId: string): Promise<{ status: string; httpStatus: number }> {
  const admin = createSupabaseAdminClient()
  const { data: mandate } = await admin.from('subscription_mandates').select('*').eq('mp_preapproval_id', preapprovalId).maybeSingle()
  if (!mandate) return { status: 'mandate_not_found', httpStatus: 200 }

  let res: Response
  try {
    res = await mpFetch(`/preapproval/${encodeURIComponent(preapprovalId)}`)
  } catch {
    return { status: 'mp_fetch_network_error', httpStatus: 500 }
  }
  if (res.status === 404) return { status: 'preapproval_not_found', httpStatus: 200 }
  if (!res.ok) return { status: 'mp_fetch_error', httpStatus: 500 }

  const data = await res.json()
  const status = normalizeStatus(data.status)
  if (!status) return { status: `ignored_${String(data.status)}`, httpStatus: 200 }

  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  const mpAmount = Number(data.auto_recurring?.transaction_amount)
  if (mpAmount > 0) patch.amount = mpAmount
  await admin.from('subscription_mandates').update(patch).eq('id', mandate.id)
  return { status: `synced_${status}`, httpStatus: 200 }
}

/** Reconciliación: sincroniza las suscripciones activas o pendientes (webhooks perdidos). */
export async function syncAllMandates(): Promise<number> {
  const admin = createSupabaseAdminClient()
  const { data } = await admin.from('subscription_mandates').select('mp_preapproval_id').in('status', ['pending', 'authorized']).not('mp_preapproval_id', 'is', null).limit(200)
  let n = 0
  for (const m of data ?? []) {
    try {
      const r = await syncMandate(m.mp_preapproval_id as string)
      if (r.status.startsWith('synced_')) n++
    } catch {
      // se reintenta en la próxima corrida
    }
  }
  return n
}

/** Tras un cambio de plan por pago, el débito automático pasa a cobrar el monto del plan nuevo. */
export async function syncMandateToStorePlan(storeId: string): Promise<void> {
  const admin = createSupabaseAdminClient()
  const { data: mandate } = await admin.from('subscription_mandates').select('*').eq('store_id', storeId).maybeSingle()
  if (!mandate || mandate.status === 'cancelled') return
  const { data: store } = await admin.from('stores').select('*').eq('id', storeId).maybeSingle()
  if (!store || !isBillablePlan(store.plan)) return

  const plan = store.plan as BillablePlan
  const { data: planRow } = await admin.from('plans').select('price_ars').eq('id', plan).maybeSingle()
  const amount = resolveInvoiceAmount(store, plan, resolveListPrice(planRow ? Number(planRow.price_ars) : null, plan))
  if (amount === Number(mandate.amount) && plan === mandate.target_plan) return

  if (mandate.mp_preapproval_id) {
    const res = await mpFetch(`/preapproval/${mandate.mp_preapproval_id}`, {
      method: 'PUT',
      body: JSON.stringify({ auto_recurring: { transaction_amount: amount, currency_id: 'ARS' } }),
    })
    if (!res.ok) throw new Error(`MP_UPDATE_AMOUNT_FAILED:${res.status}`)
  }
  await admin.from('subscription_mandates').update({ amount, target_plan: plan, updated_at: new Date().toISOString() }).eq('id', mandate.id)
}

// -----------------------------------------------------------------------------
// Cobro recurrente: acredita un pago aprobado contra el mandato
// -----------------------------------------------------------------------------
export async function creditAutoDebitPayment(payment: any, knownMandate?: SubscriptionMandate | null): Promise<PlatformPaymentResult> {
  const admin = createSupabaseAdminClient()
  const ref = String(payment.external_reference ?? '')

  let mandate = knownMandate ?? null
  if (!mandate) {
    const mandateId = ref.startsWith('mandate_') ? ref.slice(8) : ''
    if (!UUID_RE.test(mandateId)) return { handled: true, status: 'invalid_reference', httpStatus: 200 }
    const { data } = await admin.from('subscription_mandates').select('*').eq('id', mandateId).maybeSingle()
    mandate = (data as SubscriptionMandate | null) ?? null
  }
  if (!mandate) return { handled: true, status: 'mandate_not_found', httpStatus: 200 }

  const { data: store } = await admin.from('stores').select('*').eq('id', mandate.store_id).maybeSingle()
  const paymentId = String(payment.id)

  // Reembolsos y contracargos: se resuelven por pago, sin necesitar la factura.
  if (payment.status === 'refunded' || payment.status === 'charged_back') {
    const { data: rev } = await admin.rpc('reverse_subscription_payment', { p_mp_payment_id: paymentId })
    if (rev?.success && !rev.already_processed) {
      await notifyPlatformAlert({
        type: 'subscription_refunded',
        store: store as Store | null,
        details: `Cobro automático ${payment.status}. Se retrocedió el vencimiento; revisar si corresponde bajar el plan o cancelar el débito.`,
        paymentId,
      })
    }
    return { handled: true, status: `reversed_${payment.status}`, httpStatus: 200, storeId: mandate.store_id }
  }

  if (payment.status === 'rejected') {
    await notifyFailedCharge(store as Store | null, mandate)
    return { handled: true, status: 'charge_rejected', httpStatus: 200, storeId: mandate.store_id }
  }
  if (payment.status !== 'approved') {
    return { handled: true, status: `ignored_${payment.status}`, httpStatus: 200, storeId: mandate.store_id }
  }
  if (!store) return { handled: true, status: 'store_not_found', httpStatus: 200 }

  // Una tienda que pasó a Free o Bonificado no debería tener débito activo: si igual hubo un
  // cobro, no se toca el plan, se cancela la suscripción y se avisa para reembolsar a mano.
  if (!isBillablePlan(store.plan)) {
    await notifyPlatformAlert({
      type: 'subscription_invoice_closed',
      store: store as Store,
      details: `Cobro automático ${paymentId} de $${payment.transaction_amount} para una tienda con plan ${store.plan}. Se canceló el débito; reembolsar el pago.`,
      paymentId,
    })
    await cancelMandate(store.id).catch((e) => console.error('autodebit: cancelación falló:', e?.message))
    return { handled: true, status: 'plan_not_billable', httpStatus: 200, storeId: store.id }
  }

  // Idempotencia previa: un cobro ya acreditado no genera otra factura.
  const { data: already } = await admin.from('subscription_payments').select('id').eq('mp_payment_id', paymentId).maybeSingle()
  if (already) return { handled: true, status: 'already_processed', httpStatus: 200, storeId: mandate.store_id }

  const received = Number(payment.transaction_amount)
  if (checkPaymentAmount(Number(mandate.amount), received) === 'under') {
    await notifyPlatformAlert({
      type: 'subscription_amount_mismatch',
      store: store as Store,
      details: `Cobro automático de $${received}; el débito autorizado es de $${mandate.amount}. No se acreditó el plan.`,
      paymentId,
    })
    return { handled: true, status: 'amount_mismatch', httpStatus: 200, storeId: mandate.store_id }
  }

  // Factura del cobro, para que el historial y la RPC funcionen igual que en el pago manual.
  const next = computeNextDue(store, todayArgentina())
  const { data: invoice, error: invErr } = await admin
    .from('subscription_invoices')
    .insert({
      store_id: store.id,
      // Si el equipo cambió el plan a mano, manda el plan actual: nunca se degrada por un cobro viejo.
      target_plan: store.plan,
      amount: mandate.amount,
      period_start: next.periodFrom,
      period_end: next.newDue,
      due_date: store.fecha_proximo_vencimiento ?? todayArgentina(),
      source: 'auto_debit',
      billing_anchor_day: Number(next.periodFrom.slice(8, 10)),
    })
    .select('*')
    .single()
  if (invErr || !invoice) {
    console.error('autodebit: no se pudo crear la factura:', invErr?.message)
    return { handled: true, status: 'invoice_insert_failed', httpStatus: 500, storeId: mandate.store_id }
  }

  const result = await applyPlatformPayment(payment, invoice as SubscriptionInvoice, store as Store)

  if (result.status === 'credited') {
    // El primer cobro aprobado confirma que la suscripción quedó autorizada.
    await admin.from('subscription_mandates').update({ status: 'authorized', updated_at: new Date().toISOString() }).eq('id', mandate.id).eq('status', 'pending')
    // Si el cobro cambió el plan de la tienda, el débito pasa a cobrar el monto nuevo.
    await syncMandateToStorePlan(store.id).catch((e) => console.error('autodebit: sync de monto falló:', e?.message))
  } else {
    // Factura sin acreditar: se cierra para no dejar pendientes huérfanas.
    await admin.from('subscription_invoices').update({ status: 'cancelled' }).eq('id', invoice.id).eq('status', 'pending')
  }
  return result
}

/** Aviso de cobro fallido, una sola vez por vencimiento. */
async function notifyFailedCharge(store: Store | null, mandate: SubscriptionMandate): Promise<void> {
  if (!store) return
  const admin = createSupabaseAdminClient()
  const dueDate = store.fecha_proximo_vencimiento ?? todayArgentina()
  const { error } = await admin.from('subscription_notifications_log').insert({
    store_id: store.id,
    due_date: dueDate,
    notification_type: 'payment_failed',
    sent_to: store.admin_email ?? '',
  })
  if (error) return
  const sent = await sendSubscriptionEmail('payment_failed', store, {
    amount: Number(mandate.amount),
    planName: getPlanConfig(mandate.target_plan).nombre,
    dueDate,
  })
  if (!sent.ok) {
    await admin.from('subscription_notifications_log').delete().eq('store_id', store.id).eq('due_date', dueDate).eq('notification_type', 'payment_failed')
  }
}

// -----------------------------------------------------------------------------
// Webhook subscription_authorized_payment: cada intento de cobro de la suscripción
// -----------------------------------------------------------------------------
export async function handleAuthorizedPayment(authorizedPaymentId: string): Promise<{ status: string; httpStatus: number }> {
  let res: Response
  try {
    res = await mpFetch(`/authorized_payments/${encodeURIComponent(authorizedPaymentId)}`)
  } catch {
    return { status: 'mp_fetch_network_error', httpStatus: 500 }
  }
  if (res.status === 404) return { status: 'authorized_payment_not_found', httpStatus: 200 }
  if (!res.ok) return { status: 'mp_fetch_error', httpStatus: 500 }

  const ap = await res.json()
  const preapprovalId = ap.preapproval_id ? String(ap.preapproval_id) : ''
  const paymentId = ap.payment?.id ? String(ap.payment.id) : ''
  const admin = createSupabaseAdminClient()
  const { data: mandate } = preapprovalId
    ? await admin.from('subscription_mandates').select('*').eq('mp_preapproval_id', preapprovalId).maybeSingle()
    : { data: null }
  if (!mandate) return { status: 'mandate_not_found', httpStatus: 200 }

  // Sin pago asociado todavía (cobro programado o en reintento): nada que acreditar.
  if (!paymentId) return { status: `no_payment_yet_${String(ap.status)}`, httpStatus: 200 }

  // El pago se vuelve a consultar en MP: es la fuente de verdad del estado y del monto.
  let pres: Response
  try {
    pres = await mpFetch(`/v1/payments/${encodeURIComponent(paymentId)}`)
  } catch {
    return { status: 'mp_fetch_network_error', httpStatus: 500 }
  }
  if (!pres.ok) return { status: 'mp_fetch_error', httpStatus: pres.status === 404 ? 200 : 500 }
  const payment = await pres.json()

  const r = await creditAutoDebitPayment(payment, mandate as SubscriptionMandate)
  return { status: r.status, httpStatus: r.httpStatus }
}

/** Reconciliación de cobros: pagos aprobados recientes de cada suscripción activa. */
export async function reconcileMandatePayments(): Promise<number> {
  const admin = createSupabaseAdminClient()
  const { data: mandates } = await admin.from('subscription_mandates').select('*').in('status', ['pending', 'authorized']).limit(200)
  const since = `${addDays(todayArgentina(), -7)}T00:00:00.000-03:00`
  let credited = 0
  for (const m of (mandates ?? []) as SubscriptionMandate[]) {
    try {
      const res = await mpFetch(`/v1/payments/search?external_reference=${encodeURIComponent(`mandate_${m.id}`)}&begin_date=${encodeURIComponent(since)}&sort=date_created&criteria=desc&limit=10`)
      if (!res.ok) continue
      const data = await res.json()
      for (const p of data.results ?? []) {
        if (p.status === 'approved') {
          const r = await creditAutoDebitPayment(p, m)
          if (r.status === 'credited') credited++
        }
      }
    } catch {
      // se reintenta en la próxima corrida
    }
  }
  return credited
}

/**
 * Red de seguridad diaria: mantiene el débito alineado con el plan de la tienda.
 * - Plan Free o Bonificado (o tienda inexistente): se cancela la suscripción en MP, para que
 *   un cambio de plan hecho desde el panel de superadmin nunca deje cobros activos.
 * - Plan pago con monto o plan distinto al de la suscripción: se actualiza el monto en MP.
 */
export async function reconcileMandatesWithStores(): Promise<{ cancelled: number; updated: number }> {
  const admin = createSupabaseAdminClient()
  const { data: mandates } = await admin
    .from('subscription_mandates')
    .select('store_id, status')
    .in('status', ['pending', 'authorized', 'paused'])
    .limit(200)

  let cancelled = 0
  let updated = 0
  for (const m of mandates ?? []) {
    try {
      const { data: store } = await admin.from('stores').select('plan').eq('id', m.store_id).maybeSingle()
      if (!store || !isBillablePlan(store.plan)) {
        if ((await cancelMandate(m.store_id)).cancelled) cancelled++
      } else {
        await syncMandateToStorePlan(m.store_id)
        updated++
      }
    } catch (e: any) {
      console.error(`autodebit: reconciliación con la tienda ${m.store_id} falló:`, e?.message)
    }
  }
  return { cancelled, updated }
}
