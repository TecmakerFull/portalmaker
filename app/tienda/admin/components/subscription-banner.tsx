// =============================================================================
// PORTALMAKER — Barra de alerta de suscripción (panel de tienda)
// Se muestra a cualquier usuario del panel cuando la suscripción está por vencer,
// en período de gracia o la tienda está pausada. No incluye montos: el detalle y
// el pago están en /admin/suscripcion, solo para dueño y superadmin.
// =============================================================================

import Link from 'next/link'
import { CircleAlert, ShieldAlert } from 'lucide-react'
import { describeCycle } from '@/lib/subscriptions/summary'
import type { Store } from '@/types/database'

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function SubscriptionBanner({ store, tenantQuery }: { store: Store; tenantQuery: string }) {
  const cycle = describeCycle(store)
  if (cycle.tone !== 'warn' && cycle.tone !== 'danger') return null

  const danger = cycle.tone === 'danger'
  const Icon = danger ? ShieldAlert : CircleAlert
  const message = danger
    ? 'Tu tienda está pausada por falta de pago y no recibe pedidos ni turnos. Regularizá la suscripción para reactivarla.'
    : cycle.phase === 'in_grace'
      ? `Tu suscripción venció. Tenés tiempo hasta el ${fmtDate(cycle.graceEnds)} inclusive: si no se registra el pago, la tienda se pausa al día siguiente.`
      : `Tu suscripción vence el ${fmtDate(store.fecha_proximo_vencimiento ?? null)}.`

  return (
    <div
      role={danger ? 'alert' : 'status'}
      className={`w-full px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs border-b ${
        danger
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
          : 'bg-amber-400/15 border-amber-400/40 text-[#854D0E] dark:text-[#FACC15]'
      }`}
    >
      <p className="flex items-start gap-2 flex-1 font-medium">
        <Icon className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{message}</span>
      </p>
      <Link
        href={`/tienda/admin/suscripcion${tenantQuery}`}
        className="min-h-[44px] sm:min-h-[36px] px-4 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black/15 dark:hover:bg-white/15 font-semibold flex items-center justify-center shrink-0"
      >
        Ver mi suscripción
      </Link>
    </div>
  )
}
