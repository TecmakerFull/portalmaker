// =============================================================================
// PORTALMAKER — Panel de Administración: Cobros y Datos de Transferencia
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import PagosForm from './pagos-form'

export default async function PagosAdminPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const isAdmin = await isStoreAdmin(store)

  if (!isAdmin) {
    notFound()
  }

  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  return (
    <div className="w-full space-y-6">
      <PagosForm store={store} tenantQuery={tenantQuery} />
    </div>
  )
}
