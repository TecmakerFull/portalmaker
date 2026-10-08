// =============================================================================
// PORTALMAKER — Panel de Administración: Gestión de "Sobre Nosotros"
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import SobreNosotrosForm from './sobre-nosotros-form'

export default async function SobreNosotrosAdminPage() {
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
  const supabase = await createSupabaseServerClient()

  // Buscar página "sobre-nosotros" en store_pages
  const { data: pageData } = await supabase
    .from('store_pages')
    .select('*')
    .eq('store_id', store.id)
    .eq('slug', 'sobre-nosotros')
    .maybeSingle()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SobreNosotrosForm
        store={store}
        initialPage={pageData}
        tenantQuery={tenantQuery}
      />
    </div>
  )
}
