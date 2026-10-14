// =============================================================================
// PORTALMAKER — Página Pública de "Sobre Nosotros" (Estilo TiendaDemo)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import StorefrontHeaderFlow from '@/app/tienda/sections/storefront-header-flow'
import StoreFooter from '@/app/tienda/sections/store-footer'
import { renderMarkdown } from '@/lib/markdown'
import { getStoreSections } from '@/lib/store-sections'
import { ArrowRight, Sparkles, Gem, Leaf, Heart } from 'lucide-react'

export default async function TiendaSobreNosotrosPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const supabase = await createSupabaseServerClient()

  // Obtener datos de la página si existen
  const { data: pageData } = await supabase
    .from('store_pages')
    .select('*')
    .eq('store_id', store.id)
    .eq('slug', 'sobre-nosotros')
    .eq('visible', true)
    .maybeSingle()

  // Parsear contenido
  let texto = ''
  let imagenUrl = ''

  if (pageData?.contenido) {
    try {
      if (pageData.contenido.startsWith('{')) {
        const parsed = JSON.parse(pageData.contenido)
        texto = parsed.texto || ''
        imagenUrl = parsed.imagen_url || ''
      } else {
        texto = pageData.contenido
      }
    } catch {
      texto = pageData.contenido
    }
  }

  // Obtener secciones modulares de Storefront
  const resolvedSections = await getStoreSections(
    supabase,
    store.id,
    store,
    true
  )

  const withTenant = (path: string) => {
    if (!tenantQuery) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}${tenantQuery.replace('?', '')}`
  }

  const bannerImage = imagenUrl || '/demo/store-hero.jpg'

  const pillars = [
    {
      icon: Gem,
      title: 'Diseño que permanece',
      text: 'Formas que trascienden tendencias pasajeras y se adaptan a tus espacios con armonía.',
    },
    {
      icon: Leaf,
      title: 'Elegir con intención',
      text: 'Una colección cuidada pieza por pieza, sin ruido innecesario ni producción descartable.',
    },
    {
      icon: Heart,
      title: 'Cerca de las personas',
      text: 'Una experiencia sencilla, honesta y directa de taller a tu hogar.',
    },
  ]

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] transition-colors duration-200 flex flex-col justify-between">
      <div>
        {/* Cabecera y Navegación Modular */}
        <StorefrontHeaderFlow
          store={store}
          resolvedSections={resolvedSections}
          tenantQuery={tenantQuery}
        />

        {/* Hero Banner de Sobre Nosotros */}
        <section className="relative min-h-[420px] sm:min-h-[480px] overflow-hidden bg-black/[0.03] dark:bg-white/[0.04]">
          <img
            src={bannerImage}
            alt={`El taller de ${store.nombre}`}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-65 dark:opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-fondo)] via-[var(--color-fondo)]/80 to-transparent sm:w-2/3 pointer-events-none" />

          <div className="wrap relative z-10 py-16 sm:py-24 flex flex-col justify-center min-h-[420px] sm:min-h-[480px]">
            <div className="max-w-md space-y-4">
              <p className="eyebrow text-[var(--color-primario)]">NUESTRA ESENCIA</p>
              <h1 className="text-3xl sm:text-5xl font-semibold font-[var(--font-heading)] leading-tight text-[var(--color-texto)]">
                Somos {store.nombre}.
              </h1>
              <p className="text-sm sm:text-base leading-relaxed opacity-75 text-[var(--color-texto)]">
                {store.slogan || 'Creemos que vivir mejor comienza con las cosas que eliges tener cerca.'}
              </p>
              <div className="pt-2">
                <Link
                  href={withTenant('/tienda')}
                  className="min-h-[44px] h-11 px-6 rounded-full bg-[var(--color-primario)] text-white text-xs sm:text-sm font-semibold hover:opacity-95 active:scale-98 transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>Descubre nuestra selección</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Historia & Manifiesto */}
        <section className="wrap py-14 sm:py-20 space-y-16">
          <div className="grid gap-8 sm:gap-12 md:grid-cols-2 items-start">
            <h2 className="text-2xl sm:text-4xl font-medium font-[var(--font-heading)] leading-tight text-[var(--color-texto)]">
              Objetos con intención.<br />
              Espacios con alma.
            </h2>
            <div className="space-y-4 text-xs sm:text-sm leading-relaxed opacity-75 text-[var(--color-texto)] font-[var(--font-body)]">
              {texto ? (
                renderMarkdown(texto)
              ) : (
                <>
                  <p>
                    {store.nombre} nace de una idea simple: rodearnos de menos cosas, pero mejores. Piezas donde la belleza y la utilidad conviven sin esfuerzo.
                  </p>
                  <p>
                    Seleccionamos y fabricamos objetos para tu día a día con una mirada que prioriza el detalle, el tacto de los materiales y esa dedicación artesanal que marca una gran diferencia.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* 3 Pilares TiendaDemo */}
          <div className="grid gap-8 border-t border-black/10 dark:border-white/10 pt-12 sm:grid-cols-3">
            {pillars.map(({ icon: Icon, title, text }) => (
              <div key={title} className="space-y-3">
                <Icon className="w-7 h-7 text-[var(--color-primario)] stroke-[1.4]" />
                <h3 className="text-base sm:text-lg font-semibold text-[var(--color-texto)]">
                  {title}
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed opacity-70 text-[var(--color-texto)]">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <StoreFooter store={store} tenantQuery={tenantQuery} />
    </div>
  )
}
