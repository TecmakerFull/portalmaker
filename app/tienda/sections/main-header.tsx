// =============================================================================
// PORTALMAKER — Sección 2: Header Principal Minimalista & Moderno (Estilo TiendaDemo)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Store, HeaderSettings } from '@/types/database'
import ThemeToggle from '../theme-toggle'
import { useCart } from '@/lib/cart-context'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  Search,
  ShoppingBag,
  Heart,
  UserRound,
  UserCheck,
  Menu,
  X,
  ArrowRight,
} from 'lucide-react'
import { usePreviewDevice } from '../preview-context'

interface MainHeaderProps {
  store: Store
  settings?: HeaderSettings
  tenantQuery: string
}

export default function MainHeader(props: MainHeaderProps) {
  return (
    <Suspense fallback={null}>
      <MainHeaderInner {...props} />
    </Suspense>
  )
}

function MainHeaderInner({
  store,
  settings,
  tenantQuery,
}: MainHeaderProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const { totalItems, toggleCart, favorites } = useCart()

  // Estado del cliente con sesión activa
  const [activeCustomer, setActiveCustomer] = useState<{ email: string; nombre?: string } | null>(null)

  useEffect(() => {
    // 1. Obtener sesión actual
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setActiveCustomer({
          email: user.email,
          nombre: user.user_metadata?.nombre || user.email.split('@')[0],
        })
      } else {
        setActiveCustomer(null)
      }
    })

    // 2. Escuchar cambios de sesión en tiempo real (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setActiveCustomer({
          email: session.user.email,
          nombre: session.user.user_metadata?.nombre || session.user.email.split('@')[0],
        })
      } else {
        setActiveCustomer(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const {
    mostrar_nombre = true,
    mostrar_buscador = true,
    mostrar_carrito = true,
    mostrar_tema_toggle = true,
    logo_posicion = 'centro',
    sticky = true,
  } = settings || {}

  const isCenter = logo_posicion === 'centro'
  const previewDevice = usePreviewDevice()
  const isMobile = previewDevice === 'mobile'

  const searchParams = useSearchParams()
  const currentQ = searchParams?.get('q') || ''
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState(currentQ)

  // Sincronizar estado si cambia el query param en la URL
  useEffect(() => {
    setSearchQuery(currentQ)
  }, [currentQ])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    const base = `/tienda`
    const sep = tenantQuery ? (tenantQuery.startsWith('?') ? `${tenantQuery}&` : `?${tenantQuery}&`) : '?'
    const dest = q ? `${base}${sep}q=${encodeURIComponent(q)}#catalogo` : `${base}${tenantQuery}`
    router.push(dest)
    setMobileMenuOpen(false)

    if (typeof window !== 'undefined') {
      const el = document.getElementById('catalogo')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  // Helper para URL con tenantQuery
  const withTenant = (path: string) => {
    if (!tenantQuery) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}${tenantQuery.replace('?', '')}`
  }

  // Componente reutilizable del Logo y Nombre
  const renderLogoAndBrand = (centered: boolean = false) => (
    <Link
      href={withTenant('/tienda')}
      className={`min-w-0 flex items-center gap-2 sm:gap-3 group focus:outline-none ${
        centered ? 'justify-center text-center' : 'justify-start'
      }`}
    >
      {store.logo_url ? (
        <img
          src={store.logo_url}
          alt={store.nombre}
          className="h-8 sm:h-11 w-auto max-w-[130px] sm:max-w-[180px] object-contain rounded-lg shrink-0"
        />
      ) : null}

      {(!store.logo_url || mostrar_nombre) && (
        <div className={`min-w-0 ${centered ? 'text-center' : 'text-left'}`}>
          <span className="brand text-[var(--color-primario)] block truncate text-base sm:text-xl lg:text-2xl">
            {store.nombre}
          </span>
          {store.slogan && (
            <span className="mt-0.5 block text-[10px] sm:text-[11px] opacity-70 truncate font-normal">
              {store.slogan}
            </span>
          )}
        </div>
      )}
    </Link>
  )

  // Componente reutilizable del Buscador Desktop
  const renderSearchBar = (extraClasses: string = '') => (
    <form
      onSubmit={handleSearchSubmit}
      role="search"
      className={`hidden md:flex items-center rounded-xl border border-black/15 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.04] px-3.5 focus-within:border-[var(--color-primario)] focus-within:ring-2 focus-within:ring-[var(--color-primario)]/20 transition-all ${extraClasses}`}
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
      {searchQuery && (
        <button
          type="button"
          onClick={() => {
            setSearchQuery('')
            const base = `/tienda`
            router.push(`${base}${tenantQuery}`)
          }}
          aria-label="Limpiar búsqueda"
          className="mr-1 h-5 w-5 flex items-center justify-center opacity-50 hover:opacity-100 cursor-pointer text-[var(--color-texto)]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        type="submit"
        className="text-[11px] font-semibold opacity-60 hover:opacity-100 text-[var(--color-primario-legible)] cursor-pointer py-1 px-2 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-all"
      >
        Buscar
      </button>
    </form>
  )

  return (
    <header
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-fondo) 80%, transparent)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      className={`w-full border-b border-black/10 dark:border-white/10 z-40 transition-colors duration-200 ${
        sticky ? 'sticky top-0 shadow-xs' : 'relative'
      }`}
    >
      {isCenter ? (
        /* DISPOSICIÓN 1: LOGO CENTRADO (Estilo Tiendanube Moderno) */
        <div className={`wrap items-center gap-2 sm:gap-4 py-3.5 sm:py-5 ${
          isMobile
            ? 'flex justify-between'
            : 'grid grid-cols-[auto_1fr_auto] md:grid-cols-[1fr_auto_1fr]'
        }`}>
          {/* Izquierda: Menú Mobile + Buscador Desktop */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              className={`min-w-[40px] min-h-[40px] -ml-1 rounded-xl items-center justify-center text-[var(--color-texto)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer ${
                isMobile ? 'flex' : 'flex md:hidden'
              }`}
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú de navegación'}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {!isMobile && mostrar_buscador && renderSearchBar('w-full max-w-[240px] lg:max-w-[320px]')}
          </div>

          {/* Centro: Logo / Marca perfectamente centrado */}
          <div className="flex items-center justify-center min-w-0 px-2">
            {renderLogoAndBrand(true)}
          </div>

          {/* Derecha: Acciones */}
          <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-3">
            {mostrar_tema_toggle && <ThemeToggle />}

            {/* En Desktop: Accesos directos a Mi Cuenta y Favoritos */}
            {!isMobile && (
              <>
                <Link
                  href={withTenant('/tienda/cuenta')}
                  title={
                    activeCustomer
                      ? `Mi cuenta (${activeCustomer.nombre || activeCustomer.email}) - Conectado`
                      : 'Ingresar a mi cuenta'
                  }
                  aria-label={
                    activeCustomer
                      ? `Mi cuenta (${activeCustomer.nombre || activeCustomer.email})`
                      : 'Ingresar a mi cuenta'
                  }
                  className={`hidden md:flex min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl border items-center justify-center transition-all active:scale-95 cursor-pointer ${
                    activeCustomer
                      ? 'border-[var(--color-primario)]/50 bg-[var(--color-primario)]/15 text-[var(--color-primario)] ring-1 ring-[var(--color-primario)]/30'
                      : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-texto)]'
                  }`}
                >
                  {activeCustomer ? (
                    <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primario)]" />
                  ) : (
                    <UserRound className="w-4 h-4 sm:w-5 sm:h-5 opacity-90" />
                  )}
                </Link>

                <Link
                  href={withTenant('/tienda/favoritos')}
                  title="Favoritos"
                  aria-label={`Favoritos, ${favorites.length} guardados`}
                  className="hidden md:flex relative min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-texto)] items-center justify-center transition-all active:scale-95 cursor-pointer"
                >
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5 opacity-80" />
                  {favorites.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-[9px] font-bold flex items-center justify-center shadow-xs">
                      {favorites.length}
                    </span>
                  )}
                </Link>
              </>
            )}

            {mostrar_carrito && (
              <button
                type="button"
                onClick={toggleCart}
                aria-label={`Abrir carrito con ${totalItems} productos`}
                className="min-h-[40px] h-10 px-2.5 sm:px-3 rounded-xl border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primario-legible)]" />
                {!isMobile && <span className="hidden sm:inline text-xs font-semibold">Mi carrito</span>}
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {totalItems}
                </span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* DISPOSICIÓN 2: LOGO A LA IZQUIERDA (Estilo E-commerce Clásico) */
        <div className={`wrap items-center gap-2 sm:gap-4 py-4 sm:py-5 ${
          isMobile
            ? 'flex justify-between'
            : 'grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[1fr_1.3fr_1fr]'
        }`}>
          {/* Izquierda: Botón Menú Mobile + Logo / Marca */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <button
              type="button"
              className={`min-w-[40px] min-h-[40px] -ml-2 rounded-xl items-center justify-center text-[var(--color-texto)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer ${
                isMobile ? 'flex' : 'flex md:hidden'
              }`}
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú de navegación'}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {renderLogoAndBrand(false)}
          </div>

          {/* Centro: Buscador de productos (Desktop) */}
          {!isMobile && (mostrar_buscador ? renderSearchBar('w-full') : <div />)}

          {/* Derecha: Acciones */}
          <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-3">
            {mostrar_tema_toggle && <ThemeToggle />}

            {!isMobile && (
              <>
                <Link
                  href={withTenant('/tienda/cuenta')}
                  title={
                    activeCustomer
                      ? `Mi cuenta (${activeCustomer.nombre || activeCustomer.email}) - Conectado`
                      : 'Ingresar a mi cuenta'
                  }
                  aria-label={
                    activeCustomer
                      ? `Mi cuenta (${activeCustomer.nombre || activeCustomer.email})`
                      : 'Ingresar a mi cuenta'
                  }
                  className={`hidden md:flex min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl border items-center justify-center transition-all active:scale-95 cursor-pointer ${
                    activeCustomer
                      ? 'border-[var(--color-primario)]/50 bg-[var(--color-primario)]/15 text-[var(--color-primario)] ring-1 ring-[var(--color-primario)]/30'
                      : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-texto)]'
                  }`}
                >
                  {activeCustomer ? (
                    <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primario)]" />
                  ) : (
                    <UserRound className="w-4 h-4 sm:w-5 sm:h-5 opacity-90" />
                  )}
                </Link>

                <Link
                  href={withTenant('/tienda/favoritos')}
                  title="Favoritos"
                  aria-label={`Favoritos, ${favorites.length} guardados`}
                  className="hidden md:flex relative min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-texto)] items-center justify-center transition-all active:scale-95 cursor-pointer"
                >
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5 opacity-80" />
                  {favorites.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-[9px] font-bold flex items-center justify-center shadow-xs">
                      {favorites.length}
                    </span>
                  )}
                </Link>
              </>
            )}

            {mostrar_carrito && (
              <button
                type="button"
                onClick={toggleCart}
                aria-label={`Abrir carrito con ${totalItems} productos`}
                className="min-h-[40px] h-10 px-2.5 sm:px-3 rounded-xl border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primario-legible)]" />
                {!isMobile && <span className="hidden sm:inline text-xs font-semibold">Mi carrito</span>}
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {totalItems}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Menú Desplegable Mobile */}
      {mobileMenuOpen && (
        <div
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-fondo) 92%, transparent)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
          className="border-t border-black/10 dark:border-white/10 px-4 py-5 md:hidden animate-in slide-in-from-top-2 duration-200"
        >
          {mostrar_buscador && (
            <form onSubmit={handleSearchSubmit} className="mb-5 flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  aria-label="Buscar productos en móvil"
                  placeholder="Buscar productos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 rounded-xl border border-black/15 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.04] pl-3.5 pr-8 text-xs outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      const base = `/tienda`
                      router.push(`${base}${tenantQuery}`)
                    }}
                    aria-label="Limpiar búsqueda"
                    className="absolute inset-y-0 right-2 my-auto h-6 w-6 flex items-center justify-center opacity-50 hover:opacity-100 cursor-pointer text-[var(--color-texto)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                aria-label="Ejecutar búsqueda"
                className="h-11 w-11 shrink-0 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
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
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-primario)]/15 text-[var(--color-primario-legible)] font-semibold">
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
              className={`py-2.5 px-3 rounded-lg flex items-center justify-between ${
                activeCustomer
                  ? 'bg-[var(--color-primario)]/10 text-[var(--color-primario)] font-semibold'
                  : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                {activeCustomer ? (
                  <UserCheck className="w-4 h-4 text-[var(--color-primario)]" />
                ) : (
                  <UserRound className="w-4 h-4 opacity-70" />
                )}
                <span>Mi cuenta</span>
                {activeCustomer && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-primario)]/15 text-[var(--color-primario)] font-medium">
                    Conectado
                  </span>
                )}
              </div>
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
