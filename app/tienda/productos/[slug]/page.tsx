// =============================================================================
// PORTALMAKER — Página de Detalle de Producto (Estilo TiendaDemo)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import type { Metadata } from 'next'
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

// Generación dinámica de metadatos SEO (Meta Title, Description, Tags y OpenGraph)
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const tenant = await getTenantStore()
  if (!tenant) return {}
  const { store } = tenant

  const supabase = await createSupabaseServerClient()
  const { data: product } = await supabase
    .from('products')
    .select('id, nombre, descripcion, imagenes')
    .eq('store_id', store.id)
    .eq('slug', slug)
    .eq('visible', true)
    .maybeSingle()

  if (!product) return {}

  const { data: details } = await supabase
    .from('product_details')
    .select('meta_title, meta_description, tags')
    .eq('product_id', product.id)
    .maybeSingle()

  const title = details?.meta_title || `${product.nombre} | ${store.nombre}`
  const description =
    details?.meta_description ||
    product.descripcion?.slice(0, 160).replace(/[*#_]/g, '') ||
    `Descubrí ${product.nombre} en ${store.nombre}. Calidad de taller y envíos directos.`

  const rawImages = Array.isArray(product.imagenes) ? (product.imagenes as string[]) : []
  const ogImages = rawImages.length > 0 ? [{ url: rawImages[0] }] : []

  return {
    title,
    description,
    keywords: Array.isArray(details?.tags) && details.tags.length > 0 ? details.tags : undefined,
    openGraph: {
      title,
      description,
      images: ogImages,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImages.map((img) => img.url),
    },
  }
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
    .select('*, category:categories(nombre), variants:product_variants(id, nombre, stock, activo)')
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

  // 7. Obtener reseñas visibles del producto
  const { data: reviews } = await supabase
    .from('product_reviews')
    .select('*')
    .eq('product_id', product.id)
    .eq('visible', true)
    .order('created_at', { ascending: false })

  // 8. Construcción de Schema.org JSON-LD (Product Rich Snippets para Google)
  const productImages = Array.isArray(product.imagenes) && product.imagenes.length > 0
    ? (product.imagenes as string[])
    : []

  const activeVariants = variants ?? []
  let displayPrice = product.precio_final || 0
  if (activeVariants.length > 0) {
    const variantPrices = activeVariants
      .map((v) => Number(v.precio_final))
      .filter((p) => !isNaN(p) && p > 0)
    if (variantPrices.length > 0) {
      displayPrice = Math.min(...variantPrices)
    }
  }

  const isAvailable = !product.gestiona_stock || (product.stock ?? 0) > 0 || activeVariants.some((v) => (v.stock ?? 0) > 0)
  const reviewList = reviews ?? []
  const hasReviews = reviewList.length > 0
  const avgRating = hasReviews
    ? Number((reviewList.reduce((acc, r) => acc + (r.calificacion || 5), 0) / reviewList.length).toFixed(1))
    : null

  const productUrl = store.custom_domain
    ? `https://${store.custom_domain}/productos/${product.slug}`
    : `https://${store.slug}.portalmaker.ar/productos/${product.slug}`

  const schemaJsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.nombre,
    description: details?.meta_description || product.descripcion?.slice(0, 300) || product.nombre,
    image: productImages,
    sku: product.sku || undefined,
    url: productUrl,
    brand: {
      '@type': 'Brand',
      name: store.nombre,
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'ARS',
      price: displayPrice,
      availability: isAvailable
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: store.nombre,
      },
    },
  }

  if (hasReviews && avgRating) {
    schemaJsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avgRating,
      reviewCount: reviewList.length,
      bestRating: 5,
      worstRating: 1,
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] transition-colors duration-200 flex flex-col justify-between">
      {/* Schema.org JSON-LD para indexación y snippets de Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJsonLd) }}
      />
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
            initialReviews={reviews ?? []}
            tenantQuery={tenantQuery}
          />
        </main>
      </div>

      {/* Footer 4 Columnas */}
      <StoreFooter store={store} tenantQuery={tenantQuery} />
    </div>
  )
}
