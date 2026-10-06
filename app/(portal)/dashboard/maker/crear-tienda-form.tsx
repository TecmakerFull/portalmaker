// =============================================================================
// PORTALMAKER — Formulario de Creación Rápida de Tienda (Estilo Onboarding)
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { COLOR_PRESETS } from '@/lib/constants'
import { Loader2, ArrowRight, AlertCircle, Sparkles, ChevronDown } from 'lucide-react'

const RUBROS_MAKER = [
  { id: 'impresion_3d', label: 'Impresión 3D (FDM / Resina)' },
  { id: 'corte_laser', label: 'Corte y Grabado Láser' },
  { id: 'mecanizado_cnc', label: 'Mecanizado CNC / Router' },
  { id: 'taller_integral', label: 'Taller Maker Integral (3D + Láser + CNC)' },
  { id: 'modelado_3d', label: 'Modelado y Diseño 3D a Medida' },
  { id: 'insumos_repuestos', label: 'Insumos, Filamentos y Repuestos' },
  { id: 'objetos_diseno', label: 'Objetos de Diseño & Artesanías Maker' },
  { id: 'otro', label: 'Otro rubro' },
]

export default function CrearTiendaForm({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [rubro, setRubro] = useState(RUBROS_MAKER[0].label)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const supabase = createSupabaseBrowserClient()

  // Autocompletar slug amigable a partir del nombre
  const handleNombreChange = (val: string) => {
    setNombre(val)
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    setSlug(generatedSlug)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    try {
      // Paleta por defecto: 06 Yellow & Gray (preset 6)
      const defaultPreset = COLOR_PRESETS.find((p) => p.id === 6) ?? COLOR_PRESETS[0]

      const { data, error } = await supabase
        .from('stores')
        .insert({
          nombre: nombre.trim(),
          slug: slug.trim().toLowerCase(),
          admin_email: userEmail,
          slogan: rubro,
          color_primario: defaultPreset.claro.primario,
          color_secundario: defaultPreset.claro.secundario,
          color_fondo: defaultPreset.claro.fondo,
          color_texto: defaultPreset.claro.texto,
          color_primario_dark: defaultPreset.oscuro.primario,
          color_secundario_dark: defaultPreset.oscuro.secundario,
          color_fondo_dark: defaultPreset.oscuro.fondo,
          color_texto_dark: defaultPreset.oscuro.texto,
          font_heading: 'Outfit',
          font_body: 'Inter',
          suscripcion_activa: true,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('El subdominio ya está en uso. Por favor elige otro nombre o subdominio.')
        }
        throw error
      }

      router.refresh()
    } catch (err: unknown) {
      setErrorMsg((err as Error)?.message || 'Error al crear la tienda.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Nombre de la Tienda */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-texto)] opacity-80 mb-1.5">
          Nombre de tu Tienda o Taller
        </label>
        <input
          type="text"
          required
          value={nombre}
          onChange={(e) => handleNombreChange(e.target.value)}
          placeholder="Ej: TecMaker 3D"
          className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)] text-[var(--color-input-texto)] placeholder:text-[var(--color-input-placeholder)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15] focus:border-[#FACC15] transition-colors"
        />
      </div>

      {/* Subdominio */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-texto)] opacity-80 mb-1.5">
          Dirección Web (Subdominio)
        </label>
        <div className="flex items-center rounded-xl border border-[var(--color-input-borde)] overflow-hidden bg-[var(--color-input-bg)] focus-within:ring-2 focus-within:ring-[#FACC15] focus-within:border-[#FACC15] transition-colors">
          <input
            type="text"
            required
            pattern="^[a-z0-9-]+$"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="tecmaker"
            className="w-full min-h-[46px] px-4 py-2.5 text-sm bg-transparent text-[var(--color-input-texto)] placeholder:text-[var(--color-input-placeholder)] focus:outline-none"
          />
          <span className="bg-[var(--color-input-bg-muted)] px-3.5 py-3 text-xs font-semibold text-[var(--color-texto-muted)] font-mono shrink-0 border-l border-[var(--color-input-borde)]">
            .portalmaker.ar
          </span>
        </div>
      </div>

      {/* Rubro Principal */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-texto)] opacity-80 mb-1.5">
          Rubro o Especialidad Principal
        </label>
        <div className="relative">
          <select
            value={rubro}
            onChange={(e) => setRubro(e.target.value)}
            className="w-full min-h-[46px] px-4 py-2.5 pr-10 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)] text-[var(--color-input-texto)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15] focus:border-[#FACC15] transition-colors appearance-none cursor-pointer"
          >
            {RUBROS_MAKER.map((r) => (
              <option key={r.id} value={r.label} className="bg-[var(--color-input-bg)] text-[var(--color-input-texto)]">
                {r.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 top-0 bottom-0 flex items-center pointer-events-none opacity-60">
            <ChevronDown className="w-4 h-4 text-[var(--color-texto-muted)]" />
          </div>
        </div>
      </div>

      {/* Botón de Enviar */}
      <button
        type="submit"
        disabled={loading}
        style={{ color: '#1F2937' }}
        className="w-full min-h-[48px] mt-2 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-bold hover:bg-[#eab308] active:scale-[0.99] transition-all disabled:opacity-50 shadow-md cursor-pointer"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-[#1F2937]" />
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-[#1F2937]" />
            <span>Crear y Configurar Mi Tienda</span>
            <ArrowRight className="w-4 h-4 text-[#1F2937] ml-1" />
          </>
        )}
      </button>
    </form>
  )
}

