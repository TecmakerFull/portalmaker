// =============================================================================
// PORTALMAKER — Formulario de Personalización de Branding y Paletas
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { COLOR_PRESETS, AVAILABLE_FONTS } from '@/lib/constants'
import type { Store } from '@/types/database'
import { Check, Palette, Type, MessageSquare, Loader2, AlertCircle, Sparkles } from 'lucide-react'

interface BrandingFormProps {
  store: Store
  tenantQuery: string
}

export default function BrandingForm({ store, tenantQuery }: BrandingFormProps) {
  const router = useRouter()

  // Datos de Marca
  const [nombre, setNombre] = useState(store.nombre)
  const [slogan, setSlogan] = useState(store.slogan ?? '')
  const [whatsapp, setWhatsapp] = useState(store.whatsapp_numero ?? '')

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
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Información General y WhatsApp */}
      <div className="bg-white rounded-2xl border border-black/10 p-5 sm:p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-black/90 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#6B8F71]" />
          <span>Información de la Tienda</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-black/70 mb-1.5">
              Nombre de la Tienda *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6B8F71]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-black/70 mb-1.5">
              Número de WhatsApp para pedidos
            </label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Ej: 5491112345678"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6B8F71]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-black/70 mb-1.5">
              Slogan o Frase Destacada
            </label>
            <input
              type="text"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              placeholder="Ej: Impresiones 3D personalizadas y de alta precisión"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6B8F71]"
            />
          </div>
        </div>
      </div>

      {/* 2. Paletas de Color Preset (10 Opciones Oficiales) */}
      <div className="bg-white rounded-2xl border border-black/10 p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-black/90 flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#FACC15]" />
            <span>Paleta de Colores de la Tienda (10 Opciones)</span>
          </h2>
          <p className="text-xs text-black/50 mt-0.5">
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
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-[#FACC15] ring-2 ring-[#FACC15]/40 bg-[#FACC15]/5 shadow-sm'
                    : 'border-black/10 hover:border-black/25 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-black/90">{preset.nombre}</span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[#CA8A04] bg-[#FDE68A] px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        <span>Activa</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-black/60 mt-1">
                    {preset.descripcion}
                  </p>
                  <p className="text-[10px] text-black/40 mt-0.5 font-mono">
                    {preset.tags}
                  </p>
                </div>

                {/* Los 5 colores de la paleta */}
                <div className="flex items-center gap-1.5 pt-1">
                  {preset.coloresHex.map((hex, idx) => (
                    <span
                      key={idx}
                      className="flex-1 h-6 rounded-md border border-black/15 shadow-2xs"
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

      {/* 3. Selector de Tipografías */}
      <div className="bg-white rounded-2xl border border-black/10 p-5 sm:p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-black/90 flex items-center gap-2">
          <Type className="w-4 h-4 text-[#6B8F71]" />
          <span>Tipografías de la Tienda</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-black/70 mb-1.5">
              Fuente para Títulos
            </label>
            <select
              value={fontHeading}
              onChange={(e) => setFontHeading(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6B8F71]"
            >
              {AVAILABLE_FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label} ({f.style})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-black/70 mb-1.5">
              Fuente para Textos de Cuerpo
            </label>
            <select
              value={fontBody}
              onChange={(e) => setFontBody(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6B8F71]"
            >
              {AVAILABLE_FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label} ({f.style})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Previsualización en Vivo */}
      <div className="bg-white rounded-2xl border border-black/10 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-black/90 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#6B8F71]" />
              <span>Vista Previa en Tiempo Real</span>
            </h2>
            <p className="text-xs text-black/50">
              Así lucirá la cabecera y una tarjeta de producto en tu tienda.
            </p>
          </div>

          {/* Toggle Claro / Oscuro para el preview */}
          <div className="flex items-center rounded-xl bg-black/5 p-1 border border-black/10 text-xs">
            <button
              type="button"
              onClick={() => setPreviewMode('claro')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                previewMode === 'claro' ? 'bg-white shadow-xs text-black' : 'text-black/60'
              }`}
            >
              Modo Claro
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('oscuro')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                previewMode === 'oscuro' ? 'bg-black text-white shadow-xs' : 'text-black/60'
              }`}
            >
              Modo Oscuro
            </button>
          </div>
        </div>

        {/* Caja de Preview con los estilos dinámicos */}
        <div
          className="rounded-2xl p-6 transition-colors duration-300 border border-black/10 shadow-inner"
          style={{ backgroundColor: currentFondo, color: currentTexto }}
        >
          {/* Header simulado */}
          <div className="border-b pb-4 mb-6 flex items-center justify-between" style={{ borderColor: 'rgba(128,128,128,0.2)' }}>
            <div>
              <h3 className="text-xl font-bold" style={{ color: currentPrimario }}>
                {nombre || 'Nombre de la Tienda'}
              </h3>
              {slogan && <p className="text-xs opacity-75 mt-0.5">{slogan}</p>}
            </div>
            <span
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs"
              style={{ backgroundColor: currentPrimario }}
            >
              WhatsApp
            </span>
          </div>

          {/* Card simulada */}
          <div className="max-w-xs mx-auto rounded-xl p-4 border overflow-hidden shadow-sm" style={{ backgroundColor: 'rgba(128,128,128,0.08)', borderColor: 'rgba(128,128,128,0.15)' }}>
            <div className="aspect-video w-full rounded-lg bg-black/10 flex items-center justify-center text-xs opacity-60 mb-3">
              Foto de Producto
            </div>
            <h4 className="font-bold text-sm mb-1">Producto de Ejemplo</h4>
            <p className="text-base font-bold mb-3" style={{ color: currentPrimario }}>
              $15.000
            </p>
            <button
              type="button"
              className="w-full py-2 rounded-lg text-xs font-semibold text-white shadow-xs hover:opacity-90 transition-opacity"
              style={{ backgroundColor: currentPrimario }}
            >
              Consultar por WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* Botón de Guardar */}
      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={loading}
          className="min-h-[48px] px-8 py-3 rounded-xl bg-[#6B8F71] text-white text-sm font-semibold hover:bg-[#58775d] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Guardar Configuración de Marca</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
