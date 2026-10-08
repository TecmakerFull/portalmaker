// =============================================================================
// PORTALMAKER — Orquestador de Cabecera y Navegación Modular de Storefront
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import type { Store } from '@/types/database'
import type { ResolvedStoreSections } from '@/lib/store-sections'
import TopBar from './top-bar'
import MainHeader from './main-header'
import StoreNavbar from './store-navbar'

interface StorefrontHeaderFlowProps {
  store: Store
  resolvedSections: ResolvedStoreSections
  tenantQuery: string
}

export default function StorefrontHeaderFlow({
  store,
  resolvedSections,
  tenantQuery,
}: StorefrontHeaderFlowProps) {
  const { top_bar, header, navbar, sectionsList } = resolvedSections

  // Filtrar y ordenar las secciones superiores (top_bar, header, navbar)
  const headerSectionTypes = ['top_bar', 'header', 'navbar']
  const sortedUpperSections = (sectionsList || [])
    .filter((sec) => headerSectionTypes.includes(sec.section_type))
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))

  return (
    <div className="w-full flex flex-col">
      {sortedUpperSections.map((sec) => {
        if (!sec.enabled) return null

        if (sec.section_type === 'top_bar') {
          return (
            <TopBar
              key="section-top-bar"
              section={top_bar}
              tenantQuery={tenantQuery}
            />
          )
        }

        if (sec.section_type === 'header') {
          return (
            <MainHeader
              key="section-main-header"
              store={store}
              settings={header.settings}
              tenantQuery={tenantQuery}
            />
          )
        }

        if (sec.section_type === 'navbar') {
          return (
            <StoreNavbar
              key="section-store-navbar"
              section={navbar}
              tenantQuery={tenantQuery}
            />
          )
        }

        return null
      })}
    </div>
  )
}
