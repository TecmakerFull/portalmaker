// =============================================================================
// PORTALMAKER — Formulario de Creación Rápida de Tienda (Estilo Onboarding)
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { COLOR_PRESETS, RUBROS_TIENDA, RUBROS_SERVICIOS, TIPOS_NEGOCIO } from '@/lib/constants'
import StyledSelect from '@/components/styled-select'
import type { TipoNegocio } from '@/types/database'
import { Loader2, ArrowRight, AlertCircle, Sparkles, Package, CalendarCheck, Layers, Check } from 'lucide-react'

// Íconos de cada opción de "¿Qué ofrecés?"
const TIPO_ICONOS = { productos: Package, servicios: CalendarCheck, ambos: Layers } as const

// Opciones de "Otro" que habilitan el campo de texto libre
const RUBROS_OTRO = ['Otro rubro', 'Otro servicio']

export default function CrearTiendaForm({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  // Sin rubro preseleccionado: antes arrancaba en "Impresión 3D" y quien no lo
  // cambiaba quedaba con ese slogan aunque vendiera otra cosa.
  const [rubro, setRubro] = useState<string>('')
  // Se pregunta antes que el rubro: define si la tienda vende productos, da turnos o ambas cosas
  const [tipo, setTipo] = useState<TipoNegocio | ''>('')
  const [rubroPersonalizado, setRubroPersonalizado] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const supabase = createSupabaseBrowserClient()

  // Autocompletar slug amigable a partir del nombre
  const handleNombreChange = (val: string) => {
    setNombre(val)
    // normalize('NFD') separa los acentos para que "Café Ñandú" quede "cafe-nandu"
    // en vez de perder letras ("caf-and").
    const generatedSlug = val
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
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
      // Si eligió 'Otro rubro', usar lo que escribió en el campo de texto
      if (!tipo) {
        throw new Error('Elegí si ofrecés productos, servicios o ambos.')
      }

      const rubroFinal = RUBROS_OTRO.includes(rubro)
        ? (rubroPersonalizado.trim() || 'Tienda online')
        : rubro

      // Paleta por defecto: 06 Yellow & Gray (preset 6)
      const defaultPreset = COLOR_PRESETS.find((p) => p.id === 6) ?? COLOR_PRESETS[0]

      const { data, error } = await supabase
        .from('stores')
        .insert({
          nombre: nombre.trim(),
          slug: slug.trim().toLowerCase(),
          admin_email: userEmail,
          slogan: rubroFinal,
          tipo_negocio: tipo,
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
          Nombre de tu Tienda
        </label>
        <input
          type="text"
          required
          value={nombre}
          onChange={(e) => handleNombreChange(e.target.value)}
          placeholder="Nombre de tu tienda"
          className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)] text-[var(--color-input-texto)] placeholder:text-[var(--color-input-placeholder)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:border-[#FF5500] transition-colors"
        />
      </div>

      {/* Subdominio */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-texto)] opacity-80 mb-1.5">
          Dirección Web (Subdominio)
        </label>
        <div className="flex items-center rounded-xl border border-[var(--color-input-borde)] overflow-hidden bg-[var(--color-input-bg)] focus-within:ring-2 focus-within:ring-[#FF5500] focus-within:border-[#FF5500] transition-colors">
          <input
            type="text"
            required
            pattern="^[a-z0-9-]+$"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="mitienda"
            className="w-full min-h-[46px] px-4 py-2.5 text-sm bg-transparent text-[var(--color-input-texto)] placeholder:text-[var(--color-input-placeholder)] focus:outline-none"
          />
          <span className="bg-[var(--color-input-bg-muted)] px-3.5 py-3 text-xs font-semibold text-[var(--color-texto-muted)] font-mono shrink-0 border-l border-[var(--color-input-borde)]">
            .portalmaker.ar
          </span>
        </div>
      </div>

      {/* ¿Qué ofrecés? Se pregunta antes que el rubro porque cambia todo el panel:
          con servicios se ocultan envíos y carrito y aparece la agenda de turnos. */}
      <fieldset className="space-y-2">
        <legend className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-texto)] opacity-80 mb-1.5">
          ¿Qué ofrecés?
        </legend>
        <div className={`grid grid-cols-1 gap-2 ${TIPOS_NEGOCIO.length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`} role="radiogroup">
          {TIPOS_NEGOCIO.map((opcion) => {
            const Icon = TIPO_ICONOS[opcion.id]
            const activo = tipo === opcion.id
            return (
              <button
                key={opcion.id}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => {
                  setTipo(opcion.id)
                  setRubro('')
                  setRubroPersonalizado('')
                }}
                className={`relative min-h-[64px] p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-start gap-2.5 ${
                  activo
                    ? 'border-[#FF5500] bg-[#FF5500]/10'
                    : 'border-[var(--color-input-borde)] bg-[var(--color-input-bg)] hover:border-[#FF5500]/50'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${activo ? 'text-[#FF5500]' : 'opacity-60'}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--color-texto)]">{opcion.label}</span>
                  <span className="block text-[11px] opacity-70 leading-snug text-[var(--color-texto)]">{opcion.descripcion}</span>
                </span>
                {activo && <Check className="w-4 h-4 text-[#FF5500] absolute top-2 right-2" />}
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Rubro: la lista depende de lo que ofrece */}
      {tipo && (
        <div className="space-y-3">
          <div>
            <label htmlFor="rubro" className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-texto)] opacity-80 mb-1.5">
              {tipo === 'servicios' ? '¿Qué servicio das?' : '¿Qué vendés?'}
            </label>
            <StyledSelect
              id="rubro"
              required
              value={rubro}
              onChange={(v) => setRubro(v)}
              placeholder="Elegí el rubro de tu tienda"
              options={[
                ...((tipo === 'servicios' || tipo === 'ambos') ? RUBROS_SERVICIOS.map((r) => ({ value: r.label, label: r.label, group: 'Servicios' })) : []),
                ...((tipo === 'productos' || tipo === 'ambos') ? RUBROS_TIENDA.map((r) => ({ value: r.label, label: r.label, group: 'Productos' })) : []),
              ]}
            />
          </div>

          {/* Campo libre si elige "Otro" */}
          {RUBROS_OTRO.includes(rubro) && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
              <label htmlFor="rubro-otro" className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-texto)] opacity-80">
                Contanos en pocas palabras
              </label>
              <input
                id="rubro-otro"
                type="text"
                required
                autoFocus
                maxLength={80}
                value={rubroPersonalizado}
                onChange={(e) => setRubroPersonalizado(e.target.value)}
                placeholder={tipo === 'servicios' ? 'Ej: Clases de guitarra' : 'Ej: Cocinas y hornos'}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)] text-[var(--color-input-texto)] placeholder:text-[var(--color-input-placeholder)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5500]/25 focus:border-[#FF5500] transition-colors"
              />
            </div>
          )}
        </div>
      )}

      {/* Botón de Enviar */}
      <button
        type="submit"
        disabled={loading}
        className="w-full min-h-[48px] mt-2 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#FF5500] text-white text-sm font-bold hover:bg-[#E04B00] active:scale-[0.99] transition-all disabled:opacity-50 shadow-md cursor-pointer"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-white" />
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-white" />
            <span>Crear y Configurar Mi Tienda</span>
            <ArrowRight className="w-4 h-4 text-white ml-1" />
          </>
        )}
      </button>
    </form>
  )
}

