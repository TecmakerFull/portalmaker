// =============================================================================
// PORTALMAKER — Panel de Administración: Contacto, Ubicación y Redes
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import ContactoForm from './contacto-form'
import OrigenDespachoForm from './origen-despacho-form'

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
    <div className="w-full space-y-6">
      <ContactoForm store={store} tenantQuery={tenantQuery} />
      {/* Origen de despacho: imprescindible para cotizar envíos y carriers */}
      <OrigenDespachoForm store={store} />
    </div>
  )
}
