// =============================================================================
// PORTALMAKER — Sección 3: Navbar / Barra de Navegación Minimalista (Estilo TiendaDemo)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { StoreSection, NavbarSettings, NavbarItem } from '@/types/database'
import { ChevronDown, Sparkles } from 'lucide-react'

interface StoreNavbarProps {
  section: StoreSection<NavbarSettings, NavbarItem[]>
  tenantQuery: string
}

export default function StoreNavbar({ section, tenantQuery }: StoreNavbarProps) {
  const pathname = usePathname()

  if (!section || !section.enabled) return null

  const items = (section.content || []).filter((it) => it.activo)
  if (items.length === 0) return null

  const { sticky = false } = section.settings || {}

  // Helper para armar URL con tenant query
  const formatUrl = (url: string) => {
    if (!url) return '/tienda'
    if (url.startsWith('http')) return url
    if (tenantQuery) {
      const sep = url.includes('?') ? '&' : '?'
      return `${url}${sep}${tenantQuery.replace('?', '')}`
    }
    return url
  }

  // Separar enlaces principales (catálogo, categorías, ofertas) de los secundarios (nosotros, contacto)
  const mainItems = items.filter(
    (it) => !it.destino_url.includes('sobre-nosotros') && !it.destino_url.includes('contacto')
  )
  const secondaryItems = items.filter(
    (it) => it.destino_url.includes('sobre-nosotros') || it.destino_url.includes('contacto')
  )

  const renderLink = (item: NavbarItem) => {
    const destUrl = formatUrl(item.destino_url)
    const isExternal = destUrl.startsWith('http')
    const cleanDest = (item.destino_url || '/tienda').split('?') [0]
    const isActive =
      !isExternal &&
      (cleanDest === '/tienda'
        ? pathname === '/tienda' || pathname.startsWith('/tienda/productos')
        : pathname.startsWith(cleanDest))

    const isSale = item.destacado || item.badge_texto?.toLowerCase().includes('sale') || item.badge_texto?.toLowerCase().includes('oferta')

    const inner = (
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <span>{item.texto}</span>
        {item.badge_texto && (
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
              isSale
                ? 'bg-[var(--color-primario)]/15 text-[var(--color-primario-legible)]'
                : 'bg-black/10 dark:bg-white/10 text-[var(--color-texto)]'
            }`}
          >
            {item.badge_texto}
          </span>
        )}
      </span>
    )

    const linkClasses = `relative text-[13px] font-medium transition-colors py-3.5 ${
      isActive
        ? 'text-[var(--color-primario-legible)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[var(--color-primario-legible)]'
        : 'text-[var(--color-texto)] opacity-75 hover:opacity-100 hover:text-[var(--color-primario-legible)]'
    }`

    if (isExternal) {
      return (
        <a
          key={item.id}
          href={destUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClasses}
        >
          {inner}
        </a>
      )
    }

    return (
      <Link key={item.id} href={destUrl} className={linkClasses}>
        {inner}
      </Link>
    )
  }

  return (
    <div
      className={`border-b border-black/10 dark:border-white/10 bg-[var(--color-fondo)]/90 backdrop-blur-xs transition-colors duration-200 z-20 ${
        sticky ? 'sticky top-16 sm:top-20' : 'relative'
      }`}
    >
      <nav
        aria-label="Navegación principal de la tienda"
        className="wrap flex h-[48px] sm:h-[51px] items-center justify-between overflow-x-auto scrollbar-none"
      >
        {/* Enlaces Principales a la izquierda */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link
            href={formatUrl('/tienda')}
            className={`relative text-[13px] font-medium transition-colors py-3.5 whitespace-nowrap ${
              pathname === '/tienda'
                ? 'text-[var(--color-primario-legible)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[var(--color-primario-legible)]'
                : 'text-[var(--color-texto)] opacity-75 hover:opacity-100 hover:text-[var(--color-primario-legible)]'
            }`}
          >
            Inicio
          </Link>

          {mainItems.map((item) => renderLink(item))}
        </div>

        {/* Enlaces Secundarios a la derecha (Sobre nosotros, Contacto, Idioma/Moneda) */}
        <div className="hidden md:flex items-center gap-6 shrink-0 pl-4">
          {secondaryItems.map((item) => renderLink(item))}

          <span className="hidden lg:flex items-center text-[11px] opacity-60 font-medium cursor-default">
            Español · ARS <ChevronDown className="ml-1.5 w-3 h-3 opacity-60" />
          </span>
        </div>
      </nav>
    </div>
  )
}
