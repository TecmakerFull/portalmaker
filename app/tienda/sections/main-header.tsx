// =============================================================================
// PORTALMAKER — Sección 2: Header Principal Modular de Storefront
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import Link from 'next/link'
import type { Store, HeaderSettings } from '@/types/database'
import ThemeToggle from '../theme-toggle'
import CartButton from '../cart-button'
import WhatsAppIcon from './whatsapp-icon'
import { Search } from 'lucide-react'

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
          className={`h-20 sm:h-24 grid items-center gap-2 sm:gap-4 ${
            isCenterLogo ? 'grid-cols-[1fr_auto_1fr]' : 'grid-cols-2 sm:grid-cols-12'
          }`}
        >
          {/* Posición 1: Izquierda */}
          {isCenterLogo ? (
            <div className="flex items-center justify-start gap-2 min-w-0">
              {mostrar_buscador && (
                <Link
                  href={`/tienda${tenantQuery}`}
                  onClick={handleSearchClick}
                  aria-label="Buscar productos en el catálogo"
                  title="Buscar en el catálogo"
                  className="min-h-[44px] min-w-[44px] px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center gap-2"
                >
                  <Search className="w-5 h-5 shrink-0" />
                  <span className="hidden md:inline font-medium">Buscar</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="sm:col-span-4 flex items-center justify-start min-w-0">
              <Link
                href={`/tienda${tenantQuery}`}
                className="group flex items-center gap-3 focus:outline-none min-w-0"
              >
                {store.logo_url ? (
                  <img
                    src={store.logo_url}
                    alt={store.nombre}
                    className="h-9 sm:h-12 w-auto max-w-[170px] sm:max-w-[220px] object-contain rounded-lg shrink-0"
                  />
                ) : (
                  <div className="min-w-0">
                    <h1 className="text-lg sm:text-2xl font-bold tracking-tight font-[var(--font-heading)] text-[var(--color-primario)] group-hover:opacity-90 transition-opacity uppercase truncate">
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
            <div className="flex flex-col items-center justify-center text-center px-2 min-w-0 max-w-full">
              <Link
                href={`/tienda${tenantQuery}`}
                className="group flex flex-col items-center justify-center focus:outline-none max-w-full"
              >
                {store.logo_url ? (
                  <img
                    src={store.logo_url}
                    alt={store.nombre}
                    className="h-9 sm:h-12 w-auto max-w-[140px] sm:max-w-[200px] object-contain rounded-lg shrink-0"
                  />
                ) : (
                  <h1 className="text-lg sm:text-2xl font-bold tracking-tight sm:tracking-wide font-[var(--font-heading)] text-[var(--color-primario)] group-hover:opacity-90 transition-opacity uppercase truncate max-w-[180px] sm:max-w-xs">
                    {store.nombre}
                  </h1>
                )}

                {store.slogan && (
                  <p className="text-[10px] sm:text-xs opacity-70 line-clamp-1 mt-0.5 tracking-normal max-w-[180px] sm:max-w-xs truncate">
                    {store.slogan}
                  </p>
                )}
              </Link>
            </div>
          ) : (
            <div className="hidden sm:flex sm:col-span-4 items-center justify-center min-w-0">
              {mostrar_buscador && (
                <Link
                  href={`/tienda${tenantQuery}`}
                  onClick={handleSearchClick}
                  className="w-full max-w-xs min-h-[40px] px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs opacity-70 hover:opacity-100 flex items-center gap-2 transition-all"
                >
                  <Search className="w-4 h-4 opacity-60 shrink-0" />
                  <span className="truncate">Buscar modelos, piezas, categorías...</span>
                </Link>
              )}
            </div>
          )}

          {/* Posición 3: Derecha (Controles, WhatsApp, Carrito, Tema) */}
          <div
            className={`flex items-center justify-end gap-1.5 sm:gap-2 min-w-0 ${
              !isCenterLogo ? 'sm:col-span-4' : ''
            }`}
          >
            {mostrar_whatsapp && generalWhatsappUrl && (
              <a
                href={generalWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Consultar por WhatsApp"
                className="min-h-[40px] px-2 sm:px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-900/40 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
              >
                <WhatsAppIcon className="w-4 h-4 shrink-0" />
                <span className="hidden xl:inline">WhatsApp</span>
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
