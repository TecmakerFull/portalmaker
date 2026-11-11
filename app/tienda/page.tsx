// =============================================================================
// PORTALMAKER — Tienda Pública (Página de Inicio Estilo TiendaDemo / Nöra)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import StorePausedScreen from './store-paused-screen'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import StorefrontHeaderFlow from './sections/storefront-header-flow'
import HeroBanners from './sections/hero-banners'
import TrustFeatures from './sections/trust-features'
import CatalogView from './catalog-view'
import StorySection from './sections/story-section'
import NewsletterSection from './sections/newsletter-section'
import StoreFooter from './sections/store-footer'
import { getStoreSections } from '@/lib/store-sections'
import { getStoreExtraSections } from '@/lib/store-extra-sections'
import ServicesCatalog from './sections/services-catalog'
import type { Service } from '@/types/database'

interface TiendaPageProps {
  searchParams?: Promise<{
    q?: string
    categoria?: string
    oferta?: string
  }>
}

export default async function TiendaPage({ searchParams }: TiendaPageProps) {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const resolvedParams = searchParams ? await searchParams : {}
  const initialQuery = resolvedParams.q || ''
  const initialCategory = resolvedParams.categoria || 'Todos'
  const initialOffer = resolvedParams.oferta === 'true'

  const supabase = await createSupabaseServerClient()

  // 1. Obtener categorías de la tienda
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', store.id)
    .order('orden', { ascending: true })

  // 2. Obtener productos activos (visibles) con sus variantes
  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(nombre), variants:product_variants(id, nombre, stock, activo)')
    .eq('store_id', store.id)
    .eq('visible', true)
    .order('destacado', { ascending: false })
    .order('created_at', { ascending: false })

  // 3. Verificar si la página "Sobre Nosotros" está activa
  const { data: sobreNosotrosPage } = await supabase
    .from('store_pages')
    .select('id, visible')
    .eq('store_id', store.id)
    .eq('slug', 'sobre-nosotros')
    .eq('visible', true)
    .maybeSingle()

  const hasSobreNosotros = !!sobreNosotrosPage

  // 4. Obtener secciones modulares de Storefront (Top Bar, Header, Navbar, Hero)
  const resolvedSections = await getStoreSections(
    supabase,
    store.id,
    store,
    hasSobreNosotros
  )

  // 5. Mensajes de confianza y footer configurables por la tienda
  const extraSections = await getStoreExtraSections(store)

  // 6. Servicios con turno (tiendas de servicios o "ambos")
  const tipoNegocio = store.tipo_negocio ?? 'productos'
  const vendeProductos = tipoNegocio !== 'servicios'
  const daTurnos = tipoNegocio !== 'productos'
  let serviceList: Service[] = []
  if (daTurnos) {
    const { data: services } = await supabase
      .from('services')
      .select('*')
      .eq('store_id', store.id)
      .eq('visible', true)
      .order('destacado', { ascending: false })
      .order('orden', { ascending: true })
    serviceList = (services as Service[]) ?? []
  }

  const productList = products ?? []
  const categoryList = categories ?? []

  // Tienda pausada (falta de pago o apagada por el equipo): pantalla pública neutra.
  if (!store.suscripcion_activa) {
    return <StorePausedScreen store={store} />
  }

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] transition-colors duration-200 flex flex-col justify-between">
      <div>
        {/* 1. Cabecera y Navegación Modular (Top Bar -> Header -> Navbar) */}
        <StorefrontHeaderFlow
          store={store}
          resolvedSections={resolvedSections}
          tenantQuery={tenantQuery}
        />

        {/* 2. Hero / Banners Promocionales (Estilo TiendaDemo) */}
        <HeroBanners
          section={resolvedSections.hero}
          storeName={store.nombre}
          storeSlogan={store.slogan}
          tenantQuery={tenantQuery}
        />

        {/* 3. Mensajes de confianza (configurables en Diseño; se ocultan si la tienda los desactiva) */}
        {extraSections.trust_bar.enabled && <TrustFeatures items={extraSections.trust_bar.content} />}

        {/* 4a. Servicios con turno. En tiendas solo de servicios usan el encabezado
            del catálogo configurado en Diseño; en "ambos" van antes de los productos. */}
        {daTurnos && (
          <ServicesCatalog
            services={serviceList}
            tenantQuery={tenantQuery}
            etiqueta={vendeProductos ? 'Turnos online' : extraSections.catalog_header.settings.etiqueta}
            titulo={vendeProductos ? 'Reservá tu turno' : extraSections.catalog_header.settings.titulo}
            subtitulo={vendeProductos ? undefined : extraSections.catalog_header.settings.subtitulo}
          />
        )}

        {/* 4b. Colección de productos con filtros y buscador */}
        {vendeProductos && (
          <main id="catalogo" className="wrap pt-12 sm:pt-16 scroll-mt-24">
            <CatalogView
              products={productList}
              categories={categoryList}
              store={store}
              tenantQuery={tenantQuery}
              initialQuery={initialQuery}
              initialCategory={initialCategory}
              initialOffer={initialOffer}
              header={extraSections.catalog_header.settings}
            />
          </main>
        )}

        {/* 5. "Por qué elegirnos" (editable u oculta desde Diseño) */}
        {extraSections.story.enabled && (
          <StorySection section={extraSections.story} tenantQuery={tenantQuery} />
        )}

        {/* 6. Suscripción a Novedades (Newsletter) */}
        {extraSections.newsletter.enabled && (
          <NewsletterSection
            storeId={store.id}
            etiqueta={extraSections.newsletter.settings.etiqueta}
            titulo={extraSections.newsletter.settings.titulo}
            texto={extraSections.newsletter.settings.texto}
          />
        )}
      </div>

      {/* 7. Footer de 4 Columnas con Medios de Pago y Enlaces Legales */}
      <StoreFooter store={store} tenantQuery={tenantQuery} />
    </div>
  )
}
