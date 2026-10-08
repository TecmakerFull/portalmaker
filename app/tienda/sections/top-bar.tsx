// =============================================================================
// PORTALMAKER — Sección 1: Top Bar / Utility Bar (Estático, Rotativo o Ticker)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { StoreSection, TopBarSettings, TopBarMessageItem } from '@/types/database'
import SectionIcon from './section-icon'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface TopBarProps {
  section: StoreSection<TopBarSettings, TopBarMessageItem[]>
  tenantQuery: string
}

export default function TopBar({ section, tenantQuery }: TopBarProps) {
  if (!section || !section.enabled) return null

  const items = (section.content || []).filter((item) => item.activo)
  if (items.length === 0) return null

  const {
    modo = 'rotativo',
    intervalo_segundos = 4,
    velocidad_ticker = 25,
    pausar_hover = true,
    fondo_color = 'primario',
    mostrar_en_mobile = true,
  } = section.settings || {}

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Color de fondo
  let bgClasses = 'bg-[var(--color-primario)] text-white'
  if (fondo_color === 'superficie') {
    bgClasses = 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--color-texto)] border-b border-black/5 dark:border-white/5'
  } else if (fondo_color === 'contraste') {
    bgClasses = 'bg-[#18181B] text-white dark:bg-white dark:text-black'
  }

  // Siguiente mensaje rotativo
  const nextMsg = useCallback(() => {
    if (items.length <= 1) return
    setCurrentIndex((prev) => (prev + 1) % items.length)
  }, [items.length])

  // Anterior mensaje rotativo
  const prevMsg = useCallback(() => {
    if (items.length <= 1) return
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)
  }, [items.length])

  // Temporizador para modo rotativo
  useEffect(() => {
    if (modo !== 'rotativo' || items.length <= 1 || isPaused) return

    const timer = setInterval(() => {
      nextMsg()
    }, Math.max(intervalo_segundos * 1000, 2000))

    return () => clearInterval(timer)
  }, [modo, items.length, intervalo_segundos, isPaused, nextMsg])

  // Formatear Link con tenant query
  const formatUrl = (url?: string | null) => {
    if (!url) return null
    if (url.startsWith('http')) return url
    if (tenantQuery) {
      const sep = url.includes('?') ? '&' : '?'
      return `${url}${sep}${tenantQuery.replace('?', '')}`
    }
    return url
  }

  // Renderizar un mensaje individual
  const renderMessageContent = (item: TopBarMessageItem) => {
    const formattedUrl = formatUrl(item.link_url)
    const inner = (
      <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs font-medium tracking-wide">
        {item.icono && <SectionIcon name={item.icono} className="w-3.5 h-3.5 shrink-0 opacity-90" />}
        <span className="truncate">{item.texto}</span>
      </div>
    )

    if (formattedUrl) {
      const isExternal = formattedUrl.startsWith('http')
      if (isExternal) {
        return (
          <a
            href={formattedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline hover:opacity-95 transition-opacity inline-flex items-center"
          >
            {inner}
          </a>
        )
      }
      return (
        <Link href={formattedUrl} className="hover:underline hover:opacity-95 transition-opacity inline-flex items-center">
          {inner}
        </Link>
      )
    }

    return inner
  }

  return (
    <aside
      aria-label="Barra de avisos y novedades"
      onMouseEnter={() => pausar_hover && setIsPaused(true)}
      onMouseLeave={() => pausar_hover && setIsPaused(false)}
      className={`w-full py-2 px-4 transition-colors duration-200 z-40 relative select-none ${bgClasses} ${
        !mostrar_en_mobile ? 'hidden sm:block' : 'block'
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[22px]">
        {/* MODO 1: TICKER / MARQUEE CONTINUO */}
        {modo === 'ticker' ? (
          <div className="w-full overflow-hidden whitespace-nowrap relative flex">
            <div
              className={`flex items-center gap-10 animate-ticker ${
                isPaused ? 'animation-paused' : ''
              }`}
              style={{
                animationDuration: `${Math.max(velocidad_ticker, 10)}s`,
              }}
            >
              {[...items, ...items, ...items, ...items].map((item, idx) => (
                <div key={idx} className="inline-flex items-center gap-2 shrink-0">
                  {renderMessageContent(item)}
                  <span className="opacity-40">•</span>
                </div>
              ))}
            </div>
          </div>
        ) : modo === 'rotativo' ? (
          /* MODO 2: ROTATIVO (SLIDER DE MENSAJES) */
          <div className="w-full relative flex items-center justify-center">
            {items.length > 1 && (
              <button
                type="button"
                onClick={prevMsg}
                aria-label="Mensaje anterior"
                className="absolute left-0 p-1 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="text-center px-6 animate-in fade-in duration-300">
              {renderMessageContent(items[currentIndex])}
            </div>

            {items.length > 1 && (
              <button
                type="button"
                onClick={nextMsg}
                aria-label="Mensaje siguiente"
                className="absolute right-0 p-1 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          /* MODO 3: ESTÁTICO */
          <div className="flex items-center justify-center flex-wrap gap-4 sm:gap-8">
            {items.map((item, idx) => (
              <div key={item.id || idx}>{renderMessageContent(item)}</div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
