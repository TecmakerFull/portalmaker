// =============================================================================
// PORTALMAKER — Panel de Branding y Personalización de Tienda
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore } from '@/lib/tenant'
import BrandingForm from './branding-form'

export default async function AdminBrandingPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-texto)]">
          Personalización & Marca
        </h1>
        <p className="text-sm opacity-70 mt-1">
          Configura los colores, tipografía y datos de contacto que verán tus visitantes.
        </p>
      </div>

      <BrandingForm store={store} tenantQuery={tenantQuery} />
    </div>
  )
}
