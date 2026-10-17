// =============================================================================
// PORTALMAKER — Editor y Recortador de Logo (Canvas Nativo)
// Permite encuadrar, recortar y escalar el logo antes de guardarlo en Supabase Storage.
// =============================================================================

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Crop,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  RotateCcw,
  Maximize2,
  Loader2,
  Move,
} from 'lucide-react'

interface LogoCropperModalProps {
  imageSrc: string
  onClose: () => void
  onCropComplete: (croppedBlob: Blob) => Promise<void> | void
}

export default function LogoCropperModal({
  imageSrc,
  onClose,
  onCropComplete,
}: LogoCropperModalProps) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [aspectMode, setAspectMode] = useState<'libre' | 'cuadrado' | 'horizontal'>('libre')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Cargar imagen en memoria
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageSrc
    img.onload = () => {
      imageRef.current = img
      setImageLoaded(true)
      setZoom(1)
      setPan({ x: 0, y: 0 })
    }
  }, [imageSrc])

  // Dibujar en el canvas de previsualización
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img || !imageLoaded) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Dibujar fondo transparente tipo cuadrícula sutil
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    // Centrar y aplicar zoom y desplazamiento
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y)
    ctx.scale(zoom, zoom)

    // Calcular escala inicial para ajustar al canvas
    const scale = Math.min(
      (canvas.width * 0.85) / img.naturalWidth,
      (canvas.height * 0.85) / img.naturalHeight
    )
    const drawWidth = img.naturalWidth * scale
    const drawHeight = img.naturalHeight * scale

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
    ctx.restore()

    // Dibujar guía de recorte según aspecto seleccionado
    ctx.save()
    ctx.strokeStyle = '#CA8A04'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])

    let cropW = canvas.width * 0.88
    let cropH = canvas.height * 0.88

    if (aspectMode === 'cuadrado') {
      const side = Math.min(cropW, cropH)
      cropW = side
      cropH = side
    } else if (aspectMode === 'horizontal') {
      cropH = cropW / 2.5
      if (cropH > canvas.height * 0.88) {
        cropH = canvas.height * 0.88
        cropW = cropH * 2.5
      }
    }

    const cropX = (canvas.width - cropW) / 2
    const cropY = (canvas.height - cropH) / 2

    // Marco exterior oscurecido
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
    ctx.fillRect(0, 0, canvas.width, cropY)
    ctx.fillRect(0, cropY + cropH, canvas.width, canvas.height - (cropY + cropH))
    ctx.fillRect(0, cropY, cropX, cropH)
    ctx.fillRect(cropX + cropW, cropY, canvas.width - (cropX + cropW), cropH)

    // Recuadro de recorte
    ctx.strokeRect(cropX, cropY, cropW, cropH)
    ctx.restore()
  }, [imageLoaded, zoom, pan, aspectMode])

  useEffect(() => {
    drawPreview()
  }, [drawPreview])

  // Mouse & Touch Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    })
  }

  const handleTouchEnd = () => setIsDragging(false)

  // Exportar el recorte final
  const handleConfirmCrop = async () => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img || !imageLoaded) return

    setIsProcessing(true)

    try {
      let cropW = canvas.width * 0.88
      let cropH = canvas.height * 0.88

      if (aspectMode === 'cuadrado') {
        const side = Math.min(cropW, cropH)
        cropW = side
        cropH = side
      } else if (aspectMode === 'horizontal') {
        cropH = cropW / 2.5
        if (cropH > canvas.height * 0.88) {
          cropH = canvas.height * 0.88
          cropW = cropH * 2.5
        }
      }

      const cropX = (canvas.width - cropW) / 2
      const cropY = (canvas.height - cropH) / 2

      // Canvas de salida a resolución nítida
      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = Math.round(cropW * 2)
      exportCanvas.height = Math.round(cropH * 2)

      const expCtx = exportCanvas.getContext('2d')
      if (!expCtx) throw new Error('No se pudo inicializar canvas de exportación')

      expCtx.imageSmoothingEnabled = true
      expCtx.imageSmoothingQuality = 'high'

      // Transformaciones correspondientes al recorte
      expCtx.translate(-cropX * 2, -cropY * 2)
      expCtx.translate((canvas.width / 2 + pan.x) * 2, (canvas.height / 2 + pan.y) * 2)
      expCtx.scale(zoom * 2, zoom * 2)

      const scale = Math.min(
        (canvas.width * 0.85) / img.naturalWidth,
        (canvas.height * 0.85) / img.naturalHeight
      )
      const drawWidth = img.naturalWidth * scale
      const drawHeight = img.naturalHeight * scale

      expCtx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)

      // Convertir a WebP blob con transparencia
      exportCanvas.toBlob(
        async (blob) => {
          if (blob) {
            await onCropComplete(blob)
            onClose()
          }
          setIsProcessing(false)
        },
        'image/webp',
        0.92
      )
    } catch (err) {
      console.error('Error al exportar recorte:', err)
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[95vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-borde)]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#FACC15]/20 text-[#CA8A04] flex items-center justify-center">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Ajustar y Recortar Logo</h3>
              <p className="text-xs opacity-70">Arrastra para encuadrar y ajusta el zoom</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visor Canvas */}
        <div className="relative rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-slate-100 dark:bg-slate-900 flex items-center justify-center select-none cursor-move">
          <canvas
            ref={canvasRef}
            width={460}
            height={320}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="w-full max-h-[320px] object-contain touch-none"
          />

          <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/60 text-white text-[11px] font-medium flex items-center gap-1.5 pointer-events-none">
            <Move className="w-3.5 h-3.5" />
            <span>Arrastra para mover</span>
          </div>
        </div>

        {/* Controles de Proporción */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold opacity-75">Formato:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAspectMode('libre')}
              className={`px-3 py-1.5 rounded-xl border font-medium transition-all ${
                aspectMode === 'libre'
                  ? 'border-[#FACC15] bg-[#FACC15]/20 text-[#CA8A04] dark:text-[#FACC15]'
                  : 'border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
              }`}
            >
              Libre
            </button>
            <button
              type="button"
              onClick={() => setAspectMode('cuadrado')}
              className={`px-3 py-1.5 rounded-xl border font-medium transition-all ${
                aspectMode === 'cuadrado'
                  ? 'border-[#FACC15] bg-[#FACC15]/20 text-[#CA8A04] dark:text-[#FACC15]'
                  : 'border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
              }`}
            >
              1:1 Cuadrado
            </button>
            <button
              type="button"
              onClick={() => setAspectMode('horizontal')}
              className={`px-3 py-1.5 rounded-xl border font-medium transition-all ${
                aspectMode === 'horizontal'
                  ? 'border-[#FACC15] bg-[#FACC15]/20 text-[#CA8A04] dark:text-[#FACC15]'
                  : 'border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
              }`}
            >
              Horizontal
            </button>
          </div>
        </div>

        {/* Control de Zoom */}
        <div className="space-y-1.5 bg-black/[0.02] dark:bg-white/[0.02] p-3 rounded-2xl border border-[var(--color-borde)]">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 opacity-80">
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Escala / Zoom ({Math.round(zoom * 100)}%)</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setZoom(1)
                setPan({ x: 0, y: 0 })
              }}
              className="text-[11px] text-[#CA8A04] dark:text-[#FACC15] hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restablecer</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              className="p-1.5 rounded-lg border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/10"
            >
              <ZoomOut className="w-4 h-4 opacity-75" />
            </button>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-[#FACC15] cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
              className="p-1.5 rounded-lg border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/10"
            >
              <ZoomIn className="w-4 h-4 opacity-75" />
            </button>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-borde)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--color-borde)] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmCrop}
            disabled={isProcessing}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-[#FACC15] text-[#1F2937] hover:bg-[#eab308] text-xs font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
            ) : (
              <Check className="w-4 h-4 text-[#1F2937]" />
            )}
            <span>Aplicar y Guardar Logo</span>
          </button>
        </div>
      </div>
    </div>
  )
}
