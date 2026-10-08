// =============================================================================
// PORTALMAKER — Carrusel Interactivo de Banners Promocionales (Página Pública)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { Banner } from '@/types/database'
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react'

interface BannerCarouselProps {
  banners: Banner[]
  tenantQuery: string
}

export default function BannerCarousel({ banners, tenantQuery }: BannerCarouselProps) {
  const activeBanners = banners.filter((b) => b.activo)
  const count = activeBanners.length

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  // Avanzar al siguiente slide
  const nextSlide = useCallback(() => {
    if (count <= 1) return
    setCurrentIndex((prev) => (prev + 1) % count)
  }, [count])

  // Retroceder al slide anterior
  const prevSlide = useCallback(() => {
    if (count <= 1) return
    setCurrentIndex((prev) => (prev - 1 + count) % count)
  }, [count])

  // Rotación automática cada 5.5 segundos
  useEffect(() => {
    if (count <= 1 || isPaused) return

    const timer = setInterval(() => {
      nextSlide()
    }, 5500)

    return () => clearInterval(timer)
  }, [count, isPaused, nextSlide])

  // Manejo de gestos táctiles (Swipe)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 45) {
      if (diff > 0) nextSlide()
      else prevSlide()
    }
    touchStartX.current = null
    touchEndX.current = null
  }

  if (count === 0) return null

  // Construir URL con tenant si es interna
  const formatCtaUrl = (url: string | null) => {
    if (!url) return null
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    // Agregar tenant query a URLs internas
    if (tenantQuery) {
      const separator = url.includes('?') ? '&' : '?'
      const cleanTenant = tenantQuery.replace('?', '')
      return `${url}${separator}${cleanTenant}`
    }
    return url
  }

  return (
    <section
      aria-label="Promociones y novedades de la tienda"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full overflow-hidden rounded-3xl border border-black/10 dark:border-white/10 shadow-md bg-black/5 dark:bg-white/5 my-4 sm:my-6 group"
    >
      {/* Contenedor de Slides con Aspect Ratio Responsivo */}
      <div className="relative w-full aspect-[16/8] sm:aspect-[21/8] md:aspect-[3/1] max-h-[480px]">
        {activeBanners.map((banner, idx) => {
          const isActive = idx === currentIndex
          const ctaUrl = formatCtaUrl(banner.cta_url)
          const isExternal = ctaUrl?.startsWith('http')

          return (
            <div
              key={banner.id || idx}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
              }`}
            >
              {/* Imagen del Banner */}
              <img
                src={banner.imagen_url}
                alt={banner.titulo || `Banner ${idx + 1}`}
                className="w-full h-full object-cover object-center"
              />

              {/* Degradado para garantizar legibilidad del texto */}
              {(banner.titulo || banner.subtitulo || banner.cta_texto) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent flex flex-col justify-end p-5 sm:p-8 md:p-10 text-white">
                  <div className="max-w-2xl space-y-2">
                    {banner.subtitulo && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white/95 w-fit">
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>{banner.subtitulo}</span>
                      </span>
                    )}

                    {banner.titulo && (
                      <h2 className="text-lg sm:text-2xl md:text-3xl font-bold font-[var(--font-heading)] leading-tight drop-shadow-sm">
                        {banner.titulo}
                      </h2>
                    )}

                    {/* Botón CTA */}
                    {banner.cta_texto && ctaUrl && (
                      <div className="pt-2">
                        {isExternal ? (
                          <a
                            href={ctaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--color-primario)] text-white text-xs sm:text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg inline-flex items-center gap-2 cursor-pointer"
                          >
                            <span>{banner.cta_texto}</span>
                            <ArrowRight className="w-4 h-4" />
                          </a>
                        ) : (
                          <Link
                            href={ctaUrl}
                            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--color-primario)] text-white text-xs sm:text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg inline-flex items-center gap-2 cursor-pointer"
                          >
                            <span>{banner.cta_texto}</span>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Flechas de Navegación (Solo si hay más de 1 slide) */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Slide anterior"
            className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer shadow-md"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={nextSlide}
            aria-label="Slide siguiente"
            className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer shadow-md"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Indicadores de Posición (Dots) con Touch Target Mínimo */}
          <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md">
            {activeBanners.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => setCurrentIndex(dotIdx)}
                aria-label={`Ir al slide ${dotIdx + 1}`}
                className={`min-h-[24px] min-w-[24px] flex items-center justify-center cursor-pointer`}
              >
                <span
                  className={`block rounded-full transition-all duration-300 ${
                    dotIdx === currentIndex
                      ? 'w-6 h-2 bg-[var(--color-primario)] shadow-sm'
                      : 'w-2 h-2 bg-white/60 hover:bg-white'
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
