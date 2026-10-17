// =============================================================================
// PORTALMAKER — Tienda Pública (Página de Inicio Estilo TiendaDemo / Nöra)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ThemeToggle from './theme-toggle'
import StorefrontHeaderFlow from './sections/storefront-header-flow'
import HeroBanners from './sections/hero-banners'
import TrustFeatures from './sections/trust-features'
import CatalogView from './catalog-view'
import StorySection from './sections/story-section'
import NewsletterSection from './sections/newsletter-section'
import StoreFooter from './sections/store-footer'
import { getStoreSections } from '@/lib/store-sections'
import { MessageSquare, Package } from 'lucide-react'

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

  const productList = products ?? []
  const categoryList = categories ?? []

  // Link general de WhatsApp
  const cleanPhone = store.whatsapp_numero ? store.whatsapp_numero.replace(/[^0-9]/g, '') : null
  const generalWhatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola ${store.nombre}! Vengo de ver tu tienda online.`)}`
    : null

  // Si la tienda está apagada (modo mantenimiento / en construcción)
  if (!store.suscripcion_activa) {
    return (
      <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] flex flex-col justify-between transition-colors duration-200">
        <header className="border-b border-black/10 dark:border-white/10 p-4 sm:p-6 flex items-center justify-between max-w-6xl w-full mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold font-[var(--font-heading)] text-[var(--color-primario)]">
            {store.nombre}
          </h1>
          <ThemeToggle />
        </header>

        <main className="max-w-lg mx-auto p-6 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-[var(--color-primario)]/15 text-[var(--color-primario-legible)] flex items-center justify-center mx-auto shadow-xs">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 mb-3 inline-block">
              Tienda en Preparación
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-[var(--font-heading)] mt-1">
              ¡Volvemos muy pronto!
            </h2>
            <p className="text-sm opacity-70 mt-2 leading-relaxed">
              Estamos actualizando el catálogo, nuevos modelos y piezas de taller.
              Si precisás realizar un encargo urgente, podés contactarnos directamente por WhatsApp.
            </p>
          </div>

          {generalWhatsappUrl && (
            <a
              href={generalWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] px-6 py-3 rounded-2xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-sm font-bold hover:opacity-90 active:scale-95 transition-all inline-flex items-center justify-center gap-2 shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Contactar por WhatsApp</span>
            </a>
          )}
        </main>

        <footer className="border-t border-black/10 dark:border-white/10 py-6 text-center text-xs opacity-50">
          <p>© {new Date().getFullYear()} {store.nombre} — Desarrollado sobre Portalmaker</p>
        </footer>
      </div>
    )
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

        {/* 3. Barra de Confianza & Beneficios (4 columnas) */}
        <TrustFeatures />

        {/* 4. Colección Curada de Productos con Filtros y Buscador */}
        <main id="catalogo" className="wrap pt-12 sm:pt-16 scroll-mt-24">
          <CatalogView
            products={productList}
            categories={categoryList}
            store={store}
            tenantQuery={tenantQuery}
            initialQuery={initialQuery}
            initialCategory={initialCategory}
            initialOffer={initialOffer}
          />
        </main>

        {/* 5. Propuesta de Valor / Manifiesto Maker ("MENOS, PERO MEJOR") */}
        <StorySection
          storeName={store.nombre}
          slogan={store.slogan}
          tenantQuery={tenantQuery}
        />

        {/* 6. Suscripción a Novedades (Newsletter) */}
        <NewsletterSection storeId={store.id} storeName={store.nombre} />
      </div>

      {/* 7. Footer de 4 Columnas con Medios de Pago y Enlaces Legales */}
      <StoreFooter store={store} tenantQuery={tenantQuery} />
    </div>
  )
}
