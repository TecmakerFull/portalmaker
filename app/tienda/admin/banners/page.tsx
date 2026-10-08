// =============================================================================
// PORTALMAKER — Panel Admin: Gestión de Banners y Carrusel Promocional
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import BannersManager from './banners-manager'

export default async function AdminBannersPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const supabase = await createSupabaseServerClient()

  // 1. Obtener banners existentes de la tienda
  const { data: banners } = await supabase
    .from('banners')
    .select('*')
    .eq('store_id', store.id)
    .order('orden', { ascending: true })

  // 2. Obtener lista de productos para el selector de enlace CTA
  const { data: products } = await supabase
    .from('products')
    .select('id, nombre, slug, visible')
    .eq('store_id', store.id)
    .order('nombre', { ascending: true })

  // 3. Obtener lista de categorías para el selector de enlace CTA
  const { data: categories } = await supabase
    .from('categories')
    .select('id, nombre, slug')
    .eq('store_id', store.id)
    .order('orden', { ascending: true })

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      <BannersManager
        store={store}
        initialBanners={banners ?? []}
        products={products ?? []}
        categories={categories ?? []}
        tenantQuery={tenantQuery}
      />
    </div>
  )
}
