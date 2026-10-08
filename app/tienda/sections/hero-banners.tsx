// =============================================================================
// PORTALMAKER — Sección 4: Hero / Banners Promocionales (Mobile & Desktop)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { StoreSection, HeroBannerSettings, HeroBannerSlide } from '@/types/database'
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react'

interface HeroBannersProps {
  section: StoreSection<HeroBannerSettings, HeroBannerSlide[]>
  tenantQuery: string
}

export default function HeroBanners({ section, tenantQuery }: HeroBannersProps) {
  if (!section || !section.enabled) return null

  const now = new Date().getTime()
  const activeSlides = (section.content || []).filter((slide) => {
    if (!slide.activo || !slide.imagen_desktop) return false

    // Validar vigencia de fechas si están definidas
    if (slide.fecha_desde && new Date(slide.fecha_desde).getTime() > now) return false
    if (slide.fecha_hasta && new Date(slide.fecha_hasta).getTime() < now) return false

    return true
  })

  if (activeSlides.length === 0) return null

  const {
    modo = 'carrusel',
    autoplay = true,
    intervalo_segundos = 5,
    mostrar_flechas = true,
    mostrar_indicadores = true,
    pausar_hover = true,
    altura = 'adaptable',
  } = section.settings || {}

  const isSingle = modo === 'banner_unico' || activeSlides.length === 1
  const slides = isSingle ? [activeSlides[0]] : activeSlides
  const count = slides.length

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const nextSlide = useCallback(() => {
    if (count <= 1) return
    setCurrentIndex((prev) => (prev + 1) % count)
  }, [count])

  const prevSlide = useCallback(() => {
    if (count <= 1) return
    setCurrentIndex((prev) => (prev - 1 + count) % count)
  }, [count])

  // Rotación automática
  useEffect(() => {
    if (isSingle || !autoplay || isPaused) return

    const timer = setInterval(() => {
      nextSlide()
    }, Math.max(intervalo_segundos * 1000, 2500))

    return () => clearInterval(timer)
  }, [isSingle, autoplay, intervalo_segundos, isPaused, nextSlide])

  // Gestos táctiles
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 40) {
      if (diff > 0) nextSlide()
      else prevSlide()
    }
    touchStartX.current = null
    touchEndX.current = null
  }

  // Altura configurable
  let heightClass = 'aspect-[16/8] sm:aspect-[21/8] md:aspect-[3/1] max-h-[500px]'
  if (altura === 'compacta') {
    heightClass = 'aspect-[16/6] sm:aspect-[24/7] md:aspect-[4/1] max-h-[380px]'
  } else if (altura === 'pantalla_completa') {
    heightClass = 'min-h-[420px] sm:min-h-[540px]'
  }

  const formatUrl = (url?: string | null) => {
    if (!url) return null
    if (url.startsWith('http')) return url
    if (tenantQuery) {
      const sep = url.includes('?') ? '&' : '?'
      return `${url}${sep}${tenantQuery.replace('?', '')}`
    }
    return url
  }

  return (
    <section
      aria-label="Banners y promociones destacadas"
      onMouseEnter={() => pausar_hover && setIsPaused(true)}
      onMouseLeave={() => pausar_hover && setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full overflow-hidden rounded-3xl border border-black/10 dark:border-white/10 shadow-md bg-black/5 dark:bg-white/5 my-4 sm:my-6 group select-none"
    >
      <div className={`relative w-full ${heightClass}`}>
        {slides.map((slide, idx) => {
          const isActive = idx === currentIndex
          const ctaUrl = formatUrl(slide.cta_url)
          const isExternal = ctaUrl?.startsWith('http')

          return (
            <div
              key={slide.id || idx}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
              }`}
            >
              {/* Imagen Responsiva (Desktop vs Mobile) */}
              <picture className="w-full h-full block">
                {slide.imagen_mobile && (
                  <source
                    media="(max-width: 640px)"
                    srcSet={slide.imagen_mobile}
                  />
                )}
                <img
                  src={slide.imagen_desktop}
                  alt={slide.titulo || `Banner ${idx + 1}`}
                  className="w-full h-full object-cover object-center"
                />
              </picture>

              {/* Degradado y Textos */}
              {(slide.titulo || slide.subtitulo || slide.texto_adicional || slide.cta_texto) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-5 sm:p-8 md:p-10 text-white">
                  <div className="max-w-2xl space-y-2">
                    {slide.subtitulo && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white/95 w-fit">
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>{slide.subtitulo}</span>
                      </span>
                    )}

                    {slide.titulo && (
                      <h2 className="text-xl sm:text-3xl md:text-4xl font-bold font-[var(--font-heading)] leading-tight drop-shadow-sm">
                        {slide.titulo}
                      </h2>
                    )}

                    {slide.texto_adicional && (
                      <p className="text-xs sm:text-sm text-white/90 line-clamp-2 drop-shadow-xs max-w-lg">
                        {slide.texto_adicional}
                      </p>
                    )}

                    {/* Botón CTA */}
                    {slide.cta_texto && ctaUrl && (
                      <div className="pt-2">
                        {isExternal ? (
                          <a
                            href={ctaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--color-primario)] text-white text-xs sm:text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg inline-flex items-center gap-2 cursor-pointer"
                          >
                            <span>{slide.cta_texto}</span>
                            <ArrowRight className="w-4 h-4" />
                          </a>
                        ) : (
                          <Link
                            href={ctaUrl}
                            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--color-primario)] text-white text-xs sm:text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg inline-flex items-center gap-2 cursor-pointer"
                          >
                            <span>{slide.cta_texto}</span>
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

      {/* Controles de Navegación */}
      {!isSingle && count > 1 && (
        <>
          {mostrar_flechas && (
            <>
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Banner anterior"
                className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer shadow-md"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={nextSlide}
                aria-label="Banner siguiente"
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer shadow-md"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {mostrar_indicadores && (
            <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md">
              {slides.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={() => setCurrentIndex(dotIdx)}
                  aria-label={`Ir al banner ${dotIdx + 1}`}
                  className="min-h-[24px] min-w-[24px] flex items-center justify-center cursor-pointer"
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
          )}
        </>
      )}
    </section>
  )
}
