// =============================================================================
// PORTALMAKER — Panel de Administración: Contacto, Ubicación y Redes
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import ContactoForm from './contacto-form'

export default async function ContactoAdminPage() {
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
    <div className="max-w-4xl mx-auto space-y-6">
      <ContactoForm store={store} tenantQuery={tenantQuery} />
    </div>
  )
}
