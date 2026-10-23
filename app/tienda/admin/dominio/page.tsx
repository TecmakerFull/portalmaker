// =============================================================================
// PORTALMAKER — Panel de Administración de Dominio Propio
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore } from '@/lib/tenant'
import DominioManager from './dominio-manager'
import LockedFeatureCard from '../components/locked-feature-card'
import { isFeatureAllowed } from '@/lib/plans'

export default async function AdminDominioPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  // Verificar si la tienda tiene habilitado dominio propio según su plan
  if (!isFeatureAllowed(store, 'dominio_propio')) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <LockedFeatureCard
          featureKey="dominio_propio"
          storePlan={store.plan}
          tenantQuery={tenantQuery}
        />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <DominioManager store={store} tenantQuery={tenantQuery} />
    </div>
  )
}
