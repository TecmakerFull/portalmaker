// =============================================================================
// PORTALMAKER — Panel de Administración: Métodos y Opciones de Envío (Fase 3)
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import EnviosForm from './envios-form'

export default async function EnviosAdminPage() {
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
      <EnviosForm store={store} tenantQuery={tenantQuery} />
    </div>
  )
}
