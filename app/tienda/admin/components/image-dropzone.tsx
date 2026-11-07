// =============================================================================
// PORTALMAKER — Subida de una foto: arrastrar, pegar o elegir archivo
//
// Tres formas de cargar la imagen, para que cada persona use la que le resulte
// cómoda:
//   1. Elegir un archivo de la computadora o del celular (botón)
//   2. Arrastrar la imagen desde otra ventana o desde el escritorio
//   3. Pegar una imagen copiada (Ctrl + V / mantener presionado y "Pegar"),
//      por ejemplo una captura de pantalla o una foto copiada de otra página
// La imagen se comprime en el navegador antes de subirla.
// =============================================================================

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { compressImageFile } from '@/lib/image-compression'
import { ImagePlus, Loader2, X, UploadCloud } from 'lucide-react'

interface Props {
  storeId: string
  /** Carpeta dentro de tiendas/{id}/ donde se guarda (ej: "servicios"). */
  carpeta: string
  value: string | null
  onChange: (url: string | null) => void
  onError?: (mensaje: string) => void
  /** Si el formulario está abierto, la imagen también se puede pegar en cualquier parte de la página. */
  pegarEnPagina?: boolean
}

const TIPOS_VALIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
const MAX_MB = 15

export default function ImageDropzone({ storeId, carpeta, value, onChange, onError, pegarEnPagina = true }: Props) {
  const supabase = createSupabaseBrowserClient()
  const [subiendo, setSubiendo] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const subir = useCallback(
    async (archivo: File) => {
      if (!archivo.type.startsWith('image/') || (!TIPOS_VALIDOS.includes(archivo.type) && archivo.type !== 'image/avif')) {
        onError?.('Ese archivo no es una imagen. Probá con una foto JPG, PNG o WebP.')
        return
      }
      if (archivo.size > MAX_MB * 1024 * 1024) {
        onError?.(`La imagen pesa más de ${MAX_MB} MB. Probá con una más liviana.`)
        return
      }
      setSubiendo(true)
      try {
        let listo = archivo
        try {
          listo = await compressImageFile(archivo, { maxWidth: 1200, maxHeight: 1200, format: 'image/webp' })
        } catch {
          // Si no se puede comprimir se sube el original
        }
        const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'portalmaker-media'
        // tiendas/{store_id}/... es la ruta que permite la política de Storage
        const ruta = `tiendas/${storeId}/${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`
        const { error } = await supabase.storage.from(bucket).upload(ruta, listo, { cacheControl: '31536000', upsert: true })
        if (error) throw error
        onChange(supabase.storage.from(bucket).getPublicUrl(ruta).data.publicUrl)
      } catch {
        onError?.('No se pudo subir la foto. Probá de nuevo o con otra imagen.')
      } finally {
        setSubiendo(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeId, carpeta]
  )

  // Pegar una imagen copiada (Ctrl + V) desde cualquier lugar de la pantalla
  useEffect(() => {
    if (!pegarEnPagina) return
    const alPegar = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? [])
      const imagen = items.find((it) => it.kind === 'file' && it.type.startsWith('image/'))
      const archivo = imagen?.getAsFile()
      if (!archivo) return // texto u otra cosa: se deja pegar normalmente
      e.preventDefault()
      subir(archivo)
    }
    document.addEventListener('paste', alPegar)
    return () => document.removeEventListener('paste', alPegar)
  }, [pegarEnPagina, subir])

  const alSoltar = (e: React.DragEvent) => {
    e.preventDefault()
    setArrastrando(false)
    const archivo = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'))
    if (archivo) subir(archivo)
    else onError?.('Soltá una imagen (JPG, PNG o WebP).')
  }

  return (
    <div className="space-y-2">
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
          {value ? (
            <img src={value} alt="Foto del servicio" className="w-28 h-28 rounded-xl object-cover border border-[var(--color-borde)] shrink-0" />
          ) : (
            <div className="w-28 h-28 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
              {subiendo ? <Loader2 className="w-6 h-6 animate-spin opacity-60" /> : <UploadCloud className="w-7 h-7 opacity-40" />}
            </div>
          )}

          <div className="flex-1 text-center sm:text-left space-y-2">
            <p className="text-sm font-semibold">{subiendo ? 'Subiendo la foto...' : 'Arrastrá una foto acá'}</p>
            <p className="text-xs opacity-70">
              O pegala con <strong>Ctrl + V</strong> si la copiaste, o elegila desde tu dispositivo.
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <button
                type="button"
                disabled={subiendo}
                onClick={() => inputRef.current?.click()}
                className="min-h-11 px-4 rounded-xl border border-[var(--color-borde)] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
              >
                {subiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                {value ? 'Cambiar foto' : 'Elegir archivo'}
              </button>
              {value && (
                <button type="button" onClick={() => onChange(null)} className="min-h-11 px-3 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100 inline-flex items-center gap-1.5 cursor-pointer">
                  <X className="w-4 h-4" /> Quitar
                </button>
              )}
            </div>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const archivo = e.target.files?.[0]
            if (archivo) subir(archivo)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
