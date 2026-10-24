// =============================================================================
// PORTALMAKER — Panel de Branding y Personalización de Tienda
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getStoreSections } from '@/lib/store-sections'
import { Palette } from 'lucide-react'
import { AdminPageHeader } from '../components/admin-page-header'
import BrandingForm from './branding-form'

export default async function AdminBrandingPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const supabase = await createSupabaseServerClient()
  const resolvedSections = await getStoreSections(
    supabase,
    store.id,
    store,
    false
  )

  return (
    <div className="w-full space-y-6">
      <AdminPageHeader
        title="Personalización & Marca"
        description="Configura los colores, tipografía y datos de contacto que verán tus visitantes en vivo."
        icon={Palette}
      />

      <BrandingForm
        store={store}
        tenantQuery={tenantQuery}
        initialSections={resolvedSections.sectionsList}
      />
    </div>
  )
}
