import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import StorefrontHeaderFlow from '../../sections/storefront-header-flow'
import ProductDetailView from './product-detail-view'
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

  // Buscar producto
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

  // Buscar variantes activas del producto
  const { data: variants } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', product.id)
    .eq('activo', true)
    .order('orden', { ascending: true })

  // Buscar detalles adicionales (dimensiones, etc.)
  const { data: details } = await supabase
    .from('product_details')
    .select('*')
    .eq('product_id', product.id)
    .maybeSingle()

  // Verificar si la página "Sobre Nosotros" está activa
  const { data: sobreNosotrosPage } = await supabase
    .from('store_pages')
    .select('id, visible')
    .eq('store_id', store.id)
    .eq('slug', 'sobre-nosotros')
    .eq('visible', true)
    .maybeSingle()

  const hasSobreNosotros = !!sobreNosotrosPage

  // Obtener secciones modulares de Storefront (Top Bar, Header, Navbar)
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
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <ProductDetailView
            product={product}
            store={store}
            variants={variants ?? []}
            details={details}
          />
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-20 border-t border-black/10 dark:border-white/10 py-8 text-center text-xs opacity-75 space-y-2">
        <div className="flex items-center justify-center gap-4 text-xs font-semibold">
          <Link href={`/tienda${tenantQuery}`} className="hover:underline">
            Catálogo
          </Link>
          {hasSobreNosotros && (
            <>
              <span>•</span>
              <Link href={`/tienda/sobre-nosotros${tenantQuery}`} className="hover:underline">
                Sobre Nosotros
              </Link>
            </>
          )}
          <span>•</span>
          <Link href={`/tienda/contacto${tenantQuery}`} className="hover:underline">
            Contacto & Ubicación
          </Link>
        </div>
        <p className="opacity-60">© {new Date().getFullYear()} {store.nombre} — Desarrollado sobre Portalmaker</p>
      </footer>
    </div>
  )
}
