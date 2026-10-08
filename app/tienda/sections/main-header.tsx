// =============================================================================
// PORTALMAKER — Sección 2: Header Principal Modular de Storefront
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import Link from 'next/link'
import type { Store, HeaderSettings } from '@/types/database'
import ThemeToggle from '../theme-toggle'
import CartButton from '../cart-button'
import { Search, MessageSquare } from 'lucide-react'

interface MainHeaderProps {
  store: Store
  settings?: HeaderSettings
  tenantQuery: string
}

export default function MainHeader({
  store,
  settings,
  tenantQuery,
}: MainHeaderProps) {
  const {
    mostrar_buscador = true,
    mostrar_carrito = true,
    mostrar_whatsapp = Boolean(store.whatsapp_numero),
    mostrar_tema_toggle = true,
    logo_posicion = 'centro',
    sticky = true,
  } = settings || {}

  const handleSearchClick = () => {
    const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement | null
    if (searchInput) {
      searchInput.focus()
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const cleanPhone = store.whatsapp_numero ? store.whatsapp_numero.replace(/[^0-9]/g, '') : null
  const generalWhatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola ${store.nombre}! Vengo de ver tu tienda online.`)}`
    : null

  const isCenterLogo = logo_posicion === 'centro'

  return (
    <header
      className={`border-b border-black/10 dark:border-white/10 bg-[var(--color-fondo)]/95 backdrop-blur-md z-30 transition-colors duration-200 ${
        sticky ? 'sticky top-0' : 'relative'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div
          className={`h-20 sm:h-24 grid items-center ${
            isCenterLogo ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-12 gap-4'
          }`}
        >
          {/* Posición 1: Izquierda */}
          {isCenterLogo ? (
            <div className="flex items-center justify-start gap-2">
              {mostrar_buscador && (
                <Link
                  href={`/tienda${tenantQuery}`}
                  onClick={handleSearchClick}
                  aria-label="Buscar productos en el catálogo"
                  title="Buscar en el catálogo"
                  className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  <span className="hidden md:inline font-medium">Buscar</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="sm:col-span-4 flex items-center justify-start">
              <Link
                href={`/tienda${tenantQuery}`}
                className="group flex items-center gap-3 focus:outline-none"
              >
                {store.logo_url ? (
                  <img
                    src={store.logo_url}
                    alt={store.nombre}
                    className="h-9 sm:h-12 w-auto max-w-[170px] sm:max-w-[220px] object-contain rounded-lg"
                  />
                ) : (
                  <div>
                    <h1 className="text-lg sm:text-2xl font-bold tracking-tight font-[var(--font-heading)] text-[var(--color-primario)] group-hover:opacity-90 transition-opacity uppercase">
                      {store.nombre}
                    </h1>
                    {store.slogan && (
                      <p className="text-[10px] sm:text-xs opacity-70 line-clamp-1 mt-0.5">
                        {store.slogan}
                      </p>
                    )}
                  </div>
                )}
              </Link>
            </div>
          )}

          {/* Posición 2: Centro (Solo cuando logo_posicion === 'centro') */}
          {isCenterLogo ? (
            <div className="flex flex-col items-center justify-center text-center">
              <Link
                href={`/tienda${tenantQuery}`}
                className="group flex flex-col items-center justify-center focus:outline-none"
              >
                {store.logo_url ? (
                  <img
                    src={store.logo_url}
                    alt={store.nombre}
                    className="h-9 sm:h-12 w-auto max-w-[170px] sm:max-w-[220px] object-contain rounded-lg"
                  />
                ) : (
                  <h1 className="text-xl sm:text-3xl font-bold tracking-tight sm:tracking-wide font-[var(--font-heading)] text-[var(--color-primario)] group-hover:opacity-90 transition-opacity uppercase">
                    {store.nombre}
                  </h1>
                )}

                {store.slogan && (
                  <p className="text-[10px] sm:text-xs opacity-70 line-clamp-1 mt-0.5 tracking-normal">
                    {store.slogan}
                  </p>
                )}
              </Link>
            </div>
          ) : (
            <div className="hidden sm:flex sm:col-span-4 items-center justify-center">
              {mostrar_buscador && (
                <Link
                  href={`/tienda${tenantQuery}`}
                  onClick={handleSearchClick}
                  className="w-full max-w-xs min-h-[40px] px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs opacity-70 hover:opacity-100 flex items-center gap-2 transition-all"
                >
                  <Search className="w-4 h-4 opacity-60" />
                  <span>Buscar modelos, piezas, categorías...</span>
                </Link>
              )}
            </div>
          )}

          {/* Posición 3: Derecha (Controles, WhatsApp, Carrito, Tema) */}
          <div
            className={`flex items-center justify-end gap-1.5 sm:gap-2.5 ${
              !isCenterLogo ? 'sm:col-span-4' : ''
            }`}
          >
            {mostrar_whatsapp && generalWhatsappUrl && (
              <a
                href={generalWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Consultar por WhatsApp"
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold hidden md:inline-flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            )}

            {mostrar_tema_toggle && <ThemeToggle />}
            {mostrar_carrito && <CartButton />}
          </div>
        </div>
      </div>
    </header>
  )
}
