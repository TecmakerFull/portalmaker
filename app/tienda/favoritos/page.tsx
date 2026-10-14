// =============================================================================
// PORTALMAKER — Página de Favoritos / Wishlist de la Tienda
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import StorefrontHeaderFlow from '../sections/storefront-header-flow'
import StoreFooter from '../sections/store-footer'
import FavoritosClient from './favoritos-client'
import { getStoreSections } from '@/lib/store-sections'

export default async function TiendaFavoritosPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const supabase = await createSupabaseServerClient()

  // Obtener productos visibles
  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(nombre)')
    .eq('store_id', store.id)
    .eq('visible', true)

  // Obtener secciones modulares
  const resolvedSections = await getStoreSections(
    supabase,
    store.id,
    store,
    true
  )

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] transition-colors duration-200 flex flex-col justify-between">
      <div>
        <StorefrontHeaderFlow
          store={store}
          resolvedSections={resolvedSections}
          tenantQuery={tenantQuery}
        />

        <main className="wrap py-10 sm:py-16">
          <FavoritosClient
            products={products ?? []}
            store={store}
            tenantQuery={tenantQuery}
          />
        </main>
      </div>

      <StoreFooter store={store} tenantQuery={tenantQuery} />
    </div>
  )
}
