// =============================================================================
// PORTALMAKER — Galería Interactiva de Producto con Zoom y Navegación
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  ImageIcon,
} from 'lucide-react'

interface ProductGalleryProps {
  images: string[]
  productName: string
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isZoomOpen, setIsZoomOpen] = useState(false)

  const hasMultiple = images.length > 1

  const handlePrev = useCallback(() => {
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }, [images.length])

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }, [images.length])

  // Navegación por teclado en modo Zoom
  useEffect(() => {
    if (!isZoomOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsZoomOpen(false)
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isZoomOpen, handlePrev, handleNext])

  // Sin imágenes
  if (!images || images.length === 0) {
    return (
      <div className="aspect-square w-full max-h-[360px] sm:max-h-[420px] rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center gap-2 opacity-40">
        <ImageIcon className="w-12 h-12" />
        <span className="text-xs">Sin fotos disponibles</span>
      </div>
    )
  }

  const currentImage = images[selectedIndex] || images[0]

  return (
    <>
      <div className="space-y-3.5">
        {/* Contenedor de la Imagen Principal */}
        <div className="relative group w-full max-h-[360px] sm:max-h-[420px] aspect-square sm:aspect-[4/3] rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center justify-center">
          <img
            src={currentImage}
            alt={`${productName} - Vista ${selectedIndex + 1}`}
            onClick={() => setIsZoomOpen(true)}
            className="w-full h-full object-contain cursor-zoom-in transition-transform duration-200 group-hover:scale-[1.02]"
          />

          {/* Flechas Laterales de Navegación */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handlePrev()
                }}
                aria-label="Imagen anterior"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center shadow-md backdrop-blur-xs transition-all active:scale-95 cursor-pointer z-10"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleNext()
                }}
                aria-label="Imagen siguiente"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center shadow-md backdrop-blur-xs transition-all active:scale-95 cursor-pointer z-10"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Botón Tocar para Ampliar (Esquina Superior Derecha) */}
          <button
            type="button"
            onClick={() => setIsZoomOpen(true)}
            aria-label="Ampliar imagen"
            title="Tocar para ampliar"
            className="absolute top-2.5 right-2.5 min-h-[44px] px-3 py-2 rounded-xl bg-black/60 hover:bg-black/85 text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer z-10"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ampliar</span>
          </button>

          {/* Indicador de posición (ej: 1/4) */}
          {hasMultiple && (
            <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/60 text-white text-[11px] font-medium backdrop-blur-xs">
              {selectedIndex + 1} / {images.length}
            </span>
          )}
        </div>

        {/* Tira de Miniaturas Inferiores */}
        {hasMultiple && (
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {images.map((url: string, i: number) => {
              const isActive = i === selectedIndex
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedIndex(i)}
                  aria-label={`Ver vista ${i + 1}`}
                  className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border transition-all cursor-pointer bg-black/5 ${
                    isActive
                      ? 'border-[var(--color-primario)] ring-2 ring-[var(--color-primario)]/30 scale-95 shadow-xs'
                      : 'border-black/10 dark:border-white/10 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={url}
                    alt={`Miniatura ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Lightbox Fullscreen al tocar para ampliar */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsZoomOpen(false)}
        >
          {/* Botón de Cierre */}
          <button
            type="button"
            onClick={() => setIsZoomOpen(false)}
            aria-label="Cerrar ampliación"
            className="absolute top-4 right-4 min-w-[44px] min-h-[44px] rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer z-50"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Contador en el Modal */}
          {hasMultiple && (
            <div className="absolute top-5 left-5 text-white text-xs font-semibold px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-xs">
              {selectedIndex + 1} de {images.length}
            </div>
          )}

          {/* Imagen Ampliada */}
          <div
            className="relative max-w-5xl max-h-[85vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImage}
              alt={`${productName} - Vista ampliada`}
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl select-none"
            />

            {/* Flechas dentro del Lightbox */}
            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Imagen anterior"
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 min-w-[48px] min-h-[48px] rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-all active:scale-95 cursor-pointer z-50"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Imagen siguiente"
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 min-w-[48px] min-h-[48px] rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-all active:scale-95 cursor-pointer z-50"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
