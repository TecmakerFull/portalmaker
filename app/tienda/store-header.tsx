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
    <header
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-fondo) 80%, transparent)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      className="border-b border-black/10 dark:border-white/10 sticky top-0 z-40 transition-colors duration-200"
    >
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
              className="min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] text-[var(--color-texto)] hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5 opacity-80" />
            </Link>
          </div>

          {/* Columna Central: Nombre de la Tienda / Logotipo Centrado */}
          <div className="flex flex-col items-center justify-center text-center">
            <Link
              href={`/tienda${tenantQuery}`}
              className="group flex flex-col items-center justify-center focus:outline-none py-1"
            >
              {/* Logo con escala configurada */}
              {store.logo_url && (
                <img
                  src={store.logo_url}
                  alt={store.nombre}
                  className={`w-auto object-contain rounded-lg transition-all ${
                    store.logo_tamano === 'chico'
                      ? 'h-8 sm:h-9 max-w-[140px]'
                      : store.logo_tamano === 'grande'
                      ? 'h-14 sm:h-16 max-w-[260px]'
                      : store.logo_tamano === 'xl'
                      ? 'h-18 sm:h-20 max-w-[320px]'
                      : 'h-10 sm:h-12 max-w-[200px]'
                  }`}
                />
              )}

              {/* Nombre de la tienda (se muestra si no hay logo, o si mostrar_nombre_header está habilitado) */}
              {(!store.logo_url || store.mostrar_nombre_header !== false) && (
                <h1 className={`font-bold tracking-tight font-[var(--font-heading)] text-[var(--color-primario)] group-hover:opacity-90 transition-opacity uppercase ${
                  store.logo_url ? 'text-xs sm:text-sm mt-1 tracking-wider' : 'text-xl sm:text-3xl sm:tracking-wide'
                }`}>
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
