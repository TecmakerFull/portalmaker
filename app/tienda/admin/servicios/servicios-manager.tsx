// =============================================================================
// PORTALMAKER — Panel: alta y edición de servicios
//
// Pensado para dueños que no quieren leer mucho: un formulario corto
// (nombre, duración, precio, foto) y el resto opcional. La duración se elige
// con botones de los valores más comunes para no tener que pensar en minutos.
// =============================================================================

'use client'

import { useState } from 'react'
import Link from 'next/link'
import PrecioServicio from '@/components/precio-servicio'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import RichTextEditor from '../components/rich-text-editor'
import CurrencyInput from '../components/currency-input'
import ImageGalleryDropzone from '../components/image-gallery-dropzone'
import { formatDuracion } from '@/lib/booking/format'
import type { Service, Store } from '@/types/database'
import { AdminPageHeader } from '../components/admin-page-header'
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'

const DURACIONES = [15, 30, 45, 60, 90, 120]
const BUFFERS = [0, 5, 10, 15, 30]

interface FormState {
  id: string | null
  nombre: string
  duracion: number
  precio: string
  precioDesde: boolean
  ofertaActiva: boolean
  precioOferta: string
  descripcion: string
  buffer: number
  imagenes: string[]
  visible: boolean
}

const VACIO: FormState = {
  id: null,
  nombre: '',
  duracion: 60,
  precio: '',
  precioDesde: false,
  ofertaActiva: false,
  precioOferta: '',
  descripcion: '',
  buffer: 0,
  imagenes: [],
  visible: true,
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'servicio'
}

const inputClass =
  'w-full min-h-11 px-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto)] text-base sm:text-sm'

export default function ServiciosManager({
  store,
  initialServices,
  tenantQuery,
  maxActiveServices = null,
}: {
  store: Store
  initialServices: Service[]
  tenantQuery: string
  maxActiveServices?: number | null
}) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [services, setServices] = useState<Service[]>(initialServices)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const activeCount = services.filter((s) => s.visible).length
  const isAtActiveLimit = maxActiveServices !== null && activeCount >= maxActiveServices

  const set = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f))

  const editar = (s: Service) =>
    setForm({
      id: s.id,
      nombre: s.nombre,
      duracion: s.duracion_minutos,
      precio: Number(s.precio) > 0 ? String(s.precio).replace('.', ',') : '',
      precioDesde: s.precio_desde,
      ofertaActiva: s.oferta_activa,
      precioOferta: Number(s.precio_oferta) > 0 ? String(s.precio_oferta).replace('.', ',') : '',
      descripcion: s.descripcion ?? '',
      buffer: s.buffer_despues_minutos,
      imagenes: s.imagenes ?? [],
      visible: s.visible,
    })

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    const nombre = form.nombre.trim()
    if (!nombre) {
      setError('Poné un nombre al servicio.')
      return
    }
    const precio = Number(form.precio.replace(',', '.')) || 0
    const precioOferta = Number(form.precioOferta.replace(',', '.')) || 0
    if (form.ofertaActiva && !(precioOferta > 0 && precioOferta < precio)) {
      setError('El precio de oferta tiene que ser mayor a 0 y menor al precio normal.')
      return
    }

    // Validar límite de servicios activos del plan si se intenta publicar como visible
    const existing = form.id ? services.find((s) => s.id === form.id) : null
    const wouldIncreaseActive = form.visible && (!existing || !existing.visible)
    if (wouldIncreaseActive && isAtActiveLimit) {
      setError(`Alcanzaste el límite de ${maxActiveServices} servicios activos de tu plan. Podés guardarlo como oculto o mejorar tu plan.`)
      return
    }

    setSaving(true)
    setError(null)
    const payload = {
      store_id: store.id,
      nombre,
      descripcion: form.descripcion.trim() || null,
      duracion_minutos: form.duracion,
      buffer_despues_minutos: form.buffer,
      precio,
      precio_desde: form.precioDesde,
      oferta_activa: form.ofertaActiva,
      precio_oferta: precioOferta > 0 ? precioOferta : null,
      imagenes: form.imagenes,
      visible: form.visible,
      updated_at: new Date().toISOString(),
    }

    try {
      if (form.id) {
        const { data, error: err } = await supabase.from('services').update(payload).eq('id', form.id).select('*').single()
        if (err) throw err
        setServices((list) => list.map((s) => (s.id === form.id ? (data as Service) : s)))
      } else {
        // El slug tiene que ser único en la tienda: si ya existe, se le agrega un número.
        let slug = slugify(nombre)
        let creado: Service | null = null
        for (let intento = 0; intento < 5 && !creado; intento++) {
          const { data, error: err } = await supabase
            .from('services')
            .insert({ ...payload, slug, orden: services.length })
            .select('*')
            .single()
          if (err?.code === '23505') {
            slug = `${slugify(nombre)}-${intento + 2}`
            continue
          }
          if (err) throw err
          creado = data as Service
        }
        if (!creado) throw new Error('slug')
        setServices((list) => [...list, creado!])
      }
      setForm(null)
      setOk('Servicio guardado.')
      setTimeout(() => setOk(null), 3000)
      router.refresh()
    } catch {
      setError('No se pudo guardar el servicio. Probá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const alternarVisible = async (s: Service) => {
    if (!s.visible && isAtActiveLimit) {
      setError(`Alcanzaste el límite de ${maxActiveServices} servicios activos de tu plan. Ocultá otro o mejorá tu plan.`)
      return
    }
    const { error: err } = await supabase.from('services').update({ visible: !s.visible }).eq('id', s.id)
    if (!err) setServices((list) => list.map((x) => (x.id === s.id ? { ...x, visible: !s.visible } : x)))
  }

  const borrar = async (s: Service) => {
    if (!confirm(`¿Borrar "${s.nombre}"? Los turnos ya tomados se mantienen.`)) return
    const { error: err } = await supabase.from('services').delete().eq('id', s.id)
    if (err) {
      setError('No se pudo borrar. Podés ocultarlo en su lugar.')
      return
    }
    setServices((list) => list.filter((x) => x.id !== s.id))
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Servicios"
        description={
          maxActiveServices !== null
            ? `Lo que tus clientes pueden reservar (${activeCount} de ${maxActiveServices} activos).`
            : 'Lo que tus clientes pueden reservar: nombre, duración y precio.'
        }
        icon={ClipboardList}
        actions={
          !form && (
            <div className="flex items-center gap-2">
              {isAtActiveLimit && (
                <Link
                  href={`/tienda/admin/suscripcion${tenantQuery}`}
                  className="min-h-11 px-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold inline-flex items-center"
                >
                  Mejorar Plan
                </Link>
              )}
              <button
                type="button"
                onClick={() => setForm({ ...VACIO, visible: !isAtActiveLimit })}
                className="min-h-11 px-4 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-[#1F2937] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nuevo servicio
              </button>
            </div>
          )
        }
      />

      {ok && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {ok}
        </div>
      )}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Formulario de alta/edición */}
      {form && (
        <form
          onSubmit={guardar}
          className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-5 sm:p-7 space-y-5 text-[var(--color-texto)]"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{form.id ? 'Editar servicio' : 'Nuevo servicio'}</h2>
            <button type="button" onClick={() => setForm(null)} aria-label="Cerrar" className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="srv-nombre" className="text-xs font-semibold opacity-75 block">Nombre del servicio *</label>
            <input id="srv-nombre" className={inputClass} maxLength={120} value={form.nombre} onChange={(e) => set({ nombre: e.target.value })} placeholder="Nombre del servicio" required />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold opacity-75">¿Cuánto dura?</p>
            <div className="flex flex-wrap gap-2">
              {DURACIONES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => set({ duracion: d })}
                  className={`min-h-11 px-3.5 rounded-xl border text-sm font-semibold cursor-pointer ${
                    form.duracion === d ? 'border-[#FACC15] bg-[#FACC15]/15' : 'border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {formatDuracion(d)}
                </button>
              ))}
              <label className="min-h-11 px-3 rounded-xl border border-[var(--color-borde)] inline-flex items-center gap-2 text-sm">
                <span className="opacity-70">Otra:</span>
                <input
                  type="number"
                  min={5}
                  max={720}
                  step={5}
                  value={form.duracion}
                  onChange={(e) => set({ duracion: Math.min(720, Math.max(5, Number(e.target.value) || 5)) })}
                  className="w-16 bg-transparent text-base sm:text-sm font-semibold"
                  aria-label="Duración en minutos"
                />
                <span className="opacity-70">min</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="srv-precio" className="text-xs font-semibold opacity-75 block">Precio</label>
              <CurrencyInput id="srv-precio" value={form.precio} onChange={(v) => set({ precio: v })} placeholder="Ej: 15.000" />
              <label className="flex items-center gap-2 text-xs min-h-11 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-[#FACC15]" checked={form.precioDesde} onChange={(e) => set({ precioDesde: e.target.checked })} />
                Mostrar como &quot;Desde $&quot; (el precio final puede variar)
              </label>
              <label className="flex items-center gap-2 text-xs min-h-11 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-[#FACC15]" checked={form.ofertaActiva} onChange={(e) => set({ ofertaActiva: e.target.checked })} />
                Tiene precio de oferta
              </label>
              {form.ofertaActiva && (
                <div className="space-y-1.5">
                  <label htmlFor="srv-oferta" className="text-xs font-semibold opacity-75 block">Precio de oferta</label>
                  <CurrencyInput id="srv-oferta" value={form.precioOferta} onChange={(v) => set({ precioOferta: v })} placeholder="Ej: 10.000" />
                  <p className="text-[11px] opacity-70">Se muestra el precio normal tachado. La reserva y la seña se calculan con el de oferta.</p>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold opacity-75">Tiempo libre después (opcional)</p>
              <div className="flex flex-wrap gap-2">
                {BUFFERS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => set({ buffer: b })}
                    className={`min-h-11 px-3 rounded-xl border text-sm cursor-pointer ${
                      form.buffer === b ? 'border-[#FACC15] bg-[#FACC15]/15 font-semibold' : 'border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {b === 0 ? 'Nada' : `${b} min`}
                  </button>
                ))}
              </div>
              <p className="text-[11px] opacity-60">Para limpiar o preparar antes del próximo turno.</p>
            </div>
          </div>

          {/* Descripción con formato: el dueño detalla en qué consiste el trabajo (títulos, viñetas, pasos, negritas) */}
          <RichTextEditor
            id="srv-desc"
            label="Descripción (opcional)"
            value={form.descripcion}
            onChange={(v) => set({ descripcion: v })}
            maxLength={5000}
            placeholder={'Contá en qué consiste el servicio, qué incluye, cuánto demora y si el cliente tiene que traer algo o prepararse.\n\nUsá los botones de arriba para ordenar la información con títulos, viñetas o pasos.'}
          />

          <div className="space-y-1.5">
            <p className="text-xs font-semibold opacity-75">Fotos (opcional): la primera es la portada</p>
            <ImageGalleryDropzone
              storeId={store.id}
              carpeta="servicios"
              values={form.imagenes}
              onChange={(urls) => set({ imagenes: urls })}
              onError={(mensaje) => setError(mensaje)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm min-h-11 cursor-pointer">
            <input type="checkbox" className="w-5 h-5 accent-[#FACC15]" checked={form.visible} onChange={(e) => set({ visible: e.target.checked })} />
            Mostrar en la tienda
          </label>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setForm(null)} className="min-h-11 px-4 rounded-xl border border-[var(--color-borde)] text-sm font-semibold cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="min-h-11 px-5 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-50 text-[#1F2937] text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar servicio
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {!form && services.length === 0 && (
        <div className="bg-[var(--color-superficie)] border border-dashed border-[var(--color-borde)] rounded-3xl p-8 text-center text-[var(--color-texto)] space-y-3">
          <ClipboardList className="w-8 h-8 mx-auto opacity-40" />
          <p className="text-sm font-semibold">Todavía no cargaste servicios</p>
          <p className="text-xs opacity-70">Cargá el primero para que tus clientes puedan reservar.</p>
          <button type="button" onClick={() => setForm({ ...VACIO })} className="min-h-11 px-4 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer">
            <Plus className="w-4 h-4" />
            Cargar mi primer servicio
          </button>
        </div>
      )}

      {services.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {services.map((s) => (
            <div key={s.id} className={`bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl p-4 flex gap-3 text-[var(--color-texto)] ${s.visible ? '' : 'opacity-60'}`}>
              {s.imagenes?.[0] ? (
                <img src={s.imagenes[0]} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-6 h-6 opacity-40" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{s.nombre}</p>
                <p className="text-xs opacity-70">
                  {formatDuracion(s.duracion_minutos)} · <PrecioServicio servicio={s} className="text-xs" />
                </p>
                {!s.visible && <p className="text-[11px] opacity-70 mt-0.5">Oculto en la tienda</p>}
                <div className="flex gap-1.5 mt-2">
                  <button type="button" onClick={() => editar(s)} className="min-h-11 px-3 rounded-xl border border-[var(--color-borde)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button type="button" onClick={() => alternarVisible(s)} aria-label={s.visible ? 'Ocultar' : 'Mostrar'} className="min-h-11 min-w-11 rounded-xl border border-[var(--color-borde)] inline-flex items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                    {s.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button type="button" onClick={() => borrar(s)} aria-label="Borrar" className="min-h-11 min-w-11 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 inline-flex items-center justify-center cursor-pointer hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
