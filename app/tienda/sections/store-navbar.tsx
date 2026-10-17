// =============================================================================
// PORTALMAKER — Sección 3: Navbar / Barra de Navegación Minimalista (Estilo TiendaDemo)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { StoreSection, NavbarSettings, NavbarItem } from '@/types/database'
import { ChevronDown } from 'lucide-react'
import { usePreviewDevice } from '../preview-context'

interface StoreNavbarProps {
  section: StoreSection<NavbarSettings, NavbarItem[]>
  tenantQuery: string
}

export default function StoreNavbar(props: StoreNavbarProps) {
  return (
    <Suspense fallback={<div className="h-[48px] sm:h-[51px] border-b border-black/10 dark:border-white/10 bg-[var(--color-fondo)]/90" />}>
      <StoreNavbarInner {...props} />
    </Suspense>
  )
}

function StoreNavbarInner({ section, tenantQuery }: StoreNavbarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (!section || !section.enabled) return null

  const items = (section.content || []).filter((it) => it.activo)
  if (items.length === 0) return null

  const {
    alineacion = 'centro',
    estilo = 'linea',
    sticky = false,
  } = section.settings || {}

  const previewDevice = usePreviewDevice()
  const isMobile = previewDevice === 'mobile'

  const isPills = estilo === 'pills'

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

  // Verificar si ya existe un link explícito a Inicio
  const hasExplicitHome = items.some(
    (it) => it.texto.toLowerCase().trim() === 'inicio' || it.destino_url === '/tienda'
  )

  // Lista unificada de items a renderizar
  const navItemsToRender: NavbarItem[] = []

  // Si no hay ningún ítem que apunte a Inicio en la lista personalizada, agregamos el Inicio por defecto
  if (!hasExplicitHome) {
    navItemsToRender.push({
      id: 'default-home-link',
      texto: 'Inicio',
      tipo_destino: 'catalogo',
      destino_url: '/tienda',
      activo: true,
      orden: 0,
    })
  }

  navItemsToRender.push(...items)

  // Separar enlaces según tipo para distribución si es espaciado
  const mainItems = navItemsToRender.filter(
    (it) => !it.destino_url.includes('sobre-nosotros') && !it.destino_url.includes('contacto')
  )
  const secondaryItems = navItemsToRender.filter(
    (it) => it.destino_url.includes('sobre-nosotros') || it.destino_url.includes('contacto')
  )

  // Determinar cuál es el ítem activo de forma unívoca (solo uno a la vez)
  const hasCategoryOrSearch = searchParams.has('categoria') || searchParams.has('q')
  const isProductDetail = pathname.startsWith('/tienda/productos')

  const getIsActive = (item: NavbarItem) => {
    const cleanDest = (item.destino_url || '/tienda').split('?')[0]
    const isExternal = item.destino_url.startsWith('http')
    if (isExternal) return false

    const isHomeItem = item.texto.toLowerCase().trim() === 'inicio'
    const isCatalogItem =
      item.texto.toLowerCase().trim() === 'productos' ||
      item.tipo_destino === 'catalogo' ||
      cleanDest === '/tienda'

    // Si estamos en la portada (/tienda) sin filtros ni productos
    if (pathname === '/tienda' && !hasCategoryOrSearch && !isProductDetail) {
      if (hasExplicitHome) {
        return isHomeItem
      }
      // Si no hay link de "Inicio" separado, el catálogo es el activo
      return isCatalogItem
    }

    // Si estamos navegando categorías, buscando o en detalle de producto
    if (hasCategoryOrSearch || isProductDetail) {
      if (isHomeItem) return false
      if (item.tipo_destino === 'categoria') {
        const catVal = searchParams.get('categoria')
        return item.destino_valor === catVal || item.destino_url.includes(`categoria=${catVal}`)
      }
      return isCatalogItem
    }

    // Páginas específicas (Sobre nosotros, Contacto, etc.)
    if (cleanDest !== '/tienda') {
      return pathname.startsWith(cleanDest)
    }

    return false
  }

  const renderLink = (item: NavbarItem) => {
    const destUrl = formatUrl(item.destino_url)
    const isExternal = destUrl.startsWith('http')
    const isActive = getIsActive(item)
    const isSale =
      item.destacado ||
      item.badge_texto?.toLowerCase().includes('sale') ||
      item.badge_texto?.toLowerCase().includes('oferta')

    const inner = (
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <span>{item.texto}</span>
        {item.badge_texto && (
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
              isSale
                ? isPills && isActive
                  ? 'bg-black/20 text-current'
                  : 'bg-[var(--color-primario)]/15 text-[var(--color-primario-legible)]'
                : 'bg-black/10 dark:bg-white/10 text-current'
            }`}
          >
            {item.badge_texto}
          </span>
        )}
      </span>
    )

    let linkClasses = ''
    if (isPills) {
      // Estilo Pastillas (Pills)
      linkClasses = `inline-flex items-center justify-center text-xs sm:text-[13px] font-medium transition-all px-3.5 py-1.5 rounded-full select-none cursor-pointer ${
        isActive
          ? 'bg-[var(--color-primario)] text-[var(--color-primario-texto)] shadow-xs font-semibold'
          : 'text-[var(--color-texto)] opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10'
      }`
    } else {
      // Estilo Línea (Subrayado sutil clásico)
      linkClasses = `relative text-[13px] font-medium transition-colors py-3.5 select-none cursor-pointer ${
        isActive
          ? 'text-[var(--color-primario-legible)] font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[var(--color-primario-legible)]'
          : 'text-[var(--color-texto)] opacity-75 hover:opacity-100 hover:text-[var(--color-primario-legible)]'
      }`
    }

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
      <Link key={item.id} href={destUrl} prefetch={true} className={`${linkClasses} active:scale-[0.98]`}>
        {inner}
      </Link>
    )
  }

  // Clases según alineación configurada
  let navJustifyClass = 'justify-center'
  let listJustifyClass = 'justify-center'

  if (alineacion === 'izquierda') {
    navJustifyClass = 'justify-start'
    listJustifyClass = 'justify-start'
  } else if (alineacion === 'espaciado') {
    navJustifyClass = 'justify-between'
    listJustifyClass = 'justify-between w-full'
  }

  return (
    <div
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-fondo) 84%, transparent)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      className={`border-b border-black/10 dark:border-white/10 transition-colors duration-200 z-20 ${
        sticky ? 'sticky top-16 sm:top-20' : 'relative'
      }`}
    >
      <nav
        aria-label="Navegación principal de la tienda"
        className={`wrap flex h-[48px] sm:h-[51px] items-center ${navJustifyClass} overflow-x-auto scrollbar-none`}
      >
        {alineacion === 'espaciado' ? (
          /* Disposición Espaciada: Enlaces principales a la izquierda y secundarios a la derecha */
          <div className="flex items-center justify-between w-full gap-4">
            <div className={`flex items-center ${isPills ? 'gap-2 sm:gap-2.5' : 'gap-6 sm:gap-8'}`}>
              {mainItems.map((item) => renderLink(item))}
            </div>

            {!isMobile && (
              <div className={`hidden md:flex items-center ${isPills ? 'gap-2 sm:gap-2.5' : 'gap-6 sm:gap-8'} shrink-0 pl-4`}>
                {secondaryItems.map((item) => renderLink(item))}
                <span className="hidden lg:flex items-center text-[11px] opacity-60 font-medium cursor-default">
                  Español · ARS <ChevronDown className="ml-1.5 w-3 h-3 opacity-60" />
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Disposición Centrada o a la Izquierda: Todos los enlaces en un solo bloque fluido */
          <div
            className={`flex items-center ${listJustifyClass} ${
              isPills ? 'gap-1.5 sm:gap-2.5' : 'gap-5 sm:gap-8'
            }`}
          >
            {navItemsToRender.map((item) => renderLink(item))}

            {!isMobile && (
              <span className="hidden lg:flex items-center text-[11px] opacity-60 font-medium cursor-default ml-4 pl-4 border-l border-black/10 dark:border-white/10">
                Español · ARS <ChevronDown className="ml-1.5 w-3 h-3 opacity-60" />
              </span>
            )}
          </div>
        )}
      </nav>
    </div>
  )
}

