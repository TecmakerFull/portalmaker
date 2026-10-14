// =============================================================================
// PORTALMAKER — Sección 2: Header Principal Minimalista & Moderno (Estilo TiendaDemo)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Store, HeaderSettings } from '@/types/database'
import ThemeToggle from '../theme-toggle'
import { useCart } from '@/lib/cart-context'
import {
  Search,
  ShoppingBag,
  Heart,
  UserRound,
  Menu,
  X,
  ArrowRight,
} from 'lucide-react'

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
  const router = useRouter()
  const { totalItems, toggleCart, favorites } = useCart()

  const {
    mostrar_nombre = true,
    mostrar_buscador = true,
    mostrar_carrito = true,
    mostrar_tema_toggle = true,
    sticky = true,
  } = settings || {}

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    const base = `/tienda`
    const sep = tenantQuery ? (tenantQuery.startsWith('?') ? `${tenantQuery}&` : `?${tenantQuery}&`) : '?'
    const dest = q ? `${base}${sep}q=${encodeURIComponent(q)}` : `${base}${tenantQuery}`
    router.push(dest)
    setMobileMenuOpen(false)
  }

  // Helper para URL con tenantQuery
  const withTenant = (path: string) => {
    if (!tenantQuery) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}${tenantQuery.replace('?', '')}`
  }

  return (
    <header
      className={`border-b border-black/10 dark:border-white/10 bg-[var(--color-fondo)]/95 backdrop-blur-md z-30 transition-colors duration-200 ${
        sticky ? 'sticky top-0' : 'relative'
      }`}
    >
      <div className="wrap grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:gap-4 py-4 sm:py-5 md:grid-cols-[1fr_1.3fr_1fr]">
        {/* Izquierda: Botón Menú Mobile + Logo / Marca */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button
            type="button"
            className="md:hidden min-w-[44px] min-h-[44px] -ml-2 rounded-xl flex items-center justify-center text-[var(--color-texto)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú de navegación'}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link
            href={withTenant('/tienda')}
            className="min-w-0 flex items-center gap-3 group focus:outline-none"
          >
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.nombre}
                className="h-9 sm:h-11 w-auto max-w-[140px] sm:max-w-[180px] object-contain rounded-lg shrink-0"
              />
            ) : null}

            {(!store.logo_url || mostrar_nombre) && (
              <div className="min-w-0">
                <span className="brand text-[var(--color-primario)] block truncate">
                  {store.nombre}
                  <span className="text-[var(--color-texto)]">.</span>
                </span>
                {store.slogan && (
                  <span className="mt-0.5 block text-[10px] sm:text-[11px] opacity-70 truncate font-normal">
                    {store.slogan}
                  </span>
                )}
              </div>
            )}
          </Link>
        </div>

        {/* Centro: Buscador de productos (Desktop) */}
        {mostrar_buscador && (
          <form
            onSubmit={handleSearchSubmit}
            role="search"
            className="hidden md:flex items-center rounded-xl border border-black/15 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.04] px-3.5 focus-within:border-[var(--color-primario)] focus-within:ring-2 focus-within:ring-[var(--color-primario)]/20 transition-all"
          >
            <Search className="w-4 h-4 opacity-50 shrink-0" />
            <input
              type="text"
              aria-label="Buscar productos"
              placeholder="¿Qué estás buscando?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 min-w-0 flex-1 bg-transparent px-3 text-xs outline-none placeholder:opacity-50 text-[var(--color-texto)]"
            />
            <button
              type="submit"
              className="text-[11px] font-semibold opacity-60 hover:opacity-100 text-[var(--color-primario)] cursor-pointer py-1 px-2 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            >
              Buscar
            </button>
          </form>
        )}

        {/* Derecha: Acciones (Tema, Cuenta, Favoritos, Carrito) */}
        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-3">
          {mostrar_tema_toggle && <ThemeToggle />}

          {/* Botón Mi Cuenta */}
          <Link
            href={withTenant('/tienda/cuenta')}
            title="Mi cuenta"
            aria-label="Mi cuenta"
            className="min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-texto)] flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          >
            <UserRound className="w-4 h-4 sm:w-5 sm:h-5 opacity-80" />
          </Link>

          {/* Botón Favoritos con Badge */}
          <Link
            href={withTenant('/tienda/favoritos')}
            title="Favoritos"
            aria-label={`Favoritos, ${favorites.length} guardados`}
            className="relative min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-texto)] flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          >
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 opacity-80" />
            {favorites.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-primario)] text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                {favorites.length}
              </span>
            )}
          </Link>

          {/* Botón Carrito */}
          {mostrar_carrito && (
            <button
              type="button"
              onClick={toggleCart}
              aria-label={`Abrir carrito con ${totalItems} productos`}
              className="min-h-[40px] h-10 px-2.5 sm:px-3 rounded-xl border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primario)]" />
              <span className="hidden sm:inline text-xs font-semibold">Mi carrito</span>
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-primario)] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                {totalItems}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Menú Desplegable Mobile */}
      {mobileMenuOpen && (
        <div className="border-t border-black/10 dark:border-white/10 px-4 py-5 md:hidden bg-[var(--color-fondo)] animate-in slide-in-from-top-2 duration-200">
          {mostrar_buscador && (
            <form onSubmit={handleSearchSubmit} className="mb-5 flex gap-2">
              <input
                type="text"
                aria-label="Buscar productos en móvil"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 rounded-xl border border-black/15 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.04] px-3.5 text-xs outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
              />
              <button
                type="submit"
                aria-label="Ejecutar búsqueda"
                className="h-11 w-11 shrink-0 rounded-xl bg-[var(--color-primario)] text-white flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          )}

          <nav className="grid gap-2 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
            <Link
              href={withTenant('/tienda')}
              className="py-2.5 px-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between"
            >
              <span>Inicio</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-40" />
            </Link>
            <Link
              href={withTenant('/tienda')}
              className="py-2.5 px-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between"
            >
              <span>Todos los productos</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-40" />
            </Link>
            <Link
              href={withTenant('/tienda/favoritos')}
              className="py-2.5 px-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between"
            >
              <span>Mis favoritos</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-primario)]/15 text-[var(--color-primario)] font-semibold">
                {favorites.length}
              </span>
            </Link>
            <Link
              href={withTenant('/tienda/sobre-nosotros')}
              className="py-2.5 px-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between"
            >
              <span>Sobre nosotros</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-40" />
            </Link>
            <Link
              href={withTenant('/tienda/contacto')}
              className="py-2.5 px-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between"
            >
              <span>Contacto</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-40" />
            </Link>
            <Link
              href={withTenant('/tienda/cuenta')}
              className="py-2.5 px-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between"
            >
              <span>Mi cuenta</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-40" />
            </Link>
            <Link
              href={withTenant('/tienda/ayuda')}
              className="py-2.5 px-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between opacity-80"
            >
              <span>Ayuda y Preguntas frecuentes</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-40" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
