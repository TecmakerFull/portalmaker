// =============================================================================
// PORTALMAKER — Formulario de Configuración de "Sobre Nosotros"
// =============================================================================

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Store, StorePage } from '@/types/database'
import {
  Users,
  Save,
  Loader2,
  Check,
  AlertTriangle,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Trash2,
  Eye,
  FileText,
} from 'lucide-react'
import { compressImageFile } from '@/lib/image-compression'

interface SobreNosotrosFormProps {
  store: Store
  initialPage: StorePage | null
  tenantQuery: string
}

export default function SobreNosotrosForm({
  store,
  initialPage,
  tenantQuery,
}: SobreNosotrosFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createSupabaseBrowserClient()

  // Parsear contenido previo si viene en JSON o texto plano
  let parsedText = ''
  let parsedImage = ''

  if (initialPage?.contenido) {
    try {
      if (initialPage.contenido.startsWith('{')) {
        const data = JSON.parse(initialPage.contenido)
        parsedText = data.texto || ''
        parsedImage = data.imagen_url || ''
      } else {
        parsedText = initialPage.contenido
      }
    } catch {
      parsedText = initialPage.contenido
    }
  }

  const [visible, setVisible] = useState(initialPage ? initialPage.visible : false)
  const [titulo, setTitulo] = useState(initialPage?.titulo || 'Sobre Nosotros')
  const [texto, setTexto] = useState(parsedText)
  const [imagenUrl, setImagenUrl] = useState(parsedImage)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Subir imagen a Supabase Storage con compresión WebP
  const uploadImageFile = async (file: File) => {
    setUploadingImage(true)
    setErrorMsg(null)
    try {
      // Compresión en cliente a WebP (máx 1200px)
      let fileToUpload = file
      try {
        fileToUpload = await compressImageFile(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.82,
          format: 'image/webp',
        })
      } catch (cErr) {
        console.warn('Fallo compresión en cliente, subiendo original:', cErr)
      }

      const bucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'portalmaker-media'
      const fileExt = fileToUpload.name ? fileToUpload.name.split('.').pop() : 'webp'
      const cleanExt = fileExt ? `.${fileExt}` : '.webp'
      const filePath = `tiendas/${store.id}/paginas/sobre-nosotros-${Date.now()}${cleanExt}`

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileToUpload, { cacheControl: '31536000', upsert: true })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucketName).getPublicUrl(filePath)

      setImagenUrl(publicUrl)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al subir la imagen. Verifica la conexión.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadImageFile(file)
    }
    if (e.target) e.target.value = ''
  }

  // Guardar configuración
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const payloadContent = JSON.stringify({
      texto: texto.trim(),
      imagen_url: imagenUrl.trim() || null,
    })

    try {
      const { error } = await supabase.from('store_pages').upsert(
        {
          store_id: store.id,
          slug: 'sobre-nosotros',
          titulo: titulo.trim() || 'Sobre Nosotros',
          contenido: payloadContent,
          visible: visible,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'store_id,slug' }
      )

      if (error) throw error

      setSuccessMsg('¡Página "Sobre Nosotros" guardada correctamente!')
      router.refresh()
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar la página Sobre Nosotros.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-texto)] font-[var(--font-heading)] flex items-center gap-2.5">
            <Users className="w-7 h-7 text-[#CA8A04] dark:text-[#FACC15]" />
            <span>Sobre Nosotros</span>
          </h1>
          <p className="text-xs sm:text-sm opacity-70 mt-1">
            Configura la sección informativa donde cuentas la historia de tu taller, equipo y proyectos.
          </p>
        </div>

        {visible && (
          <a
            href={`/tienda/sobre-nosotros${tenantQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--color-borde)] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center gap-2 w-fit"
          >
            <Eye className="w-4 h-4" />
            <span>Ver página pública</span>
          </a>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Interruptor de Activación */}
        <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold">Habilitar sección "Sobre Nosotros"</h2>
              <p className="text-xs opacity-70 mt-0.5">
                Al activarlo, se agregará un enlace a "Sobre Nosotros" en el menú de navegación y en el pie de página de tu tienda.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setVisible(!visible)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                visible ? 'bg-[#FACC15]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  visible ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 2. Contenido de la Página */}
        <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-5">
          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
              Título de la Página
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Sobre Nosotros, Quiénes Somos, Nuestra Historia..."
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
            />
          </div>

          {/* Foto del Taller / Equipo */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
              Foto o Imagen del Taller / Equipo (Opcional)
            </label>

            {imagenUrl ? (
              <div className="relative w-full max-w-md h-52 rounded-2xl overflow-hidden border border-[var(--color-borde)] bg-black/5 dark:bg-white/5 group">
                <img
                  src={imagenUrl}
                  alt="Foto Sobre Nosotros"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImagenUrl('')}
                  className="absolute top-3 right-3 min-w-[36px] min-h-[36px] rounded-xl bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Eliminar imagen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--color-borde)] rounded-2xl p-6 text-center cursor-pointer hover:border-[#FACC15] hover:bg-black/[0.02] transition-colors max-w-md"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FACC15]/15 text-[#CA8A04] dark:text-[#FACC15] flex items-center justify-center mx-auto mb-2">
                  {uploadingImage ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>
                <p className="text-xs font-bold">
                  {uploadingImage ? 'Subiendo imagen...' : 'Click para subir una foto de tu taller'}
                </p>
                <p className="text-[11px] opacity-60 mt-0.5">Formatos JPG, PNG, WebP</p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Texto / Descripción / Historia */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider opacity-70 block flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#CA8A04] dark:text-[#FACC15]" />
              <span>Historia & Descripción del Taller</span>
            </label>
            <textarea
              rows={7}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Contá cómo nació tu proyecto, qué tecnologías utilizas (impresión 3D, corte láser, modelado), tus valores y el compromiso con cada pieza personalizada..."
              className="w-full p-3.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15] leading-relaxed"
            />
            <p className="text-[11px] opacity-50">
              Puedes escribir en varios párrafos. Se mostrarán tal cual en la página pública.
            </p>
          </div>
        </div>

        {/* Botón Guardar y Feedback */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
          {successMsg && (
            <div className="p-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3 px-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || uploadingImage}
            className="min-h-[48px] px-7 py-3 rounded-2xl bg-[#FACC15] text-[#1F2937] font-bold text-sm hover:bg-[#EAB308] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>

        {/* Notificación Toast Flotante */}
        {successMsg && (
          <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#1F2937] text-white text-sm font-medium shadow-2xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span>{successMsg}</span>
          </div>
        )}
      </form>
    </div>
  )
}
