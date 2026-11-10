// =============================================================================
// PORTALMAKER — Resumen de facturación de una tienda para el panel del dueño
// Solo servidor. Solo lectura: no modifica nada.
// =============================================================================

import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'
import { getPlanConfig } from '@/lib/plans'
import {
  classifyCycle,
  isBillablePlan,
  resolveInvoiceAmount,
  resolveListPrice,
  todayArgentina,
  type CyclePhase,
} from '@/lib/subscriptions/billing'
import type { Store, SubscriptionMandate, SubscriptionPayment } from '@/types/database'

export interface BillingSummary {
  planKey: string
  planName: string
  exempt: boolean
  phase: CyclePhase
  /** Texto corto del estado, para mostrar tal cual. */
  statusLabel: string
  tone: 'ok' | 'warn' | 'danger' | 'neutral'
  dueDate: string | null
  daysToDue: number | null
  graceDays: number
  graceEnds: string | null
  /** Monto de la renovación del plan actual; null si el plan no se cobra. */
  renewalAmount: number | null
  payments: Pick<
    SubscriptionPayment,
    'id' | 'fecha_pago' | 'periodo_desde' | 'periodo_hasta' | 'plan_pagado' | 'metodo_pago' | 'mp_payment_id' | 'monto' | 'estado' | 'notas'
  >[]
  mandate: Pick<SubscriptionMandate, 'status' | 'amount' | 'target_plan'> | null
}

/** Solo el dueño o el superadmin pueden ver montos, historial y pagar. */
export async function canManageBilling(store: Pick<Store, 'id'>): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return false
  const access = await verifyStoreAccess(user.email, store.id, { allowCollaborators: false })
  return access.authorized
}

export function describeCycle(
  store: Pick<Store, 'plan' | 'estado_pago' | 'dias_gracia' | 'fecha_proximo_vencimiento' | 'suscripcion_activa'>,
  today: string = todayArgentina()
) {
  const cycle = classifyCycle(store, today)
  const days = cycle.daysToDue
  let statusLabel = 'Al día'
  let tone: BillingSummary['tone'] = 'ok'

  if (cycle.phase === 'exempt') {
    statusLabel = store.plan === 'bonificado' ? 'Cuenta bonificada' : 'Sin vencimiento'
    tone = 'neutral'
  } else if (cycle.phase === 'paused') {
    statusLabel = 'Vencido: tienda pausada'
    tone = 'danger'
  } else if (cycle.phase === 'in_grace') {
    statusLabel = 'En período de gracia'
    tone = 'warn'
  } else if (days !== null && days <= 7) {
    statusLabel = days === 0 ? 'Vence hoy' : `Vence en ${days} ${days === 1 ? 'día' : 'días'}`
    tone = 'warn'
  }
  // Una tienda pausada manualmente por el equipo también debe verse como tal.
  if (store.suscripcion_activa === false && cycle.phase !== 'paused') {
    statusLabel = 'Tienda pausada'
    tone = 'danger'
  }
  return { ...cycle, statusLabel, tone }
}

export async function getBillingSummary(store: Store): Promise<BillingSummary> {
  const admin = createSupabaseAdminClient()
  const cycle = describeCycle(store)
  const planKey = store.plan ?? 'free'

  const [{ data: payments }, { data: mandate }, { data: planRow }] = await Promise.all([
    admin
      .from('subscription_payments')
      .select('id, fecha_pago, periodo_desde, periodo_hasta, plan_pagado, metodo_pago, mp_payment_id, monto, estado, notas')
      .eq('store_id', store.id)
      .order('fecha_pago', { ascending: false })
      .limit(12),
    admin.from('subscription_mandates').select('status, amount, target_plan').eq('store_id', store.id).maybeSingle(),
    isBillablePlan(planKey) ? admin.from('plans').select('price_ars').eq('id', planKey).maybeSingle() : Promise.resolve({ data: null }),
  ])

  const renewalAmount = isBillablePlan(planKey)
    ? resolveInvoiceAmount(store, planKey, resolveListPrice(planRow ? Number(planRow.price_ars) : null, planKey))
    : null

  return {
    planKey,
    planName: getPlanConfig(store.plan).nombre,
    exempt: cycle.phase === 'exempt',
    phase: cycle.phase,
    statusLabel: cycle.statusLabel,
    tone: cycle.tone,
    dueDate: store.fecha_proximo_vencimiento ?? null,
    daysToDue: cycle.daysToDue,
    graceDays: store.dias_gracia ?? 3,
    graceEnds: cycle.graceEnds,
    renewalAmount,
    payments: (payments ?? []) as BillingSummary['payments'],
    mandate: (mandate as BillingSummary['mandate']) ?? null,
  }
}
