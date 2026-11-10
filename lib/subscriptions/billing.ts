// =============================================================================
// PORTALMAKER — Lógica pura del cobro de planes (sin I/O)
// Espeja las reglas de la RPC process_subscription_payment y del cron, para poder
// testearlas sin base de datos. Cualquier cambio acá debe replicarse en el SQL
// (supabase/migrations/20261110_subscription_billing_system.sql).
// =============================================================================

import { PLANS_CONFIG, getPlanConfig, type PlanKey } from '@/lib/plans'
import type { BillablePlan } from '@/types/database'

export const BILLABLE_PLANS: readonly BillablePlan[] = ['starter', 'maker_pro', 'enterprise']

export function isBillablePlan(value: unknown): value is BillablePlan {
  return typeof value === 'string' && (BILLABLE_PLANS as readonly string[]).includes(value)
}

const TZ_AR = 'America/Argentina/Buenos_Aires'

/** Fecha (YYYY-MM-DD) en horario argentino: el cron corre en UTC pero los vencimientos son locales. */
export function todayArgentina(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ_AR, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

function parseDate(d: string): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day))
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date)
  d.setUTCDate(d.getUTCDate() + days)
  return formatDate(d)
}

/** Diferencia en días enteros (b - a) entre dos fechas YYYY-MM-DD. */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000)
}

/**
 * Suma un mes respetando el día ancla y el último día del mes destino.
 * Sin ancla, 31/01 -> 28/02 -> 28/03 (deriva); con ancla 31 vuelve al 31/03.
 */
export function addMonthAnchored(base: string, anchorDay?: number | null): string {
  const b = parseDate(base)
  const anchor = anchorDay ?? b.getUTCDate()
  const year = b.getUTCFullYear()
  const month = b.getUTCMonth() + 1
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return formatDate(new Date(Date.UTC(year, month, Math.min(anchor, lastDay))))
}

export interface StoreBillingSnapshot {
  plan?: string | null
  precio_mensual?: number | null
  fecha_proximo_vencimiento?: string | null
  estado_pago?: string | null
  suscripcion_activa?: boolean | null
  dias_gracia?: number | null
}

/**
 * Monto a cobrar, siempre calculado en el servidor.
 * - Mismo plan con precio acordado > 0: se respeta el acuerdo.
 * - Plan distinto (upgrade): precio de lista del plan elegido.
 */
export function resolveInvoiceAmount(
  store: Pick<StoreBillingSnapshot, 'plan' | 'precio_mensual'>,
  targetPlan: BillablePlan,
  listPriceArs: number
): number {
  const agreed = Number(store.precio_mensual ?? 0)
  const amount = store.plan === targetPlan && agreed > 0 ? agreed : listPriceArs
  return Math.round(amount * 100) / 100
}

/** Precio de lista: tabla plans (editable por superadmin) y, si falta, lib/plans.ts. */
export function resolveListPrice(plansTablePrice: number | null | undefined, targetPlan: BillablePlan): number {
  if (typeof plansTablePrice === 'number' && plansTablePrice > 0) return plansTablePrice
  return PLANS_CONFIG[targetPlan].precioMensualSugerido
}

/** Un downgrade (o plan no cobrable) no se puede pagar desde el panel. */
export function canChooseTargetPlan(currentPlan: string | null | undefined, targetPlan: string): targetPlan is BillablePlan {
  if (!isBillablePlan(targetPlan)) return false
  if (currentPlan === 'bonificado') return false
  const currentLevel = getPlanConfig(currentPlan).nivel
  return PLANS_CONFIG[targetPlan].nivel >= currentLevel
}

export type PaymentAmountCheck = 'exact' | 'over' | 'under'

export function checkPaymentAmount(expected: number, received: number): PaymentAmountCheck {
  const e = Math.round(expected * 100)
  const r = Math.round(received * 100)
  if (r === e) return 'exact'
  return r > e ? 'over' : 'under'
}

/**
 * Nuevo vencimiento tras un pago. Si paga al día o en gracia, encadena sobre el
 * vencimiento anterior (no pierde días por pagar antes); si estaba pausada o venía
 * de Free, corre desde hoy.
 */
export function computeNextDue(
  store: Pick<StoreBillingSnapshot, 'plan' | 'fecha_proximo_vencimiento' | 'estado_pago' | 'suscripcion_activa' | 'dias_gracia'>,
  today: string,
  anchorDay?: number | null
): { periodFrom: string; newDue: string; extended: boolean } {
  // Se encadena solo si el pago llega dentro de la gracia (inclusive). Se valida por fecha y
  // no solo por estado: si el cron no corrió, una tienda vencida seguiría figurando activa.
  const withinGrace =
    !!store.fecha_proximo_vencimiento &&
    today <= addDays(store.fecha_proximo_vencimiento, store.dias_gracia ?? 3)
  const extended =
    withinGrace &&
    (store.plan ?? 'free') !== 'free' &&
    (store.estado_pago ?? 'al_dia') !== 'vencido' &&
    store.suscripcion_activa !== false
  const periodFrom = extended ? (store.fecha_proximo_vencimiento as string) : today
  return { periodFrom, newDue: addMonthAnchored(periodFrom, anchorDay ?? Number(periodFrom.slice(8, 10))), extended }
}

export type CyclePhase =
  | 'exempt' // bonificado / sin vencimiento: fuera del ciclo
  | 'ok'
  | 'reminder_7d'
  | 'reminder_1d'
  | 'in_grace'
  | 'paused'

/**
 * Fase del ciclo de cobro para el cron. Los avisos son por día exacto; el estado
 * (gracia/pausa) se deriva siempre de las fechas, así el cron es idempotente.
 */
export function classifyCycle(
  store: Pick<StoreBillingSnapshot, 'plan' | 'fecha_proximo_vencimiento' | 'estado_pago' | 'dias_gracia'>,
  today: string
): { phase: CyclePhase; daysToDue: number | null; graceEnds: string | null } {
  if (!store.fecha_proximo_vencimiento || store.plan === 'bonificado' || store.estado_pago === 'bonificado') {
    return { phase: 'exempt', daysToDue: null, graceEnds: null }
  }
  const due = store.fecha_proximo_vencimiento
  const grace = store.dias_gracia ?? 3
  const graceEnds = addDays(due, grace)
  const daysToDue = diffDays(today, due)

  if (daysToDue === 7) return { phase: 'reminder_7d', daysToDue, graceEnds }
  if (daysToDue === 1) return { phase: 'reminder_1d', daysToDue, graceEnds }
  if (daysToDue >= 0) return { phase: 'ok', daysToDue, graceEnds }
  if (today <= graceEnds) return { phase: 'in_grace', daysToDue, graceEnds }
  return { phase: 'paused', daysToDue, graceEnds }
}

/**
 * Valores por defecto del plan que la RPC aplica cuando el plan cambia. Mismo
 * criterio que "Restablecer al estándar del plan" del panel de superadmin.
 */
export function buildPlanStorePatch(planKey: PlanKey) {
  const p = PLANS_CONFIG[planKey]
  return {
    limite_productos: p.limiteProductos,
    comision_portalmaker: p.comisionPortalmakerPct,
    modo_operacion: p.modoOperacionDefault,
    checkout_activo: p.checkoutActivo,
    features_override: {
      checkout_online: p.checkoutActivo,
      mercado_pago: p.mercadoPagoHabilitado,
      transferencia_bancaria: p.transferenciaBancaria,
      envios_zonas_fijas: p.enviosZonasFijas,
      envios_couriers: p.enviosCouriersEnVivo,
      trazabilidad_stock: p.trazabilidadStock,
      crm_clientes: p.crmClientes,
      resenas: p.resenasProductos,
      colaboradores: p.maxColaboradoresExtra > 0,
      dominio_propio: p.dominioPropio,
      banners: p.bannersMaxSlides > 0,
      analytics: p.analyticsTracking,
      max_colaboradores: p.maxColaboradoresExtra,
      banners_max_slides: p.bannersMaxSlides,
    },
  }
}
