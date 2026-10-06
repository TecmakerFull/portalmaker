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
  selectedImageOverride?: string | null
}

export default function ProductGallery({
  images,
  productName,
  selectedImageOverride,
}: ProductGalleryProps) {
  // Asegurar que si la imagen de la variante no está en el listado base, se incluya al inicio
  const displayImages =
    selectedImageOverride && !images.includes(selectedImageOverride)
      ? [selectedImageOverride, ...images]
      : images

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isZoomOpen, setIsZoomOpen] = useState(false)

  // Sincronizar selección de variante con la imagen activa de la galería
  useEffect(() => {
    if (selectedImageOverride) {
      const idx = displayImages.findIndex((img) => img === selectedImageOverride)
      if (idx !== -1) {
        setSelectedIndex(idx)
      }
    }
  }, [selectedImageOverride, displayImages])

  const hasMultiple = displayImages.length > 1

  const handlePrev = useCallback(() => {
    setSelectedIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1))
  }, [displayImages.length])

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1))
  }, [displayImages.length])

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
  if (!displayImages || displayImages.length === 0) {
    return (
      <div className="aspect-square w-full max-h-[360px] sm:max-h-[420px] rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center gap-2 opacity-40">
        <ImageIcon className="w-12 h-12" />
        <span className="text-xs">Sin fotos disponibles</span>
      </div>
    )
  }

  const currentImage = displayImages[selectedIndex] || displayImages[0]

  return (
    <>
      <div className="space-y-3.5">
        {/* Contenedor de la Imagen Principal (Lleno al 100% sin márgenes grises) */}
        <div className="relative group w-full aspect-square rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center justify-center">
          <img
            src={currentImage}
            alt={`${productName} - Vista ${selectedIndex + 1}`}
            onClick={() => setIsZoomOpen(true)}
            className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300 group-hover:scale-105"
          />

          {/* Flechas Laterales de Navegación dentro de la imagen */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handlePrev()
                }}
                aria-label="Imagen anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 min-w-[42px] min-h-[42px] rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center shadow-md backdrop-blur-xs transition-all active:scale-95 cursor-pointer z-10"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[42px] min-h-[42px] rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center shadow-md backdrop-blur-xs transition-all active:scale-95 cursor-pointer z-10"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Botón Tocar para Ampliar (Solo icono sutil en la esquina superior) */}
          <button
            type="button"
            onClick={() => setIsZoomOpen(true)}
            aria-label="Ampliar imagen"
            title="Tocar para ampliar"
            className="absolute top-3 right-3 min-w-[40px] min-h-[40px] rounded-xl bg-black/50 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs shadow-sm transition-all active:scale-95 cursor-pointer z-10"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Indicador de posición (ej: 2/3) */}
          {hasMultiple && (
            <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/50 text-white text-[11px] font-medium backdrop-blur-xs">
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
