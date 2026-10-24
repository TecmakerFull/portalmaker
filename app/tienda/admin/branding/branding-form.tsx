// =============================================================================
// PORTALMAKER — Formulario de Personalización de Branding y Paletas
// =============================================================================

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { COLOR_PRESETS, AVAILABLE_FONTS } from '@/lib/constants'
import type { Store } from '@/types/database'
import {
  Check,
  Palette,
  Type,
  MessageSquare,
  Loader2,
  AlertCircle,
  Sparkles,
  Sun,
  Moon,
  Laptop,
  Upload,
  Image as ImageIcon,
  Trash2,
  Link as LinkIcon,
  Clipboard,
  Search,
  ShoppingBag,
  Truck,
  Phone,
  Sliders,
  Wand2,
  Pipette,
  RefreshCw,
  Crop,
  Save,
  Monitor,
  Smartphone,
  Star,
  ShieldCheck,
  Box,
  Lock,
} from 'lucide-react'
import WhatsAppIcon from '@/app/tienda/sections/whatsapp-icon'
import { compressImageFile } from '@/lib/image-compression'
import LogoCropperModal from './logo-cropper-modal'

interface BrandingFormProps {
  store: Store
  tenantQuery: string
}

export default function BrandingForm({ store, tenantQuery }: BrandingFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Datos de Marca
  const [nombre, setNombre] = useState(store.nombre)
  const [slogan, setSlogan] = useState(store.slogan ?? '')
  const [whatsapp, setWhatsapp] = useState(store.whatsapp_numero ?? '')
  const [logoUrl, setLogoUrl] = useState(store.logo_url ?? '')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoTamano, setLogoTamano] = useState<'chico' | 'mediano' | 'grande' | 'xl'>(
    store.logo_tamano ?? 'mediano'
  )
  const [mostrarNombreHeader, setMostrarNombreHeader] = useState<boolean>(
    store.mostrar_nombre_header ?? true
  )
  const [cropModalSrc, setCropModalSrc] = useState<string | null>(null)

  // Modo por defecto para la tienda pública
  const [temaPorDefecto, setTemaPorDefecto] = useState<'claro' | 'oscuro' | 'sistema'>(
    store.tema_por_defecto ?? 'claro'
  )

  // Paleta seleccionada
  const [colorPrimario, setColorPrimario] = useState(store.color_primario)
  const [colorSecundario, setColorSecundario] = useState(store.color_secundario)
  const [colorFondo, setColorFondo] = useState(store.color_fondo)
  const [colorTexto, setColorTexto] = useState(store.color_texto)
  const [colorPrimarioDark, setColorPrimarioDark] = useState(store.color_primario_dark ?? store.color_primario)
  const [colorSecundarioDark, setColorSecundarioDark] = useState(store.color_secundario_dark ?? store.color_secundario)
  const [colorFondoDark, setColorFondoDark] = useState(store.color_fondo_dark ?? '#1C1E1F')
  const [colorTextoDark, setColorTextoDark] = useState(store.color_texto_dark ?? '#EDEDEA')

  // Tipografías
  const [fontHeading, setFontHeading] = useState(store.font_heading || 'Outfit')
  const [fontBody, setFontBody] = useState(store.font_body || 'Inter')

  // Estados de interfaz
  const [previewMode, setPreviewMode] = useState<'claro' | 'oscuro'>('claro')
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [customModeTab, setCustomModeTab] = useState<'claro' | 'oscuro'>('claro')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const supabase = createSupabaseBrowserClient()

  // Subir archivo de logo a Supabase Storage con compresión WebP
  const uploadLogoFile = async (file: File) => {
    setUploadingLogo(true)
    setErrorMsg(null)
    try {
      // Compresión client-side a WebP preservando transparencias (máx 800px)
      let fileToUpload = file
      try {
        fileToUpload = await compressImageFile(file, {
          maxWidth: 800,
          maxHeight: 800,
          quality: 0.88,
          format: 'image/webp',
        })
      } catch (cErr) {
        console.warn('Fallo compresión de logo, subiendo original:', cErr)
      }

      const bucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'portalmaker-media'
      const fileExt = fileToUpload.name ? fileToUpload.name.split('.').pop() : 'webp'
      const cleanExt = fileExt ? `.${fileExt}` : '.webp'
      const filePath = `tiendas/${store.id}/branding/logo-${Date.now()}${cleanExt}`

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileToUpload, { cacheControl: '31536000', upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath)

      setLogoUrl(publicUrl)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al subir el logo. Verifica la conexión a Storage.')
    } finally {
      setUploadingLogo(false)
    }
  }

  // Manejador del input de archivo: abre modal de recorte
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCropModalSrc(reader.result)
        }
      }
      reader.readAsDataURL(file)
    }
    if (e.target) e.target.value = ''
  }

  // Manejador para pegar imagen con Ctrl + V: abre modal de recorte
  const handlePasteLogo = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          const reader = new FileReader()
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              setCropModalSrc(reader.result)
            }
          }
          reader.readAsDataURL(file)
          return
        }
      }
    }

    // Si pegó una URL de texto
    const pastedText = e.clipboardData.getData('text')
    if (pastedText && (pastedText.startsWith('http://') || pastedText.startsWith('https://'))) {
      setLogoUrl(pastedText.trim())
    }
  }

  // Procesar Blob recortado y subirlo
  const handleCropComplete = async (croppedBlob: Blob) => {
    const file = new File([croppedBlob], `logo-${Date.now()}.webp`, { type: 'image/webp' })
    await uploadLogoFile(file)
  }

  // Aplicar un preset
  const handleSelectPreset = (presetId: number) => {
    const preset = COLOR_PRESETS.find((p) => p.id === presetId)
    if (!preset) return

    setColorPrimario(preset.claro.primario)
    setColorSecundario(preset.claro.secundario)
    setColorFondo(preset.claro.fondo)
    setColorTexto(preset.claro.texto)

    setColorPrimarioDark(preset.oscuro.primario)
    setColorSecundarioDark(preset.oscuro.secundario)
    setColorFondoDark(preset.oscuro.fondo)
    setColorTextoDark(preset.oscuro.texto)
  }

  // Guardar cambios en Supabase
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      setErrorMsg('El nombre de la tienda es obligatorio.')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          nombre: nombre.trim(),
          slogan: slogan.trim() || null,
          whatsapp_numero: whatsapp.trim() || null,
          logo_url: logoUrl.trim() || null,
          logo_tamano: logoTamano,
          mostrar_nombre_header: mostrarNombreHeader,
          tema_por_defecto: temaPorDefecto,
          color_primario: colorPrimario,
          color_secundario: colorSecundario,
          color_fondo: colorFondo,
          color_texto: colorTexto,
          color_primario_dark: colorPrimarioDark,
          color_secundario_dark: colorSecundarioDark,
          color_fondo_dark: colorFondoDark,
          color_texto_dark: colorTextoDark,
          font_heading: fontHeading,
          font_body: fontBody,
          updated_at: new Date().toISOString(),
        })
        .eq('id', store.id)

      if (error) throw error

      setSuccessMsg('¡Configuración de marca guardada exitosamente!')
      router.refresh()
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar la configuración.')
    } finally {
      setLoading(false)
    }
  }

  // Colores activos para el preview
  const isDark = previewMode === 'oscuro'
  const currentPrimario = isDark ? colorPrimarioDark : colorPrimario
  const currentSecundario = isDark ? colorSecundarioDark : colorSecundario
  const currentFondo = isDark ? colorFondoDark : colorFondo
  const currentTexto = isDark ? colorTextoDark : colorTexto

  // Helper de tipografías seguras con variables CSS de Next.js
  const getFontFamily = (fontName: string) => {
    switch (fontName) {
      case 'Inter':
        return 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      case 'Outfit':
        return 'var(--font-outfit), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      case 'Playfair Display':
        return 'var(--font-playfair-display), Georgia, serif'
      case 'Space Grotesk':
        return 'var(--font-space-grotesk), monospace, sans-serif'
      case 'DM Serif Display':
        return 'var(--font-dm-serif-display), Georgia, serif'
      default:
        return 'sans-serif'
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-12">
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2">
          <Check className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Disposición Desktop: Columnas de Ajustes a la Izquierda y Vista Previa Sticky a la Derecha */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Tarjetas de Configuración */}
        <div className="xl:col-span-7 space-y-6">
          {/* 1. Información General y WhatsApp */}
          <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
              <span>Información de la Tienda</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">
                  Nombre de la Tienda *
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)] text-[var(--color-input-texto)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">
                  Número de WhatsApp para pedidos
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ej: 5491112345678"
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)] text-[var(--color-input-texto)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">
                  Slogan o Frase Destacada
                </label>
                <input
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  placeholder="Ej: Impresiones 3D personalizadas y de alta precisión"
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)] text-[var(--color-input-texto)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                />
              </div>
            </div>

            {/* Pie de tarjeta con feedback y botón de guardar */}
            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[var(--color-borde)]">
              <div className="min-h-[20px]">
                {successMsg && (
                  <div className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}
                {errorMsg && (
                  <div className="text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] font-bold text-xs sm:text-sm hover:bg-[#eab308] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-[#1F2937]" />
                    <span>Guardar Información</span>
                  </>
                )}
              </button>
            </div>
          </div>

      {/* 2. Logo de la Marca / Taller (Subir Archivo, Ctrl+V o URL) */}
      <div
        onPaste={handlePasteLogo}
        className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
            <span>Logo de la Tienda</span>
          </h2>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 opacity-70">
            Soporta Ctrl + V
          </span>
        </div>

        <p className="text-xs opacity-70">
          Sube tu logotipo en formato PNG, JPG, SVG o WEBP. Puedes seleccionarlo desde tu dispositivo, pegarlo directamente con <strong>Ctrl + V</strong> o ingresar un enlace web.
        </p>

        {/* Preview del Logo Actual */}
        {logoUrl ? (
          <div className="p-4 rounded-2xl border border-[var(--color-borde)] bg-black/5 dark:bg-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-white/90 dark:bg-slate-950 p-2 border border-black/10 dark:border-white/10 flex items-center justify-center overflow-hidden shadow-xs">
                <img
                  src={logoUrl}
                  alt="Logo de la tienda"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold font-mono truncate max-w-xs">{logoUrl}</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Logo cargado correctamente
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setCropModalSrc(logoUrl)}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-[var(--color-borde)] hover:bg-[#FACC15]/20 hover:border-[#FACC15] text-[#CA8A04] dark:text-[#FACC15] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Ajustar / Recortar</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Reemplazar</span>
              </button>
              <button
                type="button"
                onClick={() => setLogoUrl('')}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        ) : (
          /* Zona de Carga / Drag & Drop / Paste */
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[var(--color-borde)] hover:border-[#FACC15] bg-black/[0.01] dark:bg-white/[0.02] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all space-y-3 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FACC15]/20 text-[#CA8A04] dark:text-[#FACC15] flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              {uploadingLogo ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold">
                {uploadingLogo ? 'Subiendo imagen...' : 'Haz clic para seleccionar un archivo o arrástralo aquí'}
              </p>
              <p className="text-xs opacity-60">
                O presiona <kbd className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-[11px]">Ctrl + V</kbd> para pegar una imagen copiada
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Opción alternativa: Cargar por URL */}
        <div className="pt-2">
          <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5 flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5" />
            <span>O ingresar por URL directa de imagen</span>
          </label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://ejemplo.com/imagenes/mi-logo.png"
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)] text-[var(--color-input-texto)] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
          />
        </div>

        {/* Tamaño del Logo en Cabecera y Nombre */}
        {logoUrl && (
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">
                Tamaño del Logo en Cabecera
              </label>
              <select
                value={logoTamano}
                onChange={(e) => setLogoTamano(e.target.value as any)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)] text-[var(--color-input-texto)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FACC15] cursor-pointer"
              >
                <option value="chico">Chico (compacto, 28px)</option>
                <option value="mediano">Mediano (estándar, 40px)</option>
                <option value="grande">Grande (destacado, 56px)</option>
                <option value="xl">Extra Grande (máximo, 72px)</option>
              </select>
            </div>

            <div className="flex items-center pt-2 sm:pt-6">
              <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mostrarNombreHeader}
                  onChange={(e) => setMostrarNombreHeader(e.target.checked)}
                  className="rounded border-[var(--color-borde)] text-[#CA8A04] focus:ring-[#FACC15] w-4 h-4 cursor-pointer"
                />
                <span>Mostrar nombre de la tienda junto al logo</span>
              </label>
            </div>
          </div>
        )}

        {/* Modal de Recorte / Ajuste Canvas */}
        {cropModalSrc && (
          <LogoCropperModal
            imageSrc={cropModalSrc}
            onClose={() => setCropModalSrc(null)}
            onCropComplete={handleCropComplete}
          />
        )}

        {/* Pie de tarjeta con feedback y botón de guardar */}
        <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[var(--color-borde)]">
          <div className="min-h-[20px]">
            {successMsg && (
              <div className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || uploadingLogo}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] font-bold text-xs sm:text-sm hover:bg-[#eab308] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
          >
            {loading || uploadingLogo ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
                <span>{uploadingLogo ? 'Subiendo logo...' : 'Guardando...'}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#1F2937]" />
                <span>Guardar Logo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Modo por Defecto de la Tienda */}
      <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <Sun className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
            <span>Tema por Defecto de tu Tienda</span>
          </h2>
          <p className="text-xs opacity-70 mt-0.5">
            Elige cómo se presentará tu catálogo a los visitantes cuando ingresen por primera vez a tu tienda online.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Modo Claro */}
          <button
            type="button"
            onClick={() => setTemaPorDefecto('claro')}
            className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
              temaPorDefecto === 'claro'
                ? 'border-[#FACC15] ring-2 ring-[#FACC15]/40 bg-[#FACC15]/10 shadow-xs'
                : 'border-[var(--color-borde)] hover:border-[var(--color-texto-muted)] bg-[var(--color-fondo)]/40'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Sun className="w-4 h-4" />
              </div>
              {temaPorDefecto === 'claro' && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-200 bg-[#FDE68A] px-2 py-0.5 rounded-full">
                  <Check className="w-3 h-3" />
                  <span>Activo</span>
                </span>
              )}
            </div>
            <div>
              <span className="font-bold text-sm block">Modo Claro</span>
              <p className="text-xs opacity-70 mt-0.5">
                Fondo blanco y claro. Ideal para catálogos luminosos y tradicionales.
              </p>
            </div>
          </button>

          {/* Modo Oscuro */}
          <button
            type="button"
            onClick={() => setTemaPorDefecto('oscuro')}
            className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
              temaPorDefecto === 'oscuro'
                ? 'border-[#FACC15] ring-2 ring-[#FACC15]/40 bg-[#FACC15]/10 shadow-xs'
                : 'border-[var(--color-borde)] hover:border-[var(--color-texto-muted)] bg-[var(--color-fondo)]/40'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-100 flex items-center justify-center">
                <Moon className="w-4 h-4" />
              </div>
              {temaPorDefecto === 'oscuro' && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-200 bg-[#FDE68A] px-2 py-0.5 rounded-full">
                  <Check className="w-3 h-3" />
                  <span>Activo</span>
                </span>
              )}
            </div>
            <div>
              <span className="font-bold text-sm block">Modo Oscuro</span>
              <p className="text-xs opacity-70 mt-0.5">
                Fondo oscuro y moderno. Destaca piezas tecnológicas y de ingeniería.
              </p>
            </div>
          </button>

          {/* Automático / Sistema */}
          <button
            type="button"
            onClick={() => setTemaPorDefecto('sistema')}
            className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
              temaPorDefecto === 'sistema'
                ? 'border-[#FACC15] ring-2 ring-[#FACC15]/40 bg-[#FACC15]/10 shadow-xs'
                : 'border-[var(--color-borde)] hover:border-[var(--color-texto-muted)] bg-[var(--color-fondo)]/40'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Laptop className="w-4 h-4" />
              </div>
              {temaPorDefecto === 'sistema' && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-200 bg-[#FDE68A] px-2 py-0.5 rounded-full">
                  <Check className="w-3 h-3" />
                  <span>Activo</span>
                </span>
              )}
            </div>
            <div>
              <span className="font-bold text-sm block">Automático</span>
              <p className="text-xs opacity-70 mt-0.5">
                Se ajusta automáticamente según la preferencia del dispositivo del visitante.
              </p>
            </div>
          </button>
        </div>

        {/* Pie de tarjeta con feedback y botón de guardar */}
        <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[var(--color-borde)]">
          <div className="min-h-[20px]">
            {successMsg && (
              <div className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] font-bold text-xs sm:text-sm hover:bg-[#eab308] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#1F2937]" />
                <span>Guardar Tema</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Paletas de Color Preset (10 Opciones Oficiales + Paleta Personalizada) */}
      <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
            <span>Paleta de Colores de la Tienda</span>
          </h2>
          <p className="text-xs opacity-70 mt-0.5">
            Selecciona una de las 10 combinaciones predefinidas o personaliza los colores exactos de tu marca.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COLOR_PRESETS.map((preset) => {
            const isSelected =
              colorPrimario.toLowerCase() === preset.claro.primario.toLowerCase() &&
              colorSecundario.toLowerCase() === preset.claro.secundario.toLowerCase() &&
              colorFondo.toLowerCase() === preset.claro.fondo.toLowerCase() &&
              colorTexto.toLowerCase() === preset.claro.texto.toLowerCase()

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'border-[#FACC15] ring-2 ring-[#FACC15]/40 bg-[#FACC15]/10 shadow-xs'
                    : 'border-[var(--color-borde)] hover:border-[var(--color-texto-muted)] bg-[var(--color-fondo)]/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{preset.nombre}</span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-200 bg-[#FDE68A] px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        <span>Activa</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs opacity-75 mt-1">
                    {preset.descripcion}
                  </p>
                  <p className="text-[10px] opacity-50 mt-0.5 font-mono">
                    {preset.tags}
                  </p>
                </div>

                {/* Los 5 colores de la paleta */}
                <div className="flex items-center gap-1.5 pt-1">
                  {preset.coloresHex.map((hex, idx) => (
                    <span
                      key={idx}
                      className="flex-1 h-6 rounded-lg border border-black/15 dark:border-white/15 shadow-2xs"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </button>
            )
          })}

          {/* Opción 11: Tarjeta de Paleta Personalizada (Ancho completo) */}
          {(() => {
            const isPresetActive = COLOR_PRESETS.some(
              (p) =>
                colorPrimario.toLowerCase() === p.claro.primario.toLowerCase() &&
                colorSecundario.toLowerCase() === p.claro.secundario.toLowerCase() &&
                colorFondo.toLowerCase() === p.claro.fondo.toLowerCase() &&
                colorTexto.toLowerCase() === p.claro.texto.toLowerCase()
            )
            const isCustomActive = !isPresetActive

            return (
              <div
                className={`sm:col-span-2 p-5 sm:p-6 rounded-2xl border transition-all space-y-4 ${
                  isCustomActive
                    ? 'border-[#FACC15] ring-2 ring-[#FACC15]/40 bg-[#FACC15]/5 shadow-sm'
                    : 'border-[var(--color-borde)] bg-[var(--color-fondo)]/30 hover:border-[var(--color-texto-muted)]'
                }`}
              >
                {/* Header de la tarjeta personalizada */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm sm:text-base">11 Personalizada — Colores a Medida de tu Marca</span>
                      {isCustomActive && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-200 bg-[#FDE68A] px-2.5 py-0.5 rounded-full">
                          <Check className="w-3 h-3" />
                          <span>Activa</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs opacity-75">
                      Define los códigos hexadecimales o usa el selector visual para replicar la identidad corporativa de tu taller.
                    </p>
                  </div>

                  {/* Muestra en vivo de los colores actuales */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0 bg-black/5 dark:bg-white/5 p-1.5 rounded-xl border border-[var(--color-borde)]">
                    <span className="text-[10px] font-mono opacity-60 mr-1 uppercase">Muestra:</span>
                    <span
                      className="w-5 h-5 rounded-md border border-black/20 dark:border-white/20 shadow-2xs"
                      style={{ backgroundColor: colorPrimario }}
                      title={`Primario: ${colorPrimario}`}
                    />
                    <span
                      className="w-5 h-5 rounded-md border border-black/20 dark:border-white/20 shadow-2xs"
                      style={{ backgroundColor: colorSecundario }}
                      title={`Secundario: ${colorSecundario}`}
                    />
                    <span
                      className="w-5 h-5 rounded-md border border-black/20 dark:border-white/20 shadow-2xs"
                      style={{ backgroundColor: colorFondo }}
                      title={`Fondo: ${colorFondo}`}
                    />
                    <span
                      className="w-5 h-5 rounded-md border border-black/20 dark:border-white/20 shadow-2xs"
                      style={{ backgroundColor: colorTexto }}
                      title={`Texto: ${colorTexto}`}
                    />
                  </div>
                </div>

                {/* Selector de Pestaña Modo Claro / Modo Oscuro para la configuración personalizada */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-[var(--color-borde)]">
                  <div className="flex items-center p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--color-borde)] text-xs">
                    <button
                      type="button"
                      onClick={() => setCustomModeTab('claro')}
                      className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        customModeTab === 'claro'
                          ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-xs'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Colores Modo Claro</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomModeTab('oscuro')}
                      className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        customModeTab === 'oscuro'
                          ? 'bg-zinc-900 text-white shadow-xs'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5 text-blue-400" />
                      <span>Colores Modo Oscuro</span>
                    </button>
                  </div>

                  {customModeTab === 'oscuro' && (
                    <button
                      type="button"
                      onClick={() => {
                        setColorPrimarioDark(colorPrimario)
                        setColorSecundarioDark(colorSecundario)
                        setColorFondoDark('#0F172A')
                        setColorTextoDark('#F8FAFC')
                      }}
                      className="px-3 py-1.5 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-[#CA8A04] dark:text-[#FACC15]" />
                      <span>Generar contraste oscuro automático</span>
                    </button>
                  )}
                </div>

                {/* Grilla de Controles de Color */}
                {customModeTab === 'claro' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 pt-1">
                    {/* 1. Primario Claro */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold opacity-75">
                        Color Primario
                      </label>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)]">
                        <input
                          type="color"
                          value={colorPrimario.startsWith('#') && colorPrimario.length === 7 ? colorPrimario : '#FACC15'}
                          onChange={(e) => setColorPrimario(e.target.value)}
                          className="w-8 h-8 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={colorPrimario}
                          onChange={(e) => setColorPrimario(e.target.value)}
                          placeholder="#000000"
                          className="w-full bg-transparent text-xs font-mono font-medium text-[var(--color-input-texto)] focus:outline-none uppercase"
                        />
                      </div>
                      <span className="text-[10px] opacity-60 block">Botones, acentos y links</span>
                    </div>

                    {/* 2. Secundario Claro */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold opacity-75">
                        Color Secundario
                      </label>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)]">
                        <input
                          type="color"
                          value={colorSecundario.startsWith('#') && colorSecundario.length === 7 ? colorSecundario : '#4B5563'}
                          onChange={(e) => setColorSecundario(e.target.value)}
                          className="w-8 h-8 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={colorSecundario}
                          onChange={(e) => setColorSecundario(e.target.value)}
                          placeholder="#000000"
                          className="w-full bg-transparent text-xs font-mono font-medium text-[var(--color-input-texto)] focus:outline-none uppercase"
                        />
                      </div>
                      <span className="text-[10px] opacity-60 block">Detalles y elementos suaves</span>
                    </div>

                    {/* 3. Fondo Claro */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold opacity-75">
                        Color de Fondo
                      </label>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)]">
                        <input
                          type="color"
                          value={colorFondo.startsWith('#') && colorFondo.length === 7 ? colorFondo : '#FFFFFF'}
                          onChange={(e) => setColorFondo(e.target.value)}
                          className="w-8 h-8 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={colorFondo}
                          onChange={(e) => setColorFondo(e.target.value)}
                          placeholder="#FFFFFF"
                          className="w-full bg-transparent text-xs font-mono font-medium text-[var(--color-input-texto)] focus:outline-none uppercase"
                        />
                      </div>
                      <span className="text-[10px] opacity-60 block">Fondo general de la tienda</span>
                    </div>

                    {/* 4. Texto Claro */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold opacity-75">
                        Color de Texto
                      </label>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)]">
                        <input
                          type="color"
                          value={colorTexto.startsWith('#') && colorTexto.length === 7 ? colorTexto : '#111827'}
                          onChange={(e) => setColorTexto(e.target.value)}
                          className="w-8 h-8 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={colorTexto}
                          onChange={(e) => setColorTexto(e.target.value)}
                          placeholder="#111827"
                          className="w-full bg-transparent text-xs font-mono font-medium text-[var(--color-input-texto)] focus:outline-none uppercase"
                        />
                      </div>
                      <span className="text-[10px] opacity-60 block">Títulos y párrafos</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 pt-1">
                    {/* 1. Primario Oscuro */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold opacity-75">
                        Primario Oscuro
                      </label>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)]">
                        <input
                          type="color"
                          value={colorPrimarioDark.startsWith('#') && colorPrimarioDark.length === 7 ? colorPrimarioDark : '#FACC15'}
                          onChange={(e) => setColorPrimarioDark(e.target.value)}
                          className="w-8 h-8 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={colorPrimarioDark}
                          onChange={(e) => setColorPrimarioDark(e.target.value)}
                          placeholder="#000000"
                          className="w-full bg-transparent text-xs font-mono font-medium text-[var(--color-input-texto)] focus:outline-none uppercase"
                        />
                      </div>
                      <span className="text-[10px] opacity-60 block">Acentos en tema oscuro</span>
                    </div>

                    {/* 2. Secundario Oscuro */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold opacity-75">
                        Secundario Oscuro
                      </label>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)]">
                        <input
                          type="color"
                          value={colorSecundarioDark.startsWith('#') && colorSecundarioDark.length === 7 ? colorSecundarioDark : '#9CA3AF'}
                          onChange={(e) => setColorSecundarioDark(e.target.value)}
                          className="w-8 h-8 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={colorSecundarioDark}
                          onChange={(e) => setColorSecundarioDark(e.target.value)}
                          placeholder="#000000"
                          className="w-full bg-transparent text-xs font-mono font-medium text-[var(--color-input-texto)] focus:outline-none uppercase"
                        />
                      </div>
                      <span className="text-[10px] opacity-60 block">Bordes y detalles oscuros</span>
                    </div>

                    {/* 3. Fondo Oscuro */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold opacity-75">
                        Fondo Oscuro
                      </label>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)]">
                        <input
                          type="color"
                          value={colorFondoDark.startsWith('#') && colorFondoDark.length === 7 ? colorFondoDark : '#111827'}
                          onChange={(e) => setColorFondoDark(e.target.value)}
                          className="w-8 h-8 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={colorFondoDark}
                          onChange={(e) => setColorFondoDark(e.target.value)}
                          placeholder="#111827"
                          className="w-full bg-transparent text-xs font-mono font-medium text-[var(--color-input-texto)] focus:outline-none uppercase"
                        />
                      </div>
                      <span className="text-[10px] opacity-60 block">Fondo principal en tema dark</span>
                    </div>

                    {/* 4. Texto Oscuro */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold opacity-75">
                        Texto Oscuro
                      </label>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)]">
                        <input
                          type="color"
                          value={colorTextoDark.startsWith('#') && colorTextoDark.length === 7 ? colorTextoDark : '#F9FAFB'}
                          onChange={(e) => setColorTextoDark(e.target.value)}
                          className="w-8 h-8 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={colorTextoDark}
                          onChange={(e) => setColorTextoDark(e.target.value)}
                          placeholder="#F9FAFB"
                          className="w-full bg-transparent text-xs font-mono font-medium text-[var(--color-input-texto)] focus:outline-none uppercase"
                        />
                      </div>
                      <span className="text-[10px] opacity-60 block">Lectura clara sobre fondo oscuro</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        {/* Pie de tarjeta con feedback y botón de guardar */}
        <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[var(--color-borde)]">
          <div className="min-h-[20px]">
            {successMsg && (
              <div className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] font-bold text-xs sm:text-sm hover:bg-[#eab308] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#1F2937]" />
                <span>Guardar Paleta de Colores</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. Selector de Tipografías */}
      <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Type className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
          <span>Tipografías de la Tienda</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Fuente para Títulos */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">
              Fuente para Títulos
            </label>
            <div className="relative">
              <select
                value={fontHeading}
                onChange={(e) => setFontHeading(e.target.value)}
                style={{
                  fontFamily:
                    fontHeading === 'Inter'
                      ? 'var(--font-inter), sans-serif'
                      : fontHeading === 'Outfit'
                      ? 'var(--font-outfit), sans-serif'
                      : fontHeading === 'Playfair Display'
                      ? 'var(--font-playfair-display), Georgia, serif'
                      : fontHeading === 'Space Grotesk'
                      ? 'var(--font-space-grotesk), sans-serif'
                      : fontHeading === 'DM Serif Display'
                      ? 'var(--font-dm-serif-display), Georgia, serif'
                      : 'sans-serif',
                }}
                className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)] text-[var(--color-input-texto)] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FACC15] cursor-pointer"
              >
                {AVAILABLE_FONTS.map((f) => (
                  <option
                    key={f.value}
                    value={f.value}
                    style={{
                      fontFamily:
                        f.value === 'Inter'
                          ? 'var(--font-inter), sans-serif'
                          : f.value === 'Outfit'
                          ? 'var(--font-outfit), sans-serif'
                          : f.value === 'Playfair Display'
                          ? 'var(--font-playfair-display), Georgia, serif'
                          : f.value === 'Space Grotesk'
                          ? 'var(--font-space-grotesk), sans-serif'
                          : f.value === 'DM Serif Display'
                          ? 'var(--font-dm-serif-display), Georgia, serif'
                          : 'sans-serif',
                    }}
                    className="bg-[var(--color-input-bg)] text-[var(--color-input-texto)] py-2 text-base"
                  >
                    {f.label} ({f.style})
                  </option>
                ))}
              </select>
            </div>

            {/* Muestra visual en vivo del título */}
            <div
              className="mt-2.5 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--color-borde)] text-sm font-bold text-[var(--color-texto)] truncate"
              style={{
                fontFamily:
                  fontHeading === 'Inter'
                    ? 'var(--font-inter), sans-serif'
                    : fontHeading === 'Outfit'
                    ? 'var(--font-outfit), sans-serif'
                    : fontHeading === 'Playfair Display'
                    ? 'var(--font-playfair-display), Georgia, serif'
                    : fontHeading === 'Space Grotesk'
                    ? 'var(--font-space-grotesk), sans-serif'
                    : fontHeading === 'DM Serif Display'
                    ? 'var(--font-dm-serif-display), Georgia, serif'
                    : 'sans-serif',
              }}
            >
              {nombre || 'Portalmaker'} — Taller Maker
            </div>
          </div>

          {/* Fuente para Textos de Cuerpo */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">
              Fuente para Textos de Cuerpo
            </label>
            <div className="relative">
              <select
                value={fontBody}
                onChange={(e) => setFontBody(e.target.value)}
                style={{
                  fontFamily:
                    fontBody === 'Inter'
                      ? 'var(--font-inter), sans-serif'
                      : fontBody === 'Outfit'
                      ? 'var(--font-outfit), sans-serif'
                      : fontBody === 'Playfair Display'
                      ? 'var(--font-playfair-display), Georgia, serif'
                      : fontBody === 'Space Grotesk'
                      ? 'var(--font-space-grotesk), sans-serif'
                      : fontBody === 'DM Serif Display'
                      ? 'var(--font-dm-serif-display), Georgia, serif'
                      : 'sans-serif',
                }}
                className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)] text-[var(--color-input-texto)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15] cursor-pointer"
              >
                {AVAILABLE_FONTS.map((f) => (
                  <option
                    key={f.value}
                    value={f.value}
                    style={{
                      fontFamily:
                        f.value === 'Inter'
                          ? 'var(--font-inter), sans-serif'
                          : f.value === 'Outfit'
                          ? 'var(--font-outfit), sans-serif'
                          : f.value === 'Playfair Display'
                          ? 'var(--font-playfair-display), Georgia, serif'
                          : f.value === 'Space Grotesk'
                          ? 'var(--font-space-grotesk), sans-serif'
                          : f.value === 'DM Serif Display'
                          ? 'var(--font-dm-serif-display), Georgia, serif'
                          : 'sans-serif',
                    }}
                    className="bg-[var(--color-input-bg)] text-[var(--color-input-texto)] py-2 text-base"
                  >
                    {f.label} ({f.style})
                  </option>
                ))}
              </select>
            </div>

            {/* Muestra visual en vivo del texto */}
            <div
              className="mt-2.5 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--color-borde)] text-xs text-[var(--color-texto)] opacity-80 leading-relaxed"
              style={{
                fontFamily:
                  fontBody === 'Inter'
                    ? 'var(--font-inter), sans-serif'
                    : fontBody === 'Outfit'
                    ? 'var(--font-outfit), sans-serif'
                    : fontBody === 'Playfair Display'
                    ? 'var(--font-playfair-display), Georgia, serif'
                    : fontBody === 'Space Grotesk'
                    ? 'var(--font-space-grotesk), sans-serif'
                    : fontBody === 'DM Serif Display'
                    ? 'var(--font-dm-serif-display), Georgia, serif'
                    : 'sans-serif',
              }}
            >
              Impresión 3D de alta precisión con filamento PLA premium y corte láser CNC.
            </div>
          </div>
        </div>

        {/* Pie de tarjeta con feedback y botón de guardar */}
        <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[var(--color-borde)]">
          <div className="min-h-[20px]">
            {successMsg && (
              <div className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] font-bold text-xs sm:text-sm hover:bg-[#eab308] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#1F2937]" />
                <span>Guardar Tipografías</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    {/* Fin Columna Izquierda */}

    {/* Columna Derecha: Vista Previa en Tiempo Real (Sticky en Desktop, fiel reflejo y no cliqueable) */}
    <div className="xl:col-span-5 2xl:col-span-5 xl:sticky xl:top-6 xl:self-start">
      <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Cabecera de controles del simulador */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-borde)]">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#CA8A04] dark:text-[#FACC15]" />
                <span>Vista Previa en Tiempo Real</span>
              </h2>
            </div>
            <p className="text-[11px] opacity-65 mt-0.5">
              Fiel reflejo visual con micro-proporciones realistas.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
            {/* Selector de Dispositivo (Desktop / Celular) */}
            <div className="flex items-center rounded-xl bg-black/5 dark:bg-white/10 p-0.5 border border-[var(--color-borde)] text-[11px]">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                title="Vista de Computadora"
                className={`min-h-[36px] px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  previewDevice === 'desktop'
                    ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-xs font-bold'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Escritorio</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                title="Vista de Celular"
                className={`min-h-[36px] px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  previewDevice === 'mobile'
                    ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-xs font-bold'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Celular</span>
              </button>
            </div>

            {/* Toggle Claro / Oscuro para el preview */}
            <div className="flex items-center rounded-xl bg-black/5 dark:bg-white/10 p-0.5 border border-[var(--color-borde)] text-[11px]">
              <button
                type="button"
                onClick={() => setPreviewMode('claro')}
                title="Modo Claro"
                className={`min-h-[36px] px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  previewMode === 'claro'
                    ? 'bg-white text-black shadow-xs font-bold'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Claro</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('oscuro')}
                title="Modo Oscuro"
                className={`min-h-[36px] px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  previewMode === 'oscuro'
                    ? 'bg-zinc-900 text-white shadow-xs font-bold'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-blue-400" />
                <span>Oscuro</span>
              </button>
            </div>
          </div>
        </div>

        {/* Marco de Simulación Proporcional y Realista (no cliqueable, solo visual) */}
        <div
          className={`transition-all duration-300 mx-auto select-none pointer-events-none cursor-default [&_*]:pointer-events-none ${
            previewDevice === 'mobile'
              ? 'max-w-[340px] rounded-[36px] border-[6px] border-slate-800 dark:border-slate-700 shadow-2xl p-0.5 bg-slate-900'
              : 'w-full rounded-2xl border border-slate-300 dark:border-slate-700 shadow-xl'
          } overflow-hidden`}
        >
          {/* Si es móvil: Notch y Barra de Estado superior de teléfono */}
          {previewDevice === 'mobile' ? (
            <div className="bg-slate-900 text-white text-[9px] px-5 py-1.5 flex items-center justify-between font-mono">
              <span>9:41</span>
              <div className="w-20 h-3 bg-black rounded-full mx-auto" />
              <div className="flex items-center gap-1">
                <span>5G</span>
                <span className="w-2.5 h-2 rounded-xs border border-white inline-block relative after:absolute after:inset-0.5 after:bg-white" />
              </div>
            </div>
          ) : (
            /* Si es escritorio: Barra de navegador moderna con URL y botones */
            <div className="bg-slate-200 dark:bg-slate-800 px-3.5 py-1.5 border-b border-slate-300 dark:border-slate-700 flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              </div>
              <div className="flex-1 max-w-[260px] mx-auto text-center bg-white/80 dark:bg-slate-900/80 rounded-md py-0.5 px-2 text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate flex items-center justify-center gap-1 shadow-2xs">
                <Lock className="w-2.5 h-2.5 opacity-60 shrink-0" />
                <span className="truncate">{store.slug ? `${store.slug}.portalmaker.com.ar` : 'mi-tienda.portalmaker.com.ar'}</span>
              </div>
            </div>
          )}

          {/* Lienzo del Sitio Web (con los colores dinámicos exactos del store) */}
          <div
            className="transition-colors duration-300 overflow-hidden relative"
            style={{
              backgroundColor: currentFondo,
              color: currentTexto,
              fontFamily: getFontFamily(fontBody),
            }}
          >
            {/* 1. Top Bar sutil de anuncios */}
            <div
              className="px-3 py-1 text-[9px] font-medium flex items-center justify-center gap-1.5 text-center text-white"
              style={{ backgroundColor: currentPrimario }}
            >
              <Truck className="w-3 h-3 shrink-0" />
              <span className="truncate">
                Envíos a todo el país • {whatsapp ? `WhatsApp: ${whatsapp}` : 'Consultas por WhatsApp'}
              </span>
            </div>

            {/* 2. Cabecera (Header Principal) */}
            <div className="px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2 border-b border-black/5 dark:border-white/5">
              {/* Logo y Nombre de Marca */}
              <div className="flex items-center gap-2 min-w-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={nombre}
                    className={`w-auto object-contain shrink-0 transition-all ${
                      logoTamano === 'chico'
                        ? 'h-5 max-w-[70px]'
                        : logoTamano === 'grande'
                        ? 'h-8 max-w-[110px]'
                        : logoTamano === 'xl'
                        ? 'h-10 max-w-[130px]'
                        : 'h-6 max-w-[90px]'
                    }`}
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-2xs"
                    style={{ backgroundColor: currentPrimario }}
                  >
                    {(nombre || 'M').charAt(0).toUpperCase()}
                  </div>
                )}

                {(!logoUrl || mostrarNombreHeader) && (
                  <div className="min-w-0">
                    <h3
                      className="font-bold text-[11px] leading-tight truncate uppercase tracking-tight"
                      style={{
                        color: currentPrimario,
                        fontFamily: getFontFamily(fontHeading),
                      }}
                    >
                      {nombre || 'Mi Tienda Maker'}
                    </h3>
                    {slogan && (
                      <p
                        className="text-[8px] opacity-70 truncate max-w-[140px] leading-tight mt-0.5"
                        style={{ fontFamily: getFontFamily(fontBody) }}
                      >
                        {slogan}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Acciones del Header: Buscador compacto + Íconos */}
              <div className="flex items-center gap-1.5 shrink-0">
                {previewDevice === 'desktop' && (
                  <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[9px] text-slate-400 w-24">
                    <Search className="w-2.5 h-2.5" />
                    <span>Buscar...</span>
                  </div>
                )}
                <div className="p-1 rounded-md border border-black/10 dark:border-white/10 opacity-70">
                  {isDark ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                </div>
                <div className="p-1 rounded-md border border-black/10 dark:border-white/10 opacity-70 relative">
                  <ShoppingBag className="w-3 h-3" />
                  <span
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full text-[7px] text-white font-bold flex items-center justify-center"
                    style={{ backgroundColor: currentPrimario }}
                  >
                    0
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Navegación (StoreNavbar) */}
            <div className="px-3 py-1 flex items-center justify-center gap-4 text-[9px] font-medium border-b border-black/5 dark:border-white/5 opacity-80">
              <span
                className="font-bold pb-0.5 border-b-2"
                style={{
                  color: currentPrimario,
                  borderColor: currentPrimario,
                }}
              >
                Productos
              </span>
              <span>Categorías</span>
              <span>Sobre Nosotros</span>
              <span>Contacto</span>
            </div>

            {/* 4. Mini Banner Hero Estilo Maker */}
            <div className="p-2.5 sm:p-3">
              <div
                className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-zinc-900 via-neutral-900 to-zinc-800 text-white flex flex-col items-start gap-1 shadow-sm relative overflow-hidden"
              >
                <div className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-amber-400">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Catálogo Exclusivo</span>
                </div>
                <h4
                  className="text-xs sm:text-sm font-bold leading-tight"
                  style={{ fontFamily: getFontFamily(fontHeading) }}
                >
                  Piezas 3D & Soluciones Maker
                </h4>
                <p className="text-[8px] opacity-75 max-w-[220px] leading-tight">
                  Diseño personalizado e insumos de máxima precisión.
                </p>
                <div
                  className="mt-1 px-2.5 py-0.5 rounded-md text-[8px] font-bold text-white shadow-xs inline-flex items-center gap-1"
                  style={{ backgroundColor: currentPrimario }}
                >
                  <span>Explorar Piezas</span>
                </div>
              </div>
            </div>

            {/* 5. Catálogo de Productos */}
            <div className="px-2.5 sm:px-3 pb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider opacity-80"
                  style={{ fontFamily: getFontFamily(fontHeading) }}
                >
                  Productos Destacados
                </span>
                <span className="text-[8px] opacity-50 font-medium">Ver todos (12)</span>
              </div>

              {/* Grilla de Productos proporcional */}
              <div className={`grid gap-2 ${previewDevice === 'desktop' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {/* Producto 1 */}
                <div
                  className="rounded-xl p-2 border flex flex-col justify-between gap-1.5 shadow-2xs transition-all"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  }}
                >
                  <div className="aspect-square w-full rounded-lg bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center relative overflow-hidden p-1">
                    <span className="absolute top-1 left-1 text-[7px] font-bold px-1 rounded-xs bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      PLA+
                    </span>
                    <Box className="w-5 h-5 opacity-40 text-slate-500" />
                    <span className="text-[7px] opacity-50 font-mono mt-0.5">Filamento 1kg</span>
                  </div>
                  <div className="space-y-0.5">
                    <h5
                      className="font-bold text-[9px] truncate"
                      style={{ fontFamily: getFontFamily(fontHeading) }}
                    >
                      Filamento PLA Premium
                    </h5>
                    <p className="text-[10px] font-bold" style={{ color: currentPrimario }}>
                      $24.500
                    </p>
                  </div>
                  <div
                    className="w-full py-1 rounded-md text-[8px] font-bold text-white shadow-2xs flex items-center justify-center gap-1"
                    style={{ backgroundColor: currentPrimario }}
                  >
                    <ShoppingBag className="w-2.5 h-2.5" />
                    <span>Comprar</span>
                  </div>
                </div>

                {/* Producto 2 */}
                <div
                  className="rounded-xl p-2 border flex flex-col justify-between gap-1.5 shadow-2xs transition-all"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  }}
                >
                  <div className="aspect-square w-full rounded-lg bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center relative overflow-hidden p-1">
                    <span className="absolute top-1 left-1 text-[7px] font-bold px-1 rounded-xs bg-blue-500/20 text-blue-700 dark:text-blue-300">
                      Gamer
                    </span>
                    <Box className="w-5 h-5 opacity-40 text-slate-500" />
                    <span className="text-[7px] opacity-50 font-mono mt-0.5">Stand RGB</span>
                  </div>
                  <div className="space-y-0.5">
                    <h5
                      className="font-bold text-[9px] truncate"
                      style={{ fontFamily: getFontFamily(fontHeading) }}
                    >
                      Soporte Gamer Pro
                    </h5>
                    <p className="text-[10px] font-bold" style={{ color: currentPrimario }}>
                      $18.900
                    </p>
                  </div>
                  <div
                    className="w-full py-1 rounded-md text-[8px] font-bold text-white shadow-2xs flex items-center justify-center gap-1"
                    style={{ backgroundColor: currentPrimario }}
                  >
                    <ShoppingBag className="w-2.5 h-2.5" />
                    <span>Comprar</span>
                  </div>
                </div>

                {/* Producto 3 (visible en escritorio) */}
                {previewDevice === 'desktop' && (
                  <div
                    className="rounded-xl p-2 border flex flex-col justify-between gap-1.5 shadow-2xs transition-all"
                    style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    }}
                  >
                    <div className="aspect-square w-full rounded-lg bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center relative overflow-hidden p-1">
                      <span className="absolute top-1 left-1 text-[7px] font-bold px-1 rounded-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        Nuevo
                      </span>
                      <Box className="w-5 h-5 opacity-40 text-slate-500" />
                      <span className="text-[7px] opacity-50 font-mono mt-0.5">Organizador</span>
                    </div>
                    <div className="space-y-0.5">
                      <h5
                        className="font-bold text-[9px] truncate"
                        style={{ fontFamily: getFontFamily(fontHeading) }}
                      >
                        Organizador Modular
                      </h5>
                      <p className="text-[10px] font-bold" style={{ color: currentPrimario }}>
                        $12.300
                      </p>
                    </div>
                    <div
                      className="w-full py-1 rounded-md text-[8px] font-bold text-white shadow-2xs flex items-center justify-center gap-1"
                      style={{ backgroundColor: currentPrimario }}
                    >
                      <ShoppingBag className="w-2.5 h-2.5" />
                      <span>Comprar</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 6. Footer de Confianza */}
            <div className="px-3 py-1.5 border-t border-black/5 dark:border-white/5 text-[7px] opacity-60 text-center flex items-center justify-center gap-3">
              <span className="flex items-center gap-0.5">
                <Truck className="w-2 h-2" />
                <span>Envíos rápidos</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <ShieldCheck className="w-2 h-2" />
                <span>Garantía Maker</span>
              </span>
            </div>

            {/* 7. Botón Flotante de WhatsApp */}
            <div className="absolute bottom-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-md">
              <WhatsAppIcon className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
    {/* Fin Columna Derecha */}
  </div>
  {/* Fin Grid */}
</form>
  )
}
