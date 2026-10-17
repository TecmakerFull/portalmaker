// =============================================================================
// PORTALMAKER — Sección 4: Hero / Banners Promocionales Minimalista (Estilo TiendaDemo)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { StoreSection, HeroBannerSettings, HeroBannerSlide } from '@/types/database'
import { ChevronLeft, ChevronRight, ArrowRight, ArrowUpRight, Star } from 'lucide-react'
import { usePreviewDevice } from '../preview-context'

interface HeroBannersProps {
  section?: StoreSection<HeroBannerSettings, HeroBannerSlide[]> | null
  storeName?: string
  storeSlogan?: string | null
  tenantQuery: string
}

export default function HeroBanners({
  section,
  storeName = 'Tienda',
  storeSlogan,
  tenantQuery,
}: HeroBannersProps) {
  // Slides activos configurados por el dueño de la tienda
  const now = new Date().getTime()
  const configuredSlides = (section?.content || []).filter((slide) => {
    if (!slide.activo) return false
    if (slide.fecha_desde && new Date(slide.fecha_desde).getTime() > now) return false
    if (slide.fecha_hasta && new Date(slide.fecha_hasta).getTime() < now) return false
    return true
  })

  // Si no hay slides configurados o la sección está vacía, creamos el slide por defecto con banner.png
  const defaultSlide: HeroBannerSlide = {
    id: 'default-hero-demo',
    imagen_desktop: '/banner.png',
    imagen_mobile: '/banner.png',
    subtitulo: 'NUEVA COLECCIÓN · 2026',
    texto_adicional: 'OBJETOS CON INTENCIÓN. ESPACIOS CON ALMA.',
    titulo: storeSlogan || 'Diseño para tu día a día.',
    cta_texto: 'Explorar colección',
    cta_url: '/tienda',
    activo: true,
  }

  // Si la sección está explícitamente deshabilitada y hay slides configurados, respetamos el apagado
  if (section && section.enabled === false && configuredSlides.length > 0) {
    return null
  }

  const slides: HeroBannerSlide[] =
    configuredSlides.length > 0 ? configuredSlides : [defaultSlide]

  const count = slides.length
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const {
    autoplay = true,
    intervalo_segundos = 5,
    pausar_hover = true,
  } = section?.settings || {}

  const nextSlide = useCallback(() => {
    if (count <= 1) return
    setCurrentIndex((prev) => (prev + 1) % count)
  }, [count])

  const prevSlide = useCallback(() => {
    if (count <= 1) return
    setCurrentIndex((prev) => (prev - 1 + count) % count)
  }, [count])

  useEffect(() => {
    if (count <= 1 || !autoplay || isPaused) return
    const timer = setInterval(() => {
      nextSlide()
    }, Math.max(intervalo_segundos * 1000, 3000))
    return () => clearInterval(timer)
  }, [count, autoplay, intervalo_segundos, isPaused, nextSlide])

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

  const formatUrl = (url?: string | null) => {
    if (!url) return '/tienda'
    if (url.startsWith('http')) return url
    if (tenantQuery) {
      const sep = url.includes('?') ? '&' : '?'
      return `${url}${sep}${tenantQuery.replace('?', '')}`
    }
    return url
  }

  const previewDevice = usePreviewDevice()
  const isMobile = previewDevice === 'mobile'

  const currentSlide = slides[currentIndex] || defaultSlide
  const heroImage = (isMobile && currentSlide.imagen_mobile)
    ? currentSlide.imagen_mobile
    : (currentSlide.imagen_desktop || currentSlide.imagen_mobile || '/banner.png')

  return (
    <section
      aria-label="Presentación destacada de la tienda"
      onMouseEnter={() => pausar_hover && setIsPaused(true)}
      onMouseLeave={() => pausar_hover && setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative h-[420px] sm:h-[480px] lg:h-[500px] max-h-[520px] overflow-hidden bg-black/[0.03] dark:bg-white/[0.04] transition-colors"
    >
      {/* Imagen de fondo / producto destacada con altura limitada y object-cover */}
      <img
        src={heroImage}
        alt={currentSlide.titulo || 'Hero banner de la tienda'}
        className="absolute inset-0 w-full h-full object-cover object-center opacity-70 sm:opacity-90 dark:opacity-40 pointer-events-none"
        fetchPriority="high"
      />

      {/* Degradado suave para asegurar contraste del texto */}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-fondo)] via-[var(--color-fondo)]/85 to-transparent sm:w-3/4 pointer-events-none" />

      {/* Contenido Hero con altura ajustada */}
      <div className="wrap relative z-10 py-8 sm:py-12 flex flex-col justify-center h-full">
        <div className="max-w-[480px] space-y-4">
          {/* Badge Pill */}
          <span className="hero-pill text-[var(--color-texto)] border-black/20 dark:border-white/20 truncate max-w-full inline-flex">
            <span className="hero-dot" />
            <span className="truncate">{currentSlide.subtitulo || 'NUEVA COLECCIÓN · 2026'}</span>
          </span>

          {/* Eyebrow Pre-título con contraste accesible y truncate */}
          <p className="text-[11px] font-semibold tracking-wider uppercase text-[var(--color-primario-legible)] truncate max-w-full">
            {currentSlide.texto_adicional || 'OBJETOS CON INTENCIÓN. ESPACIOS CON ALMA.'}
          </p>

          {/* Título Principal con límite de 2 líneas */}
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-semibold tracking-tight font-[var(--font-heading)] text-[var(--color-texto)] leading-[1.15] line-clamp-2 max-w-[500px]">
            {currentSlide.titulo || storeSlogan || 'Diseño para tu día a día.'}
          </h1>

          {/* Descripción con límite de 2-3 líneas */}
          <p className="text-xs sm:text-sm leading-relaxed opacity-75 max-w-[400px] text-[var(--color-texto)] line-clamp-2 sm:line-clamp-3">
            Piezas que combinan forma y función. Descubre una selección cuidada
            que hace de lo cotidiano algo extraordinario.
          </p>

          {/* Botones de Acción */}
          <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6">
            <Link
              href={formatUrl(currentSlide.cta_url || '/tienda')}
              className="min-h-[44px] h-11 px-6 rounded-full bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-xs sm:text-sm font-semibold hover:opacity-95 active:scale-98 transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <span>{currentSlide.cta_texto || 'Explorar colección'}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              href={formatUrl('/tienda/sobre-nosotros')}
              className="text-xs sm:text-sm font-semibold underline decoration-[var(--color-primario-legible)]/40 underline-offset-4 hover:decoration-[var(--color-primario-legible)] text-[var(--color-texto)] inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Nuestra esencia</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
            </Link>
          </div>

          {/* Social Proof / Reseñas ilustrativas */}
          <div className="pt-4 flex items-center gap-3">
            <div className="flex -space-x-2" aria-hidden="true">
              <span className="grid size-7 place-items-center rounded-full border-2 border-[var(--color-fondo)] bg-[var(--color-primario)] text-[8px] font-bold text-[var(--color-primario-texto)]">
                MC
              </span>
              <span className="grid size-7 place-items-center rounded-full border-2 border-[var(--color-fondo)] bg-black/20 dark:bg-white/20 text-[8px] font-bold">
                AL
              </span>
              <span className="grid size-7 place-items-center rounded-full border-2 border-[var(--color-fondo)] bg-black/10 dark:bg-white/10 text-[8px] font-bold">
                JR
              </span>
            </div>

            <div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className="w-3 h-3 fill-[var(--color-primario)] text-[var(--color-primario)]"
                  />
                ))}
              </div>
              <p className="mt-0.5 text-[9px] sm:text-[10px] opacity-75 font-medium">
                Pequeños detalles. Grandes experiencias.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Indicadores de slides si hay más de 1 */}
      {count > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Ir al banner ${idx + 1}`}
              className={`transition-all rounded-full cursor-pointer ${
                idx === currentIndex
                  ? 'w-7 h-1.5 bg-[var(--color-primario)]'
                  : 'w-1.5 h-1.5 bg-[var(--color-primario)]/30 hover:bg-[var(--color-primario)]/60'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
