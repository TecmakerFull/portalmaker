// =============================================================================
// PORTALMAKER — Sección 2: Header Principal Modular de Storefront
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import Link from 'next/link'
import type { Store, HeaderSettings } from '@/types/database'
import ThemeToggle from '../theme-toggle'
import CartButton from '../cart-button'
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
    mostrar_nombre = true,
    mostrar_buscador = true,
    mostrar_carrito = true,
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
            isCenterLogo ? 'grid-cols-[1fr_auto_1fr]' : 'grid-cols-2'
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
                  className="min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] text-[var(--color-texto)] hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                >
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 opacity-80" />
                </Link>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-start min-w-0">
              <Link
                href={`/tienda${tenantQuery}`}
                className="group flex items-center gap-3 focus:outline-none min-w-0"
              >
                {store.logo_url && (
                  <img
                    src={store.logo_url}
                    alt={store.nombre}
                    className="h-9 sm:h-12 w-auto max-w-[150px] sm:max-w-[200px] object-contain rounded-lg shrink-0"
                  />
                )}
                {(!store.logo_url || mostrar_nombre) && (
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-2xl font-bold tracking-tight font-[var(--font-heading)] text-[var(--color-primario)] group-hover:opacity-90 transition-opacity uppercase truncate">
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
          {isCenterLogo && (
            <div className="flex flex-col items-center justify-center text-center px-2 min-w-0 max-w-full">
              <Link
                href={`/tienda${tenantQuery}`}
                className="group flex flex-col items-center justify-center focus:outline-none max-w-full"
              >
                {store.logo_url && (
                  <img
                    src={store.logo_url}
                    alt={store.nombre}
                    className="h-8 sm:h-11 w-auto max-w-[140px] sm:max-w-[180px] object-contain rounded-lg shrink-0"
                  />
                )}

                {(!store.logo_url || mostrar_nombre) && (
                  <h1 className="text-base sm:text-xl font-bold tracking-tight sm:tracking-wide font-[var(--font-heading)] text-[var(--color-primario)] group-hover:opacity-90 transition-opacity uppercase truncate max-w-[180px] sm:max-w-xs mt-0.5">
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
          )}

          {/* Posición 3: Derecha (Controles: Buscador si logo está a la izquierda, Tema, Carrito) */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 min-w-0">
            {!isCenterLogo && mostrar_buscador && (
              <Link
                href={`/tienda${tenantQuery}`}
                onClick={handleSearchClick}
                aria-label="Buscar productos en el catálogo"
                title="Buscar en el catálogo"
                className="min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] text-[var(--color-texto)] hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95"
              >
                <Search className="w-4 h-4 sm:w-5 sm:h-5 opacity-80" />
              </Link>
            )}

            {mostrar_tema_toggle && <ThemeToggle />}
            {mostrar_carrito && <CartButton />}
          </div>
        </div>
      </div>
    </header>
  )
}
