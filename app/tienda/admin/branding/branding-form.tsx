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
} from 'lucide-react'
import WhatsAppIcon from '@/app/tienda/sections/whatsapp-icon'
import { compressImageFile } from '@/lib/image-compression'

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
  const [mostrarNombreTienda, setMostrarNombreTienda] = useState((store as any).mostrar_nombre_tienda ?? true)
  const [uploadingLogo, setUploadingLogo] = useState(false)

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

  // Manejador del input de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadLogoFile(file)
    }
    if (e.target) e.target.value = ''
  }

  // Manejador para pegar imagen con Ctrl + V
  const handlePasteLogo = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          uploadLogoFile(file)
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
          mostrar_nombre_tienda: mostrarNombreTienda,
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
  const currentPrimario = previewMode === 'claro' ? colorPrimario : colorPrimarioDark
  const currentFondo = previewMode === 'claro' ? colorFondo : colorFondoDark
  const currentTexto = previewMode === 'claro' ? colorTexto : colorTextoDark

  return (
    <form onSubmit={handleSave} className="space-y-6">
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

            <div className="flex items-center gap-2 self-end sm:self-center">
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
      </div>

      {/* 3. Paletas de Color Preset (10 Opciones Oficiales) */}
      <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
            <span>Paleta de Colores de la Tienda (10 Opciones)</span>
          </h2>
          <p className="text-xs opacity-70 mt-0.5">
            Selecciona una de las 10 paletas de diseño. Cada una incluye sus versiones automáticas en modo claro y modo oscuro.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COLOR_PRESETS.map((preset) => {
            const isSelected = colorPrimario === preset.claro.primario && colorSecundario === preset.claro.secundario

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
      </div>

      {/* 5. Previsualización en Vivo */}
      <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
              <span>Vista Previa en Tiempo Real</span>
            </h2>
            <p className="text-xs opacity-70 mt-0.5">
              Así lucirá la cabecera y una tarjeta de producto en tu tienda para tus visitantes.
            </p>
          </div>

          {/* Toggle Claro / Oscuro para el preview */}
          <div className="flex items-center rounded-xl bg-black/5 dark:bg-white/10 p-1 border border-[var(--color-borde)] text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setPreviewMode('claro')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                previewMode === 'claro'
                  ? 'bg-white shadow-xs text-black'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Modo Claro
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('oscuro')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                previewMode === 'oscuro'
                  ? 'bg-black text-white shadow-xs'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Modo Oscuro
            </button>
          </div>
        </div>

        {/* Caja de Preview con los estilos dinámicos modernos */}
        <div
          className="rounded-3xl transition-colors duration-300 border border-slate-300 dark:border-slate-700 shadow-xl overflow-hidden relative"
          style={{
            backgroundColor: currentFondo,
            color: currentTexto,
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
          {/* 1. Barra de Navegador simulada */}
          <div className="bg-slate-200 dark:bg-slate-800 px-4 py-2 border-b border-slate-300 dark:border-slate-700 flex items-center gap-2 select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            </div>
            <div className="flex-1 max-w-xs mx-auto text-center bg-white/70 dark:bg-slate-900/70 rounded-md py-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
              {store.slug ? `${store.slug}.portalmaker.com.ar` : 'mi-tienda.portalmaker.com.ar'}
            </div>
          </div>

          {/* 2. Top Bar sutil con mensaje */}
          <div
            className="px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 text-center text-white"
            style={{ backgroundColor: currentPrimario }}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Envíos a todo el país • Consultas por WhatsApp</span>
          </div>

          {/* 3. Header Principal Moderno */}
          <div className="p-4 sm:p-5 flex items-center justify-between gap-4 border-b border-black/5 dark:border-white/5">
            {/* Buscador Pill */}
            <div className="p-2.5 rounded-2xl border border-black/10 dark:border-white/10 flex items-center justify-center opacity-70">
              <Search className="w-4 h-4" />
            </div>

            {/* Logo y Nombre de Marca */}
            <div className="flex flex-col items-center text-center">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={nombre}
                  className="h-10 w-auto max-w-[120px] object-contain rounded-lg mb-1 shadow-2xs"
                />
              )}
              {mostrarNombreTienda && (
                <h3
                  className="text-base sm:text-lg font-bold uppercase tracking-tight"
                  style={{
                    color: currentPrimario,
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
                  {nombre || 'Nombre de la Tienda'}
                </h3>
              )}
              {slogan && <p className="text-[11px] opacity-70 mt-0.5">{slogan}</p>}
            </div>

            {/* Íconos Tema & Carrito */}
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-2xl border border-black/10 dark:border-white/10 flex items-center justify-center opacity-70">
                {previewMode === 'claro' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div className="p-2.5 rounded-2xl border border-black/10 dark:border-white/10 flex items-center justify-center opacity-70">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 4. Navbar de Secciones */}
          <div className="px-4 py-2.5 flex items-center justify-center gap-6 text-xs font-semibold border-b border-black/5 dark:border-white/5 opacity-80">
            <span className="hover:opacity-100 cursor-pointer">Productos</span>
            <span className="hover:opacity-100 cursor-pointer">Contacto & Ubicación</span>
          </div>

          {/* 5. Contenido & Catálogo Simulado */}
          <div className="p-4 sm:p-6 space-y-5">
            {/* Mini Banner Promocional */}
            <div
              className="p-5 rounded-2xl bg-gradient-to-r from-black/80 to-black/60 text-white flex flex-col items-start gap-2 shadow-sm"
              style={{
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                Lanzamiento Especial
              </span>
              <h4 className="text-base sm:text-lg font-bold">Piezas 3D & Insumos Maker</h4>
              <button
                type="button"
                className="mt-1 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90"
                style={{ backgroundColor: currentPrimario }}
              >
                Ver Producto
              </button>
            </div>

            {/* Grilla de 2 Productos */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Producto 1 */}
              <div
                className="rounded-2xl p-3 border space-y-2 shadow-2xs"
                style={{
                  backgroundColor: previewMode === 'oscuro' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  borderColor: previewMode === 'oscuro' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                }}
              >
                <div className="aspect-square w-full rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center text-[11px] opacity-60">
                  Foto 3D
                </div>
                <div className="space-y-1">
                  <h5 className="font-bold text-xs truncate">Filamento PLA 1kg</h5>
                  <p className="text-sm font-bold" style={{ color: currentPrimario }}>
                    $24.000
                  </p>
                </div>
                <button
                  type="button"
                  className="w-full py-2 rounded-xl text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: currentPrimario }}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Agregar</span>
                </button>
              </div>

              {/* Producto 2 */}
              <div
                className="rounded-2xl p-3 border space-y-2 shadow-2xs"
                style={{
                  backgroundColor: previewMode === 'oscuro' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  borderColor: previewMode === 'oscuro' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                }}
              >
                <div className="aspect-square w-full rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center text-[11px] opacity-60">
                  Foto 3D
                </div>
                <div className="space-y-1">
                  <h5 className="font-bold text-xs truncate">Soporte Gamer RGB</h5>
                  <p className="text-sm font-bold" style={{ color: currentPrimario }}>
                    $18.500
                  </p>
                </div>
                <button
                  type="button"
                  className="w-full py-2 rounded-xl text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: currentPrimario }}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Agregar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Botón Flotante de WhatsApp en la esquina */}
          <div className="absolute bottom-4 right-4 z-10 w-11 h-11 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer">
            <WhatsAppIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Botón de Guardar y Feedback */}
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
          disabled={loading}
          className="min-h-[48px] px-8 py-3 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-bold hover:bg-[#eab308] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs cursor-pointer shrink-0"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
          ) : (
            <>
              <Check className="w-4 h-4 text-[#1F2937]" />
              <span>Guardar Configuración de Marca</span>
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
  )
}
