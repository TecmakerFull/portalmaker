// =============================================================================
// PORTALMAKER — Panel de Perfil, Cuenta y Suscripción del Maker
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore } from '@/lib/tenant'
import PerfilManager from './perfil-manager'
import { canManageBilling, describeCycle } from '@/lib/subscriptions/summary'
import { isBillablePlan } from '@/lib/subscriptions/billing'

export default async function AdminPerfilPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  // Estado de cuenta y botón de pago solo para dueño/superadmin y planes que se cobran.
  let billing: { payablePlan: 'starter' | 'maker_pro' | 'enterprise'; statusLabel: string; needsPayment: boolean } | null = null
  if (isBillablePlan(store.plan) && (await canManageBilling(store))) {
    const cycle = describeCycle(store)
    if (cycle.phase !== 'exempt') {
      billing = { payablePlan: store.plan, statusLabel: cycle.statusLabel, needsPayment: cycle.tone === 'warn' || cycle.tone === 'danger' }
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 sm:space-y-6">
      <PerfilManager store={store} tenantQuery={tenantQuery} billing={billing} />
    </div>
  )
}
