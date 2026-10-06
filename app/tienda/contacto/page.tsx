// =============================================================================
// PORTALMAKER — Página Pública de Contacto & Ubicación
// =============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore } from '@/lib/tenant'
import ThemeToggle from '@/app/tienda/theme-toggle'
import { MessageSquare, Store } from 'lucide-react'
import ContactoClient from './contacto-client'

export default async function TiendaContactoPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const cleanPhone = store.whatsapp_numero ? store.whatsapp_numero.replace(/[^0-9]/g, '') : null
  const generalWhatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola ${store.nombre}! Vengo de ver tu tienda online.`)}`
    : null

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-black/10 dark:border-white/10 sticky top-0 bg-[var(--color-fondo)]/90 backdrop-blur-md z-30 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <Link href={`/tienda${tenantQuery}`} className="flex items-center gap-3">
            {store.logo_url && (
              <img
                src={store.logo_url}
                alt={store.nombre}
                className="h-10 sm:h-12 w-auto max-w-[140px] object-contain rounded-lg"
              />
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight font-[var(--font-heading)] text-[var(--color-primario)]">
                {store.nombre}
              </h1>
              {store.slogan && (
                <p className="text-xs sm:text-sm opacity-70 line-clamp-1 mt-0.5">
                  {store.slogan}
                </p>
              )}
            </div>
          </Link>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href={`/tienda${tenantQuery}`}
              className="min-h-[44px] hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <Store className="w-4 h-4" />
              <span>Catálogo</span>
            </Link>

            <ThemeToggle />

            {generalWhatsappUrl && (
              <a
                href={generalWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--color-primario)] text-white text-xs sm:text-sm font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
                <span className="sm:hidden">Contacto</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <ContactoClient store={store} tenantQuery={tenantQuery} />
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-black/10 dark:border-white/10 py-8 text-center text-xs opacity-60">
        <p>© {new Date().getFullYear()} {store.nombre} — Desarrollado sobre Portalmaker</p>
      </footer>
    </div>
  )
}
