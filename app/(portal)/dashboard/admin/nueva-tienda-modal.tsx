// =============================================================================
// PORTALMAKER — Modal de Alta de Tienda para Superadmin
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { COLOR_PRESETS } from '@/lib/constants'
import { PlusCircle, X, Loader2, Sparkles, ChevronDown, AlertCircle } from 'lucide-react'

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

export default function NuevaTiendaModal() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [rubro, setRubro] = useState(RUBROS_MAKER[0].label)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const supabase = createSupabaseBrowserClient()

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
      const defaultPreset = COLOR_PRESETS.find((p) => p.id === 6) ?? COLOR_PRESETS[0]

      const { data, error } = await supabase
        .from('stores')
        .insert({
          nombre: nombre.trim(),
          slug: slug.trim().toLowerCase(),
          admin_email: adminEmail.trim().toLowerCase(),
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
          throw new Error('El subdominio o el email ya tienen una tienda asignada.')
        }
        throw error
      }

      setIsOpen(false)
      setNombre('')
      setSlug('')
      setAdminEmail('')
      router.refresh()
    } catch (err: unknown) {
      setErrorMsg((err as Error)?.message || 'Error al crear la tienda.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{ color: '#1F2937' }}
        className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-bold hover:bg-[#eab308] active:scale-95 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
      >
        <PlusCircle className="w-4 h-4 text-[#1F2937]" />
        <span>Crear Nueva Tienda</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-6 sm:p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-bold font-[var(--font-portal-heading)]">
                Crear Tienda para Cliente Maker
              </h2>
              <p className="text-xs opacity-70 mt-1">
                La tienda se activará de inmediato y quedará asociada al email del maker.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider opacity-80 mb-1.5">
                  Nombre del Taller / Empresa
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => handleNombreChange(e.target.value)}
                  placeholder="Ej: Impresiones del Valle"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)] text-[var(--color-input-texto)] placeholder:text-[var(--color-input-placeholder)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider opacity-80 mb-1.5">
                  Subdominio
                </label>
                <div className="flex items-center rounded-xl border border-[var(--color-input-borde)] overflow-hidden bg-[var(--color-input-bg)] focus-within:ring-2 focus-within:ring-[#FACC15]">
                  <input
                    type="text"
                    required
                    pattern="^[a-z0-9-]+$"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="delvalle3d"
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-transparent text-[var(--color-input-texto)] placeholder:text-[var(--color-input-placeholder)] focus:outline-none"
                  />
                  <span className="bg-[var(--color-input-bg-muted)] px-3 py-2.5 text-xs font-semibold opacity-70 font-mono shrink-0 border-l border-[var(--color-input-borde)]">
                    .portalmaker.ar
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider opacity-80 mb-1.5">
                  Email del Dueño (para que acceda a su panel)
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="maker@gmail.com"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)] text-[var(--color-input-texto)] placeholder:text-[var(--color-input-placeholder)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider opacity-80 mb-1.5">
                  Rubro Principal
                </label>
                <div className="relative">
                  <select
                    value={rubro}
                    onChange={(e) => setRubro(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 pr-10 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)] text-[var(--color-input-texto)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15] appearance-none cursor-pointer"
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

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[var(--color-borde)] text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ color: '#1F2937' }}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-bold hover:bg-[#eab308] active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#1F2937]" />
                      <span>Dar de Alta Tienda</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
