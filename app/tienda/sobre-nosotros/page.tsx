// =============================================================================
// PORTALMAKER — Página Pública de "Sobre Nosotros"
// =============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import StorefrontHeaderFlow from '@/app/tienda/sections/storefront-header-flow'
import { renderMarkdown } from '@/lib/markdown'
import WhatsAppIcon from '@/app/tienda/sections/whatsapp-icon'
import { getStoreSections } from '@/lib/store-sections'

export default async function TiendaSobreNosotrosPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const supabase = await createSupabaseServerClient()

  // Obtener datos de la página
  const { data: pageData } = await supabase
    .from('store_pages')
    .select('*')
    .eq('store_id', store.id)
    .eq('slug', 'sobre-nosotros')
    .eq('visible', true)
    .maybeSingle()

  if (!pageData) {
    notFound()
  }

  // Parsear contenido
  let texto = ''
  let imagenUrl = ''

  if (pageData.contenido) {
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

  const cleanPhone = store.whatsapp_numero ? store.whatsapp_numero.replace(/[^0-9]/g, '') : null
  const generalWhatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola ${store.nombre}! Leí su sección Sobre Nosotros y me gustaría consultarles.`)}`
    : null

  // Obtener secciones modulares de Storefront (Top Bar, Header, Navbar)
  const resolvedSections = await getStoreSections(
    supabase,
    store.id,
    store,
    true
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

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-16 space-y-10">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primario)] bg-[var(--color-primario)]/10 px-3 py-1 rounded-full inline-block">
            Conocé nuestro taller
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold font-[var(--font-heading)]">
            {pageData.titulo || 'Sobre Nosotros'}
          </h2>
          {store.slogan && (
            <p className="text-sm sm:text-base opacity-70 max-w-xl mx-auto">
              {store.slogan}
            </p>
          )}
        </div>

        {/* Foto Destacada (si tiene) */}
        {imagenUrl && (
          <div className="w-full aspect-[16/9] sm:aspect-[21/9] rounded-3xl overflow-hidden border border-black/10 dark:border-white/10 shadow-lg bg-black/5">
            <img
              src={imagenUrl}
              alt={pageData.titulo}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Texto de la Historia */}
        <div className="bg-black/[0.02] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-3xl p-6 sm:p-10 space-y-6 text-sm sm:text-base leading-relaxed">
          {texto ? (
            <div className="space-y-4">
              {renderMarkdown(texto)}
            </div>
          ) : (
            <p className="opacity-70 italic text-center py-6">
              Esta sección está siendo actualizada con la historia y fotos del taller.
            </p>
          )}

          {generalWhatsappUrl && (
            <div className="pt-6 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base">¿Tienes un proyecto personalizado en mente?</h3>
                <p className="text-xs sm:text-sm opacity-70">
                  Fabricamos piezas a medida, prototipos y series personalizadas.
                </p>
              </div>

              <a
                href={generalWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-6 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs sm:text-sm font-bold active:scale-95 transition-all flex items-center gap-2 shadow-sm shrink-0"
              >
                <WhatsAppIcon className="w-4 h-4 shrink-0" />
                <span>Escribinos por WhatsApp</span>
              </a>
            </div>
          )}
        </div>
      </main>
    </div>

      {/* Footer */}
      <footer className="mt-20 border-t border-black/10 dark:border-white/10 py-8 text-center text-xs opacity-60 space-y-2">
        <div className="flex items-center justify-center gap-4 text-xs font-semibold">
          <Link href={`/tienda${tenantQuery}`} className="hover:underline">
            Catálogo
          </Link>
          <span>•</span>
          <Link href={`/tienda/contacto${tenantQuery}`} className="hover:underline">
            Contacto & Ubicación
          </Link>
        </div>
        <p>© {new Date().getFullYear()} {store.nombre} — Desarrollado sobre Portalmaker</p>
      </footer>
    </div>
  )
}
