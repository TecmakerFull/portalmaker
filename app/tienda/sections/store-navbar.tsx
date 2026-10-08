// =============================================================================
// PORTALMAKER — Sección 3: Navbar / Menú de Navegación Dinámico
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { StoreSection, NavbarSettings, NavbarItem } from '@/types/database'
import { Sparkles, Flame } from 'lucide-react'

interface StoreNavbarProps {
  section: StoreSection<NavbarSettings, NavbarItem[]>
  tenantQuery: string
}

export default function StoreNavbar({ section, tenantQuery }: StoreNavbarProps) {
  const pathname = usePathname()

  if (!section || !section.enabled) return null

  const items = (section.content || []).filter((it) => it.activo)
  if (items.length === 0) return null

  const {
    alineacion = 'centro',
    estilo = 'linea',
    sticky = false,
  } = section.settings || {}

  let alignClass = 'justify-center'
  if (alineacion === 'izquierda') alignClass = 'justify-start'
  else if (alineacion === 'espaciado') alignClass = 'justify-between'

  // Formatear destino con tenant query
  const formatUrl = (url: string) => {
    if (!url) return '/tienda'
    if (url.startsWith('http')) return url
    if (tenantQuery) {
      const sep = url.includes('?') ? '&' : '?'
      return `${url}${sep}${tenantQuery.replace('?', '')}`
    }
    return url
  }

  return (
    <nav
      aria-label="Navegación principal de la tienda"
      className={`border-b border-black/5 dark:border-white/5 bg-[var(--color-fondo)]/90 backdrop-blur-xs transition-colors duration-200 z-20 ${
        sticky ? 'sticky top-20 sm:top-24' : 'relative'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div
          className={`flex items-center gap-2 sm:gap-6 py-2.5 overflow-x-auto scrollbar-none text-xs sm:text-sm font-semibold ${alignClass}`}
        >
          {items.map((item, idx) => {
            const destUrl = formatUrl(item.destino_url)
            const isExternal = destUrl.startsWith('http')
            const isActive =
              !isExternal &&
              (destUrl === `/tienda${tenantQuery}` || destUrl === '/tienda'
                ? pathname === '/tienda'
                : pathname.includes(item.destino_url.split('?')[0]))

            const isPill = estilo === 'pills'

            const baseStyle = isPill
              ? `min-h-[40px] px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-[var(--color-primario)] text-white shadow-xs'
                    : item.destacado
                    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25'
                    : 'opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`
              : `min-h-[40px] px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap relative ${
                  isActive
                    ? 'text-[var(--color-primario)] font-bold border-b-2 border-[var(--color-primario)] rounded-b-none'
                    : item.destacado
                    ? 'text-amber-600 dark:text-amber-400 font-bold hover:opacity-100'
                    : 'opacity-70 hover:opacity-100 hover:text-[var(--color-primario)]'
                }`

            const content = (
              <>
                {item.destacado && (
                  <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <span>{item.texto}</span>
                {item.badge_texto && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-amber-500 text-white shadow-xs">
                    {item.badge_texto}
                  </span>
                )}
              </>
            )

            if (isExternal) {
              return (
                <a
                  key={item.id || idx}
                  href={destUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={baseStyle}
                >
                  {content}
                </a>
              )
            }

            return (
              <Link key={item.id || idx} href={destUrl} className={baseStyle}>
                {content}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
