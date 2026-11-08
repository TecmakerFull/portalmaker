// =============================================================================
// PORTALMAKER — Panel: Agenda de turnos
//
// Pensada para el celular del dueño: elige un día en la tira de fechas y ve
// sus turnos en orden, con acciones grandes (confirmar, asistió, no vino,
// cancelar) y un botón para cargar a mano los turnos que le piden por
// teléfono o WhatsApp.
// =============================================================================

'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { fechaLocal, sumarDias } from '@/lib/booking/availability'
import { formatHora, formatDuracion } from '@/lib/booking/format'
import type { Booking, BookingEstado, BookingWaitlist, Service, Store } from '@/types/database'
import { AdminPageHeader } from '../components/admin-page-header'
import StyledSelect from '@/components/styled-select'
import {
  CalendarCheck,
  Plus,
  Check,
  X,
  UserX,
  Loader2,
  Phone,
  AlertCircle,
  CalendarDays,
  BellRing,
  CheckCircle2,
} from 'lucide-react'

const ESTADOS: Record<BookingEstado, { label: string; clase: string }> = {
  pendiente: { label: 'Por confirmar', clase: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  confirmado: { label: 'Confirmado', clase: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  completado: { label: 'Asistió', clase: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30' },
  ausente: { label: 'No vino', clase: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' },
  cancelado: { label: 'Cancelado', clase: 'bg-black/5 dark:bg-white/10 opacity-70 border-transparent' },
  expirado: { label: 'Vencido', clase: 'bg-black/5 dark:bg-white/10 opacity-70 border-transparent' },
}

const inputClass = 'w-full min-h-11 px-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto)] text-base sm:text-sm'

function etiquetaDia(fecha: string, hoy: string): { corta: string; numero: string } {
  const d = new Date(`${fecha}T12:00:00Z`)
  const corta = fecha === hoy ? 'Hoy' : new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: 'UTC' }).format(d)
  return { corta, numero: String(d.getUTCDate()) }
}

function waLink(telefono: string | null, texto: string): string | null {
  const numero = (telefono || '').replace(/[^0-9]/g, '')
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` : null
}

export default function AgendaManager({
  store,
  zona,
  initialTurnos,
  services,
  initialEspera,
  tenantQuery,
}: {
  store: Store
  zona: string
  initialTurnos: Booking[]
  services: Service[]
  initialEspera: BookingWaitlist[]
  tenantQuery: string
}) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const hoy = fechaLocal(new Date(), zona)

  const [turnos, setTurnos] = useState<Booking[]>(initialTurnos)
  const [dia, setDia] = useState(hoy)
  const [accionando, setAccionando] = useState<string | null>(null)
  // Turno que se está por rechazar o cancelar, con el motivo opcional para el cliente
  const [porCancelar, setPorCancelar] = useState<Booking | null>(null)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pestana, setPestana] = useState<'turnos' | 'espera'>('turnos')
  const [espera, setEspera] = useState<BookingWaitlist[]>(initialEspera)
  const nombreServicio = (id: string | null) => services.find((s) => s.id === id)?.nombre ?? 'Servicio'

  // Turnos agrupados por fecha local para la tira de días y la lista.
  const porDia = useMemo(() => {
    const mapa = new Map<string, Booking[]>()
    for (const t of turnos) {
      const f = fechaLocal(new Date(t.starts_at), zona)
      mapa.set(f, [...(mapa.get(f) ?? []), t])
    }
    return mapa
  }, [turnos, zona])

  // Por confirmar = esperan aprobación de la tienda (no los que esperan el pago de la seña)
  const pendientes = turnos.filter((t) => t.estado === 'pendiente' && !t.pendiente_expira_at && new Date(t.starts_at) > new Date())
  const diasTira = Array.from({ length: 14 }, (_, i) => sumarDias(hoy, i))
  const delDia = (porDia.get(dia) ?? []).slice().sort((a, b) => a.starts_at.localeCompare(b.starts_at))

  // Pasa por el servidor para que se envíen los avisos (confirmación o
  // cancelación al cliente y aviso a la lista de espera si se libera el lugar).
  const cambiarEstado = async (turno: Booking, estado: BookingEstado, motivo?: string) => {
    setAccionando(turno.id)
    setError(null)
    setAviso(null)
    const res = await fetch(`/api/turnos/estado${tenantQuery}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: turno.id, estado, motivo }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data?.error || 'No se pudo actualizar el turno. Probá de nuevo.')
    } else {
      setTurnos((list) => list.map((t) => (t.id === turno.id ? (data.booking as Booking) : t)))
      if (data.avisadosEspera > 0) {
        setAviso(`Se liberó el lugar: avisamos por email a ${data.avisadosEspera} ${data.avisadosEspera === 1 ? 'persona' : 'personas'} de la lista de espera.`)
        setEspera((list) =>
          list.map((e) =>
            e.service_id === turno.service_id && e.fecha === fechaLocal(new Date(turno.starts_at), zona) && e.estado === 'esperando'
              ? { ...e, estado: 'avisado', avisado_at: new Date().toISOString() }
              : e
          )
        )
      }
    }
    setAccionando(null)
  }

  // ------------------------------------------------------- Lista de espera
  const actualizarEspera = async (entrada: BookingWaitlist, estado: 'resuelto' | 'cancelado') => {
    const { error: err } = await supabase
      .from('booking_waitlist')
      .update({ estado, updated_at: new Date().toISOString() })
      .eq('id', entrada.id)
    if (err) {
      setError('No se pudo actualizar la lista de espera.')
      return
    }
    setEspera((list) => list.filter((e) => e.id !== entrada.id))
  }

  const waEspera = (e: BookingWaitlist) => {
    const servicio = services.find((s) => s.id === e.service_id)
    const enlace = servicio ? `${window.location.origin}/tienda/servicios/${servicio.slug}${tenantQuery}` : ''
    const fecha = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${e.fecha}T12:00:00Z`))
    return waLink(
      e.cliente_telefono,
      `Hola ${e.cliente_nombre}, te escribimos de ${store.nombre}: se liberó un turno de ${servicio?.nombre ?? 'tu servicio'} para el ${fecha}.${enlace ? ` Podés reservarlo acá: ${enlace}` : ''}`
    )
  }

  // ------------------------------------------------------------ Carga manual
  const [manual, setManual] = useState<null | {
    serviceId: string
    fecha: string
    horarios: { inicio: string; etiqueta: string }[] | null
    inicio: string
    nombre: string
    telefono: string
    email: string
    cargando: boolean
    guardando: boolean
    error: string | null
  }>(null)

  const abrirManual = () =>
    setManual({ serviceId: services[0]?.id ?? '', fecha: dia, horarios: null, inicio: '', nombre: '', telefono: '', email: '', cargando: false, guardando: false, error: null })

  const buscarHorarios = async (serviceId: string, fecha: string) => {
    setManual((m) => (m ? { ...m, serviceId, fecha, horarios: null, inicio: '', cargando: true, error: null } : m))
    const sep = tenantQuery ? `${tenantQuery}&` : '?'
    const res = await fetch(`/api/turnos/disponibilidad${sep}service_id=${serviceId}&desde=${fecha}&dias=1`)
    const data = await res.json().catch(() => ({}))
    setManual((m) =>
      m ? { ...m, cargando: false, horarios: res.ok ? (data?.dias?.[fecha] ?? []) : [], error: res.ok ? null : data?.error || 'No se pudieron cargar los horarios.' } : m
    )
  }

  const guardarManual = async () => {
    if (!manual) return
    if (!manual.inicio || !manual.nombre.trim()) {
      setManual({ ...manual, error: 'Elegí un horario y escribí el nombre del cliente.' })
      return
    }
    setManual({ ...manual, guardando: true, error: null })
    const res = await fetch(`/api/turnos${tenantQuery}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        manual: true,
        serviceId: manual.serviceId,
        inicio: manual.inicio,
        clienteNombre: manual.nombre,
        clienteTelefono: manual.telefono,
        clienteEmail: manual.email,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setManual((m) => (m ? { ...m, guardando: false, error: data?.error || 'No se pudo cargar el turno.' } : m))
      return
    }
    setManual(null)
    setDia(fechaLocal(new Date(data.booking.starts_at), zona))
    router.refresh()
    // Se recarga la lista completa para incluir el turno nuevo con todos sus datos.
    const { data: nuevo } = await supabase.from('bookings').select('*').eq('id', data.booking.id).maybeSingle()
    if (nuevo) setTurnos((list) => [...list, nuevo as Booking])
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Agenda"
        description="Tus turnos día por día."
        icon={CalendarCheck}
        actions={
          services.length > 0 && !manual ? (
            <button type="button" onClick={abrirManual} className="min-h-11 px-4 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-[#1F2937] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer">
              <Plus className="w-4 h-4" /> Cargar turno
            </button>
          ) : null
        }
      />

      {services.length === 0 && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-800 dark:text-amber-300">
          Primero cargá tus servicios en <a className="underline font-semibold" href={`/tienda/admin/servicios${tenantQuery}`}>Servicios</a> para empezar a recibir turnos.
        </div>
      )}

      {error && (
        <p className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </p>
      )}
      {aviso && (
        <p className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {aviso}
        </p>
      )}

      {/* Pestañas: turnos del día / lista de espera */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/5 dark:bg-white/5" role="tablist">
        <button type="button" role="tab" aria-selected={pestana === 'turnos'} onClick={() => setPestana('turnos')} className={`min-h-11 rounded-xl text-sm font-semibold cursor-pointer ${pestana === 'turnos' ? 'bg-[var(--color-superficie)] shadow-xs' : 'opacity-70'}`}>
          Turnos
        </button>
        <button type="button" role="tab" aria-selected={pestana === 'espera'} onClick={() => setPestana('espera')} className={`min-h-11 rounded-xl text-sm font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5 ${pestana === 'espera' ? 'bg-[var(--color-superficie)] shadow-xs' : 'opacity-70'}`}>
          <BellRing className="w-4 h-4" /> Lista de espera{espera.length > 0 ? ` (${espera.length})` : ''}
        </button>
      </div>

      {pestana === 'espera' && (
        <div className="space-y-2">
          <p className="text-xs opacity-70 px-1">
            Personas que quieren un turno en un día lleno. Si se cancela un turno de ese servicio y día, les avisamos por email automáticamente. También podés avisarles vos por WhatsApp.
          </p>
          {espera.length === 0 && (
            <p className="p-6 text-center text-sm opacity-70 bg-[var(--color-superficie)] border border-dashed border-[var(--color-borde)] rounded-3xl text-[var(--color-texto)]">
              No hay nadie en lista de espera.
            </p>
          )}
          {espera.map((e) => {
            const wa = waEspera(e)
            return (
              <div key={e.id} className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl p-4 text-[var(--color-texto)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{e.cliente_nombre}</p>
                    <p className="text-xs opacity-70 truncate">
                      {nombreServicio(e.service_id)} ·{' '}
                      <span className="capitalize">
                        {new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${e.fecha}T12:00:00Z`))}
                      </span>
                    </p>
                  </div>
                  <span className={`shrink-0 text-[11px] px-2 py-1 rounded-full font-semibold border ${e.estado === 'avisado' ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'}`}>
                    {e.estado === 'avisado' ? 'Avisado' : 'Esperando'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {wa && (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="min-h-11 px-3 rounded-xl border border-[var(--color-borde)] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5">
                      <Phone className="w-4 h-4" /> Avisar por WhatsApp
                    </a>
                  )}
                  <button type="button" onClick={() => actualizarEspera(e, 'resuelto')} className="min-h-11 px-3 rounded-xl border border-[var(--color-borde)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                    <Check className="w-4 h-4" /> Resuelto
                  </button>
                  <button type="button" onClick={() => actualizarEspera(e, 'cancelado')} className="min-h-11 px-3 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-red-500/10">
                    <X className="w-4 h-4" /> Quitar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pendientes de aprobación */}
      {pendientes.length > 0 && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-800 dark:text-amber-300">
          Tenés <strong>{pendientes.length}</strong> {pendientes.length === 1 ? 'turno por confirmar' : 'turnos por confirmar'}. Aparecen marcados en cada día.
        </div>
      )}

      {/* Carga manual */}
      {manual && (
        <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-5 sm:p-7 space-y-4 text-[var(--color-texto)]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Cargar un turno</h2>
            <button type="button" onClick={() => setManual(null)} aria-label="Cerrar" className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold opacity-75 block">Servicio</span>
              <StyledSelect
                aria-label="Servicio"
                value={manual.serviceId}
                onChange={(v) => buscarHorarios(v, manual.fecha)}
                options={services.map((sv) => ({ value: sv.id, label: `${sv.nombre} (${formatDuracion(sv.duracion_minutos)})` }))}
              />
            </div>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold opacity-75 block">Día</span>
              <input type="date" className={inputClass} min={hoy} value={manual.fecha} onChange={(e) => buscarHorarios(manual.serviceId, e.target.value)} />
            </label>
          </div>

          {manual.horarios === null && !manual.cargando && (
            <button type="button" onClick={() => buscarHorarios(manual.serviceId, manual.fecha)} className="min-h-11 px-4 rounded-xl border border-[var(--color-borde)] text-sm font-semibold cursor-pointer">
              Ver horarios libres
            </button>
          )}
          {manual.cargando && <Loader2 className="w-5 h-5 animate-spin opacity-60" />}
          {manual.horarios && manual.horarios.length === 0 && <p className="text-sm opacity-70">No hay horarios libres ese día.</p>}
          {manual.horarios && manual.horarios.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {manual.horarios.map((h) => (
                <button
                  key={h.inicio}
                  type="button"
                  onClick={() => setManual({ ...manual, inicio: h.inicio })}
                  className={`min-h-11 min-w-[72px] px-3 rounded-xl border text-sm font-semibold cursor-pointer ${
                    manual.inicio === h.inicio ? 'border-[#FACC15] bg-[#FACC15]/20' : 'border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {h.etiqueta}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input className={inputClass} maxLength={100} placeholder="Nombre del cliente *" value={manual.nombre} onChange={(e) => setManual({ ...manual, nombre: e.target.value })} aria-label="Nombre del cliente" />
            <input className={inputClass} maxLength={30} inputMode="tel" placeholder="WhatsApp (opcional)" value={manual.telefono} onChange={(e) => setManual({ ...manual, telefono: e.target.value })} aria-label="WhatsApp del cliente" />
            <input className={inputClass} maxLength={150} type="email" placeholder="Email (opcional)" value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} aria-label="Email del cliente" />
          </div>
          {manual.error && <p className="text-sm text-red-600 dark:text-red-400">{manual.error}</p>}
          <div className="flex justify-end">
            <button type="button" onClick={guardarManual} disabled={manual.guardando} className="w-full sm:w-auto min-h-11 px-5 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-50 text-[#1F2937] text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer">
              {manual.guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Guardar turno
            </button>
          </div>
        </div>
      )}

      {pestana === 'turnos' && (<>
      {/* Tira de días */}
      <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-4 text-[var(--color-texto)] space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {diasTira.map((f) => {
            const { corta, numero } = etiquetaDia(f, hoy)
            const cantidad = (porDia.get(f) ?? []).filter((t) => ['pendiente', 'confirmado'].includes(t.estado)).length
            const activo = f === dia
            return (
              <button
                key={f}
                type="button"
                onClick={() => setDia(f)}
                className={`shrink-0 min-w-[56px] min-h-[64px] rounded-2xl border flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  activo ? 'border-[#FACC15] bg-[#FACC15]/20' : 'border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span className="text-[11px] capitalize opacity-70">{corta}</span>
                <span className="text-base font-semibold">{numero}</span>
                <span className={`text-[10px] font-semibold ${cantidad > 0 ? 'text-[#CA8A04] dark:text-[#FACC15]' : 'opacity-30'}`}>
                  {cantidad > 0 ? `${cantidad} turno${cantidad === 1 ? '' : 's'}` : '—'}
                </span>
              </button>
            )
          })}
        </div>
        <label className="flex items-center gap-2 text-xs opacity-80">
          <CalendarDays className="w-4 h-4" />
          Ir a otra fecha:
          <input type="date" className="min-h-11 px-2 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-base sm:text-sm" value={dia} onChange={(e) => e.target.value && setDia(e.target.value)} />
        </label>
      </div>

      {/* Turnos del día */}
      <div className="space-y-2">
        {delDia.length === 0 && (
          <p className="p-6 text-center text-sm opacity-70 bg-[var(--color-superficie)] border border-dashed border-[var(--color-borde)] rounded-3xl text-[var(--color-texto)]">
            No hay turnos para este día.
          </p>
        )}
        {delDia.map((t) => {
          const esperandoSena = t.estado === 'pendiente' && Boolean(t.pendiente_expira_at)
          const estado = esperandoSena ? { label: 'Esperando seña', clase: ESTADOS.pendiente.clase } : ESTADOS[t.estado]
          const activo = t.estado === 'pendiente' || t.estado === 'confirmado'
          const wa = waLink(t.cliente_telefono, `Hola ${t.cliente_nombre}, te escribimos de ${store.nombre} por tu turno de ${t.servicio_nombre} a las ${formatHora(t.starts_at, zona)} hs.`)
          return (
            <div key={t.id} className={`bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl p-4 text-[var(--color-texto)] ${activo ? '' : 'opacity-70'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold leading-tight">{formatHora(t.starts_at, zona)} <span className="text-xs font-normal opacity-60">a {formatHora(t.ends_at, zona)}</span></p>
                  <p className="text-sm font-semibold mt-1 truncate">{t.cliente_nombre}</p>
                  <p className="text-xs opacity-70 truncate">{t.servicio_nombre}{t.origen === 'manual' ? ' · cargado por vos' : ''}</p>
                  {t.notas_cliente && <p className="text-xs mt-1 opacity-80">Nota: {t.notas_cliente}</p>}
                </div>
                <span className={`shrink-0 text-[11px] px-2 py-1 rounded-full font-semibold border ${estado.clase}`}>{estado.label}</span>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="min-h-11 px-3 rounded-xl border border-[var(--color-borde)] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5">
                    <Phone className="w-4 h-4" /> WhatsApp
                  </a>
                )}
                {t.estado === 'pendiente' && (
                  <button type="button" disabled={accionando === t.id} onClick={() => cambiarEstado(t, 'confirmado')} className="min-h-11 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                    <Check className="w-4 h-4" /> Confirmar
                  </button>
                )}
                {t.estado === 'confirmado' && new Date(t.starts_at) <= new Date() && (
                  <>
                    <button type="button" disabled={accionando === t.id} onClick={() => cambiarEstado(t, 'completado')} className="min-h-11 px-3 rounded-xl border border-[var(--color-borde)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                      <Check className="w-4 h-4" /> Asistió
                    </button>
                    <button type="button" disabled={accionando === t.id} onClick={() => cambiarEstado(t, 'ausente')} className="min-h-11 px-3 rounded-xl border border-[var(--color-borde)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                      <UserX className="w-4 h-4" /> No vino
                    </button>
                  </>
                )}
                {activo && (
                  <button type="button" disabled={accionando === t.id} onClick={() => { setMotivoCancelacion(''); setPorCancelar(t) }} className="min-h-11 px-3 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-red-500/10 disabled:opacity-50">
                    <X className="w-4 h-4" /> {t.estado === 'pendiente' ? 'Rechazar' : 'Cancelar'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      </>)}

      {/* Rechazar o cancelar: el motivo es opcional y se le envía al cliente por email */}
      {porCancelar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true" aria-labelledby="cancelar-turno-titulo">
          <div className="bg-[var(--color-superficie)] text-[var(--color-texto)] border border-[var(--color-borde)] rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl">
            <h3 id="cancelar-turno-titulo" className="text-base font-semibold">
              {porCancelar.estado === 'pendiente' ? 'Rechazar' : 'Cancelar'} el turno de {porCancelar.cliente_nombre}
            </h3>
            <p className="text-sm opacity-80">Le avisamos por email.</p>
            <div className="space-y-1.5">
              <label htmlFor="motivo-cancelacion" className="text-xs font-semibold opacity-75 block">Motivo (opcional)</label>
              <textarea
                id="motivo-cancelacion"
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Ej: ese día no atendemos, te propongo otro horario"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-base sm:text-sm"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button type="button" onClick={() => setPorCancelar(null)} className="min-h-11 px-4 rounded-xl border border-[var(--color-borde)] text-sm font-semibold cursor-pointer">
                Volver
              </button>
              <button
                type="button"
                disabled={accionando === porCancelar.id}
                onClick={async () => {
                  const turno = porCancelar
                  setPorCancelar(null)
                  await cambiarEstado(turno, 'cancelado', motivoCancelacion.trim() || undefined)
                }}
                className="min-h-11 px-4 rounded-xl bg-red-600 text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
              >
                {porCancelar.estado === 'pendiente' ? 'Rechazar turno' : 'Cancelar turno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
