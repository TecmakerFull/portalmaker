// =============================================================================
// PORTALMAKER — Estado de cuenta y facturación de la suscripción (panel del dueño)
// Componente de servidor: recibe el resumen ya calculado. Solo se renderiza para
// dueño o superadmin (ver canManageBilling): muestra montos e historial de pagos.
// =============================================================================

import { CalendarClock, ChevronDown, CircleAlert, CircleCheck, Receipt, ShieldAlert } from 'lucide-react'
import type { BillingSummary } from '@/lib/subscriptions/summary'
import { isBillablePlan } from '@/lib/subscriptions/billing'
import { getPlanConfig } from '@/lib/plans'
import PayPlanButton from './pay-plan-button'

function fmtDate(iso: string | null): string {
  if (!iso) return '-'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

const METODOS: Record<string, string> = {
  mercadopago: 'Mercado Pago',
  debito_automatico: 'Débito automático',
  transferencia: 'Transferencia bancaria',
  efectivo: 'Efectivo',
  otro: 'Otro medio',
}

function metodoLabel(m: string | null | undefined): string {
  if (!m) return '-'
  return METODOS[m] ?? m
}

type PaymentRow = BillingSummary['payments'][number]

/** Medio de pago, plan y, en pagos manuales, el detalle que cargó el equipo (ej. banco y comprobante). */
function PaymentMeta({ p }: { p: PaymentRow }) {
  const plan = p.plan_pagado ? getPlanConfig(p.plan_pagado).nombre : null
  // En pagos de Mercado Pago la nota es un texto interno automático: no se muestra.
  const detalle = !p.mp_payment_id && p.notas ? p.notas : null
  return (
    <>
      <span>{metodoLabel(p.metodo_pago)}</span>
      {plan && <span className="block text-[11px] opacity-70">Plan {plan}</span>}
      {p.mp_payment_id && <span className="block text-[10px] opacity-60">Op. {p.mp_payment_id}</span>}
      {detalle && <span className="block text-[11px] opacity-70">{detalle}</span>}
    </>
  )
}

const toneStyles: Record<BillingSummary['tone'], string> = {
  ok: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
  warn: 'bg-amber-400/15 text-[#A16207] dark:text-[#FACC15] border-amber-400/40',
  danger: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
  neutral: 'bg-black/5 dark:bg-white/10 border-[var(--color-borde)]',
}

export default function SubscriptionBillingCard({
  storeId,
  summary,
  paymentResult,
}: {
  storeId: string
  summary: BillingSummary
  paymentResult?: string | null
}) {
  const billablePlan = isBillablePlan(summary.planKey) ? summary.planKey : null
  const billable = billablePlan !== null
  const needsPayment = billable && !summary.exempt && summary.tone !== 'ok'
  const StatusIcon = summary.tone === 'ok' ? CircleCheck : summary.tone === 'danger' ? ShieldAlert : CircleAlert

  return (
    <section
      aria-labelledby="estado-cuenta"
      className="rounded-3xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5 sm:p-6 space-y-5 shadow-xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h2 id="estado-cuenta" className="text-base font-semibold flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
            <span>Estado de cuenta</span>
          </h2>
          <p className="text-xs opacity-70">Plan {summary.planName}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full text-xs font-semibold border ${toneStyles[summary.tone]}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          <span>{summary.statusLabel}</span>
        </span>
      </div>

      {paymentResult === 'success' && (
        <p role="status" className="text-xs rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
          Volviste de Mercado Pago. Estamos confirmando el pago: en unos instantes vas a ver tu plan actualizado. Si no cambia en unos minutos, recargá la página.
        </p>
      )}
      {paymentResult === 'pending' && (
        <p role="status" className="text-xs rounded-xl border border-amber-400/40 bg-amber-400/10 p-3">
          Tu pago está pendiente de acreditación en Mercado Pago. Cuando se acredite, tu suscripción se actualiza automáticamente.
        </p>
      )}
      {paymentResult === 'failure' && (
        <p role="alert" className="text-xs rounded-xl border border-rose-500/25 bg-rose-500/10 p-3">
          El pago no se completó. No se te cobró nada: podés intentarlo de nuevo.
        </p>
      )}

      {!summary.exempt && (
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-[var(--color-borde)] p-3">
            <dt className="opacity-60 flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Próximo vencimiento</span>
            </dt>
            <dd className="mt-1 font-semibold text-sm">{fmtDate(summary.dueDate)}</dd>
          </div>
          <div className="rounded-xl border border-[var(--color-borde)] p-3">
            <dt className="opacity-60">Valor mensual</dt>
            <dd className="mt-1 font-semibold text-sm">{summary.renewalAmount !== null ? fmtMoney(summary.renewalAmount) : '-'}</dd>
          </div>
          <div className="rounded-xl border border-[var(--color-borde)] p-3">
            <dt className="opacity-60">Días de gracia</dt>
            <dd className="mt-1 font-semibold text-sm">
              {summary.graceDays} {summary.graceDays === 1 ? 'día' : 'días'}
              {summary.graceEnds && summary.phase === 'in_grace' && (
                <span className="block text-[11px] font-normal opacity-70">Tenés hasta el {fmtDate(summary.graceEnds)} inclusive</span>
              )}
            </dd>
          </div>
        </dl>
      )}

      {needsPayment && summary.renewalAmount !== null && billablePlan && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-400/[0.08] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs space-y-0.5">
            <p className="font-semibold text-sm">Saldo a pagar: {fmtMoney(summary.renewalAmount)}</p>
            <p className="opacity-70">Renovación del plan {summary.planName} por un mes.</p>
          </div>
          <div className="sm:w-64">
            <PayPlanButton storeId={storeId} targetPlan={billablePlan} label="Pagar ahora con Mercado Pago" />
          </div>
        </div>
      )}

      {billablePlan && !needsPayment && !summary.exempt && (
        <div className="sm:max-w-xs">
          <PayPlanButton storeId={storeId} targetPlan={billablePlan} label="Adelantar el próximo mes" variant="secondary" />
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Último pago</h3>
        {summary.payments.length === 0 ? (
          <p className="text-xs opacity-60">Todavía no hay pagos registrados.</p>
        ) : (
          <>
            <div className="rounded-xl border border-[var(--color-borde)] p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">{fmtMoney(Number(summary.payments[0].monto))}</p>
                <p className="opacity-70">
                  {fmtDate(summary.payments[0].fecha_pago)} - período {fmtDate(summary.payments[0].periodo_desde)} a {fmtDate(summary.payments[0].periodo_hasta)}
                </p>
              </div>
              <div className="sm:text-right">
                <PaymentMeta p={summary.payments[0]} />
                <span className="block text-[11px] opacity-70">
                  {summary.payments[0].estado === 'reembolsado' ? 'Reembolsado' : 'Acreditado'}
                </span>
              </div>
            </div>

            {summary.payments.length > 1 && (
              <details className="group rounded-xl border border-[var(--color-borde)]">
                <summary className="min-h-[44px] px-3 sm:px-4 flex items-center justify-between gap-2 cursor-pointer text-xs font-semibold list-none [&::-webkit-details-marker]:hidden">
                  <span>Ver historial completo ({summary.payments.length})</span>
                  <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="overflow-x-auto border-t border-[var(--color-borde)]">
                  <table className="w-full text-left text-xs min-w-[560px]">
                    <thead className="bg-black/[0.03] dark:bg-white/[0.03]">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Fecha</th>
                        <th className="py-2.5 px-3 font-semibold">Período cubierto</th>
                        <th className="py-2.5 px-3 font-semibold">Medio y detalle</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Monto</th>
                        <th className="py-2.5 px-3 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-borde)]">
                      {summary.payments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 px-3">{fmtDate(p.fecha_pago)}</td>
                          <td className="py-2.5 px-3">
                            {fmtDate(p.periodo_desde)} - {fmtDate(p.periodo_hasta)}
                          </td>
                          <td className="py-2.5 px-3">
                            <PaymentMeta p={p} />
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold">{fmtMoney(Number(p.monto))}</td>
                          <td className="py-2.5 px-3">{p.estado === 'reembolsado' ? 'Reembolsado' : 'Acreditado'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </section>
  )
}
