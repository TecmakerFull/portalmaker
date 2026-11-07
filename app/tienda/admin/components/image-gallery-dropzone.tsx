// =============================================================================
// PORTALMAKER — Carga de varias fotos: arrastrar, pegar o elegir archivos
//
// Igual que la galería de productos: la primera foto es la portada (la que se
// ve en el catálogo) y se puede cambiar. Formas de cargar:
//   1. Elegir uno o varios archivos
//   2. Arrastrar varias imágenes a la vez
//   3. Pegar una imagen copiada (Ctrl + V)
// Cada imagen se comprime en el navegador antes de subirse.
// =============================================================================

'use client'

import { useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { compressImageFile } from '@/lib/image-compression'
import { ImagePlus, Loader2, X, UploadCloud, Star } from 'lucide-react'

interface Props {
  storeId: string
  /** Carpeta dentro de tiendas/{id}/ donde se guardan (ej: "servicios"). */
  carpeta: string
  values: string[]
  onChange: (urls: string[]) => void
  onError?: (mensaje: string) => void
  max?: number
}

const MAX_MB = 15

export default function ImageGalleryDropzone({ storeId, carpeta, values, onChange, onError, max = 8 }: Props) {
  const supabase = createSupabaseBrowserClient()
  const [subiendo, setSubiendo] = useState(0) // cantidad de fotos subiéndose
  const [arrastrando, setArrastrando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  // Referencia a la lista actual: varias subidas en paralelo terminan en distinto orden
  // y cada una tiene que sumar a la lista vigente, no a una copia vieja.
  const actuales = useRef<string[]>(values)
  useEffect(() => {
    actuales.current = values
  }, [values])

  const subirUna = async (archivo: File): Promise<string | null> => {
    if (!archivo.type.startsWith('image/')) {
      onError?.('Uno de los archivos no es una imagen. Usá fotos JPG, PNG o WebP.')
      return null
    }
    if (archivo.size > MAX_MB * 1024 * 1024) {
      onError?.(`Una imagen pesa más de ${MAX_MB} MB. Probá con una más liviana.`)
      return null
    }
    try {
      let listo = archivo
      try {
        listo = await compressImageFile(archivo, { maxWidth: 1400, maxHeight: 1400, format: 'image/webp' })
      } catch {
        // Si no se puede comprimir se sube el original
      }
      const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'portalmaker-media'
      // tiendas/{store_id}/... es la ruta que permite la política de Storage
      const ruta = `tiendas/${storeId}/${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`
      const { error } = await supabase.storage.from(bucket).upload(ruta, listo, { cacheControl: '31536000', upsert: true })
      if (error) throw error
      return supabase.storage.from(bucket).getPublicUrl(ruta).data.publicUrl
    } catch {
      onError?.('No se pudo subir una de las fotos. Probá de nuevo.')
      return null
    }
  }

  const agregar = async (archivos: File[]) => {
    const lugar = max - actuales.current.length - subiendo
    if (lugar <= 0) {
      onError?.(`Podés cargar hasta ${max} fotos. Quitá alguna para agregar otra.`)
      return
    }
    const lote = archivos.slice(0, lugar)
    if (archivos.length > lugar) onError?.(`Solo entran ${max} fotos: se cargaron las primeras ${lugar}.`)

    setSubiendo((n) => n + lote.length)
    await Promise.all(
      lote.map(async (archivo) => {
        const url = await subirUna(archivo)
        setSubiendo((n) => n - 1)
        if (url) {
          actuales.current = [...actuales.current, url]
          onChange(actuales.current)
        }
      })
    )
  }

  // Pegar una imagen copiada (Ctrl + V) desde cualquier lugar de la pantalla
  const agregarRef = useRef(agregar)
  useEffect(() => {
    agregarRef.current = agregar
  })
  useEffect(() => {
    const alPegar = (e: ClipboardEvent) => {
      const archivos = Array.from(e.clipboardData?.items ?? [])
        .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
        .map((it) => it.getAsFile())
        .filter((f): f is File => Boolean(f))
      if (archivos.length === 0) return // texto u otra cosa: se deja pegar normalmente
      e.preventDefault()
      agregarRef.current(archivos)
    }
    document.addEventListener('paste', alPegar)
    return () => document.removeEventListener('paste', alPegar)
  }, [])

  const alSoltar = (e: React.DragEvent) => {
    e.preventDefault()
    setArrastrando(false)
    const archivos = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    if (archivos.length > 0) agregar(archivos)
    else onError?.('Soltá imágenes (JPG, PNG o WebP).')
  }

  const quitar = (indice: number) => onChange(values.filter((_, i) => i !== indice))
  const hacerPortada = (indice: number) => {
    const copia = [...values]
    const [elegida] = copia.splice(indice, 1)
    onChange([elegida, ...copia])
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setArrastrando(true)
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={alSoltar}
        className={`rounded-2xl border-2 border-dashed p-4 transition-colors ${
          arrastrando ? 'border-[#FACC15] bg-[#FACC15]/10' : 'border-[var(--color-borde)]'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
            {subiendo > 0 ? <Loader2 className="w-6 h-6 animate-spin opacity-60" /> : <UploadCloud className="w-7 h-7 opacity-40" />}
          </div>
          <div className="flex-1 text-center sm:text-left space-y-2">
            <p className="text-sm font-semibold">{subiendo > 0 ? `Subiendo ${subiendo} ${subiendo === 1 ? 'foto' : 'fotos'}...` : 'Arrastrá tus fotos acá'}</p>
            <p className="text-xs opacity-70">
              O pegalas con <strong>Ctrl + V</strong>, o elegilas desde tu dispositivo. Podés cargar varias a la vez (hasta {max}).
            </p>
            <button
              type="button"
              disabled={subiendo > 0 || values.length >= max}
              onClick={() => inputRef.current?.click()}
              className="min-h-11 px-4 rounded-xl border border-[var(--color-borde)] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
            >
              <ImagePlus className="w-4 h-4" />
              Elegir archivos
            </button>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            const archivos = Array.from(e.target.files ?? [])
            if (archivos.length > 0) agregar(archivos)
            e.target.value = ''
          }}
        />
      </div>

      {values.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {values.map((url, i) => (
            <li key={url} className="relative rounded-xl overflow-hidden border border-[var(--color-borde)] bg-black/5 dark:bg-white/5">
              <img src={url} alt={`Foto ${i + 1}`} className="w-full aspect-square object-cover" />
              {i === 0 && (
                <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-[#FACC15] text-[#1F2937] text-[10px] font-semibold">Portada</span>
              )}
              <button
                type="button"
                onClick={() => quitar(i)}
                aria-label={`Quitar foto ${i + 1}`}
                className="absolute top-1 right-1 min-h-11 min-w-11 inline-flex items-center justify-center cursor-pointer"
              >
                <span className="w-7 h-7 rounded-full bg-black/60 text-white inline-flex items-center justify-center">
                  <X className="w-4 h-4" />
                </span>
              </button>
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => hacerPortada(i)}
                  className="w-full min-h-11 text-[11px] font-semibold inline-flex items-center justify-center gap-1 bg-[var(--color-superficie)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5" /> Hacer portada
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
