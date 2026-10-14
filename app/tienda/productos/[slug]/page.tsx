// =============================================================================
// PORTALMAKER — Página de Detalle de Producto (Estilo TiendaDemo)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import StorefrontHeaderFlow from '../../sections/storefront-header-flow'
import ProductDetailView from './product-detail-view'
import StoreFooter from '../../sections/store-footer'
import { getStoreSections } from '@/lib/store-sections'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ProductoDetallePage({ params }: PageProps) {
  const { slug } = await params
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const supabase = await createSupabaseServerClient()

  // 1. Buscar producto
  const { data: product } = await supabase
    .from('products')
    .select('*, category:categories(nombre)')
    .eq('store_id', store.id)
    .eq('slug', slug)
    .eq('visible', true)
    .single()

  if (!product) {
    notFound()
  }

  // 2. Buscar variantes activas del producto
  const { data: variants } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', product.id)
    .eq('activo', true)
    .order('orden', { ascending: true })

  // 3. Buscar detalles adicionales (especificaciones, medidas, etc.)
  const { data: details } = await supabase
    .from('product_details')
    .select('*')
    .eq('product_id', product.id)
    .maybeSingle()

  // 4. Buscar otros productos recomendados de la tienda ("También te puede gustar")
  const { data: relatedProducts } = await supabase
    .from('products')
    .select('*, category:categories(nombre)')
    .eq('store_id', store.id)
    .eq('visible', true)
    .neq('id', product.id)
    .limit(4)

  // 5. Verificar si la página "Sobre Nosotros" está activa
  const { data: sobreNosotrosPage } = await supabase
    .from('store_pages')
    .select('id, visible')
    .eq('store_id', store.id)
    .eq('slug', 'sobre-nosotros')
    .eq('visible', true)
    .maybeSingle()

  const hasSobreNosotros = !!sobreNosotrosPage

  // 6. Obtener secciones modulares de Storefront
  const resolvedSections = await getStoreSections(
    supabase,
    store.id,
    store,
    hasSobreNosotros
  )

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] transition-colors duration-200 flex flex-col justify-between">
      <div>
        {/* Cabecera y Navegación Modular (Top Bar -> Header -> Navbar) */}
        <StorefrontHeaderFlow
          store={store}
          resolvedSections={resolvedSections}
          tenantQuery={tenantQuery}
        />

        {/* Detalle del Producto */}
        <main className="wrap py-8 sm:py-12">
          <ProductDetailView
            product={product}
            store={store}
            variants={variants ?? []}
            details={details}
            relatedProducts={relatedProducts ?? []}
            tenantQuery={tenantQuery}
          />
        </main>
      </div>

      {/* Footer 4 Columnas */}
      <StoreFooter store={store} tenantQuery={tenantQuery} />
    </div>
  )
}
