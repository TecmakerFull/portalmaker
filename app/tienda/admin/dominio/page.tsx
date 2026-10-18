// =============================================================================
// PORTALMAKER — Panel de Administración de Dominio Propio
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore } from '@/lib/tenant'
import DominioManager from './dominio-manager'

export default async function AdminDominioPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  return (
    <div className="w-full space-y-6">
      <DominioManager store={store} tenantQuery={tenantQuery} />
    </div>
  )
}
