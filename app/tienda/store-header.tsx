// =============================================================================
// PORTALMAKER — Header Principal de Tienda Estilo Tiendanube / E-commerce Moderno
// (Logo/Nombre al centro, buscador arriba a la izquierda, carrito/tema a la derecha, navegación centrada)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Store } from '@/types/database'
import ThemeToggle from './theme-toggle'
import CartButton from './cart-button'
import { Search } from 'lucide-react'

interface StoreHeaderProps {
  store: Store
  tenantQuery: string
  hasSobreNosotros?: boolean
}

export default function StoreHeader({
  store,
  tenantQuery,
  hasSobreNosotros = false,
}: StoreHeaderProps) {
  const pathname = usePathname()

  const isCatalogo = pathname === '/tienda' || pathname.startsWith('/tienda/productos')
  const isSobreNosotros = pathname.includes('/tienda/sobre-nosotros')
  const isContacto = pathname.includes('/tienda/contacto')

  // Manejar click en buscar: redirige o hace foco en el buscador de la tienda
  const handleSearchClick = () => {
    const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement | null
    if (searchInput) {
      searchInput.focus()
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <header className="border-b border-black/10 dark:border-white/10 sticky top-0 bg-[var(--color-fondo)]/95 backdrop-blur-md z-30 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Fila Principal: Buscador (Izq) — Marca Centrada (Centro) — Carrito & Tema (Der) */}
        <div className="h-20 sm:h-24 grid grid-cols-3 items-center">
          {/* Columna Izquierda: Botón de Búsqueda Superior */}
          <div className="flex items-center justify-start">
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
          </div>

          {/* Columna Central: Nombre de la Tienda / Logotipo Centrado */}
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

          {/* Columna Derecha: Tema Claro/Oscuro y Carrito con Contador */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
            <ThemeToggle />
            <CartButton />
          </div>
        </div>

        {/* Fila Secundaria: Menú de Navegación Centrado */}
        <nav className="pb-3 pt-0 flex items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm font-semibold border-t border-black/5 dark:border-white/5 overflow-x-auto scrollbar-none">
          <Link
            href={`/tienda${tenantQuery}`}
            className={`min-h-[38px] px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
              isCatalogo
                ? 'text-[var(--color-primario)] font-bold border-b-2 border-[var(--color-primario)] rounded-b-none'
                : 'opacity-70 hover:opacity-100 hover:text-[var(--color-primario)]'
            }`}
          >
            Productos
          </Link>

          {hasSobreNosotros && (
            <Link
              href={`/tienda/sobre-nosotros${tenantQuery}`}
              className={`min-h-[38px] px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
                isSobreNosotros
                  ? 'text-[var(--color-primario)] font-bold border-b-2 border-[var(--color-primario)] rounded-b-none'
                  : 'opacity-70 hover:opacity-100 hover:text-[var(--color-primario)]'
              }`}
            >
              Sobre Nosotros
            </Link>
          )}

          <Link
            href={`/tienda/contacto${tenantQuery}`}
            className={`min-h-[38px] px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
              isContacto
                ? 'text-[var(--color-primario)] font-bold border-b-2 border-[var(--color-primario)] rounded-b-none'
                : 'opacity-70 hover:opacity-100 hover:text-[var(--color-primario)]'
            }`}
          >
            Contacto & Ubicación
          </Link>
        </nav>
      </div>
    </header>
  )
}
