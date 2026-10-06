// =============================================================================
// PORTALMAKER — Panel de Perfil, Cuenta y Suscripción del Maker
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore } from '@/lib/tenant'
import PerfilManager from './perfil-manager'

export default async function AdminPerfilPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PerfilManager store={store} tenantQuery={tenantQuery} />
    </div>
  )
}
