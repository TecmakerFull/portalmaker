// =============================================================================
// PORTALMAKER — Panel: horarios para turnos, bloqueos y reglas de reserva
//
// Tres bloques simples:
//   1. Qué días y en qué horario atendés (mismo esquema que los horarios de
//      atención: un horario por día y opcionalmente un segundo, ej. mañana y tarde)
//   2. Días u horas bloqueadas (vacaciones, feriados, un trámite)
//   3. Reglas: con cuánta anticipación se reserva, cancelación, aprobación
// Todo con opciones para elegir, no números para inventar.
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { DIAS_SEMANA, DEFAULT_HORARIOS_CONFIG, type DiaSemana, type DiaHorario } from '@/lib/horarios'
import { localAUtc, fechaLocal, sumarDias } from '@/lib/booking/availability'
import { formatFechaTurno, formatHora } from '@/lib/booking/format'
import type { Staff, StaffBlock, Store, StoreBookingSettings } from '@/types/database'
import { AdminPageHeader } from '../components/admin-page-header'
import { Clock, Save, Loader2, CheckCircle2, AlertCircle, CalendarOff, Trash2, Plus, Settings2 } from 'lucide-react'

const card = 'bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-5 sm:p-7 space-y-4 text-[var(--color-texto)]'
const inputClass = 'min-h-11 px-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto)] text-sm'

const OPC_ANTICIPACION = [
  { v: 0, l: 'Sin mínimo' },
  { v: 30, l: '30 minutos' },
  { v: 60, l: '1 hora' },
  { v: 120, l: '2 horas' },
  { v: 240, l: '4 horas' },
  { v: 720, l: '12 horas' },
  { v: 1440, l: '1 día' },
  { v: 2880, l: '2 días' },
]
const OPC_MAX_DIAS = [7, 14, 30, 60, 90]
const OPC_INTERVALO = [10, 15, 20, 30, 60]
const OPC_CANCELACION = [
  { v: 0, l: 'Hasta el último momento' },
  { v: 2, l: '2 horas antes' },
  { v: 12, l: '12 horas antes' },
  { v: 24, l: '24 horas antes' },
  { v: 48, l: '48 horas antes' },
]

type Dias = Record<DiaSemana, DiaHorario>

function Aviso({ tipo, texto }: { tipo: 'ok' | 'error'; texto: string }) {
  return tipo === 'ok' ? (
    <p className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
      <CheckCircle2 className="w-4 h-4 shrink-0" /> {texto}
    </p>
  ) : (
    <p className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
      <AlertCircle className="w-4 h-4 shrink-0" /> {texto}
    </p>
  )
}

function BotonGuardar({ saving, label, onClick }: { saving: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="w-full sm:w-auto min-h-11 px-5 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-50 text-[#1F2937] text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
    >
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {label}
    </button>
  )
}

export default function HorariosManager({
  store,
  initialSettings,
  initialStaff,
  initialBloqueos,
}: {
  store: Store
  initialSettings: StoreBookingSettings
  initialStaff: Staff[]
  initialBloqueos: StaffBlock[]
}) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const profesional = initialStaff[0]
  const zona = initialSettings.zona_horaria

  // ---------------------------------------------------------------- Horarios
  const [dias, setDias] = useState<Dias>({
    ...DEFAULT_HORARIOS_CONFIG.dias,
    ...((profesional?.horarios?.dias as Dias | undefined) ?? {}),
  })
  const [savingDias, setSavingDias] = useState(false)
  const [msgDias, setMsgDias] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const setDia = (key: DiaSemana, patch: Partial<DiaHorario>) => setDias((d) => ({ ...d, [key]: { ...d[key], ...patch } }))

  const guardarDias = async () => {
    if (!profesional) return
    setSavingDias(true)
    setMsgDias(null)
    const { error } = await supabase
      .from('staff')
      .update({ horarios: { dias }, updated_at: new Date().toISOString() })
      .eq('id', profesional.id)
    setSavingDias(false)
    setMsgDias(error ? { tipo: 'error', texto: 'No se pudieron guardar los horarios.' } : { tipo: 'ok', texto: 'Horarios guardados.' })
    if (!error) router.refresh()
  }

  // ---------------------------------------------------------------- Bloqueos
  const hoy = fechaLocal(new Date(), zona)
  const [bloqueos, setBloqueos] = useState<StaffBlock[]>(initialBloqueos)
  const [nuevo, setNuevo] = useState({ desde: hoy, hasta: hoy, todoElDia: true, horaDesde: '09:00', horaHasta: '13:00', motivo: '' })
  const [savingBloqueo, setSavingBloqueo] = useState(false)
  const [msgBloqueo, setMsgBloqueo] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const agregarBloqueo = async () => {
    if (!profesional) return
    setMsgBloqueo(null)
    const fechaHasta = nuevo.hasta < nuevo.desde ? nuevo.desde : nuevo.hasta
    // "Todo el día" cubre desde las 00:00 del primer día hasta las 00:00 del día siguiente al último.
    const startsAt = localAUtc(nuevo.desde, nuevo.todoElDia ? '00:00' : nuevo.horaDesde, zona)
    const endsAt = nuevo.todoElDia
      ? localAUtc(sumarDias(fechaHasta, 1), '00:00', zona)
      : localAUtc(nuevo.desde, nuevo.horaHasta, zona)
    if (endsAt <= startsAt) {
      setMsgBloqueo({ tipo: 'error', texto: 'La hora de fin tiene que ser posterior a la de inicio.' })
      return
    }
    setSavingBloqueo(true)
    const { data, error } = await supabase
      .from('staff_blocks')
      .insert({
        store_id: store.id,
        staff_id: profesional.id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        motivo: nuevo.motivo.trim() || null,
      })
      .select('*')
      .single()
    setSavingBloqueo(false)
    if (error || !data) {
      setMsgBloqueo({ tipo: 'error', texto: 'No se pudo bloquear. Probá de nuevo.' })
      return
    }
    setBloqueos((b) => [...b, data as StaffBlock].sort((a, c) => a.starts_at.localeCompare(c.starts_at)))
    setNuevo((n) => ({ ...n, motivo: '' }))
    setMsgBloqueo({ tipo: 'ok', texto: 'Listo: en ese período no se van a poder reservar turnos.' })
  }

  const borrarBloqueo = async (id: string) => {
    const { error } = await supabase.from('staff_blocks').delete().eq('id', id)
    if (!error) setBloqueos((b) => b.filter((x) => x.id !== id))
  }

  const describirBloqueo = (b: StaffBlock) => {
    const inicio = new Date(b.starts_at)
    const fin = new Date(b.ends_at)
    const esDiaCompleto = formatHora(inicio, zona) === '00:00' && formatHora(fin, zona) === '00:00'
    if (esDiaCompleto) {
      const ultimo = sumarDias(fechaLocal(fin, zona), -1)
      const primero = fechaLocal(inicio, zona)
      const fmt = (f: string) => new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${f}T12:00:00Z`))
      return primero === ultimo ? `Todo el día: ${fmt(primero)}` : `Del ${fmt(primero)} al ${fmt(ultimo)}`
    }
    return `${formatFechaTurno(inicio, zona)} a ${formatHora(fin, zona)} hs`
  }

  // ---------------------------------------------------------------- Reglas
  const [reglas, setReglas] = useState(initialSettings)
  const [savingReglas, setSavingReglas] = useState(false)
  const [msgReglas, setMsgReglas] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const guardarReglas = async () => {
    setSavingReglas(true)
    setMsgReglas(null)
    const { error } = await supabase.from('store_booking_settings').upsert(
      {
        store_id: store.id,
        anticipacion_min_minutos: reglas.anticipacion_min_minutos,
        anticipacion_max_dias: reglas.anticipacion_max_dias,
        intervalo_grilla_minutos: reglas.intervalo_grilla_minutos,
        requiere_aprobacion: reglas.requiere_aprobacion,
        cancelacion_hasta_horas: reglas.cancelacion_hasta_horas,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'store_id' }
    )
    setSavingReglas(false)
    setMsgReglas(error ? { tipo: 'error', texto: 'No se pudieron guardar las reglas.' } : { tipo: 'ok', texto: 'Reglas guardadas.' })
  }

  const selectReglas = (label: string, value: number, onChange: (v: number) => void, opciones: { v: number; l: string }[], ayuda: string, id: string) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold opacity-75 block">{label}</label>
      <select id={id} className={`${inputClass} w-full cursor-pointer`} value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {opciones.map((o) => (
          <option key={o.v} value={o.v}>{o.l}</option>
        ))}
      </select>
      <p className="text-[11px] opacity-60">{ayuda}</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Horarios y reglas" description="Cuándo atendés y cómo se reservan tus turnos." icon={Clock} />

      {/* 1. Horarios semanales */}
      <section className={card}>
        <div>
          <h2 className="text-base font-semibold">¿Qué días y en qué horario atendés?</h2>
          <p className="text-xs opacity-70 mt-1">Tus clientes solo van a poder reservar dentro de estos horarios.</p>
        </div>

        <div className="space-y-2">
          {DIAS_SEMANA.map(({ key, label }) => {
            const d = dias[key]
            return (
              <div key={key} className={`p-3 rounded-2xl border border-[var(--color-borde)] ${d.activo ? '' : 'opacity-60'}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 min-h-11 w-32 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 accent-[#FACC15]" checked={d.activo} onChange={(e) => setDia(key, { activo: e.target.checked })} />
                    <span className="text-sm font-semibold">{label}</span>
                  </label>
                  {d.activo ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <input type="time" aria-label={`${label} desde`} className={inputClass} value={d.turno1.desde} onChange={(e) => setDia(key, { turno1: { ...d.turno1, desde: e.target.value } })} />
                      <span className="opacity-60">a</span>
                      <input type="time" aria-label={`${label} hasta`} className={inputClass} value={d.turno1.hasta} onChange={(e) => setDia(key, { turno1: { ...d.turno1, hasta: e.target.value } })} />
                      {d.dobleTurno ? (
                        <>
                          <span className="opacity-60">y</span>
                          <input type="time" aria-label={`${label} segundo horario desde`} className={inputClass} value={d.turno2.desde} onChange={(e) => setDia(key, { turno2: { ...d.turno2, desde: e.target.value } })} />
                          <span className="opacity-60">a</span>
                          <input type="time" aria-label={`${label} segundo horario hasta`} className={inputClass} value={d.turno2.hasta} onChange={(e) => setDia(key, { turno2: { ...d.turno2, hasta: e.target.value } })} />
                          <button type="button" onClick={() => setDia(key, { dobleTurno: false })} className="min-h-11 px-2 text-xs opacity-70 hover:opacity-100 cursor-pointer">Quitar</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setDia(key, { dobleTurno: true })} className="min-h-11 px-3 rounded-xl border border-[var(--color-borde)] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                          <Plus className="w-3.5 h-3.5" /> Otro horario ese día
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs opacity-70">No atiendo</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {msgDias && <Aviso {...msgDias} />}
        <div className="flex justify-end">
          <BotonGuardar saving={savingDias} label="Guardar horarios" onClick={guardarDias} />
        </div>
      </section>

      {/* 2. Bloqueos */}
      <section className={card}>
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <CalendarOff className="w-4 h-4 text-amber-500" /> Días u horarios sin turnos
          </h2>
          <p className="text-xs opacity-70 mt-1">Vacaciones, feriados o un trámite: en ese período nadie va a poder reservar.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold opacity-75 block">{nuevo.todoElDia ? 'Desde el día' : 'Día'}</span>
            <input type="date" className={`${inputClass} w-full`} min={hoy} value={nuevo.desde} onChange={(e) => setNuevo((n) => ({ ...n, desde: e.target.value, hasta: n.hasta < e.target.value ? e.target.value : n.hasta }))} />
          </label>
          {nuevo.todoElDia ? (
            <label className="space-y-1.5">
              <span className="text-xs font-semibold opacity-75 block">Hasta el día</span>
              <input type="date" className={`${inputClass} w-full`} min={nuevo.desde} value={nuevo.hasta} onChange={(e) => setNuevo((n) => ({ ...n, hasta: e.target.value }))} />
            </label>
          ) : (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold opacity-75 block">Horario</span>
              <div className="flex items-center gap-2">
                <input type="time" aria-label="Desde" className={inputClass} value={nuevo.horaDesde} onChange={(e) => setNuevo((n) => ({ ...n, horaDesde: e.target.value }))} />
                <span className="opacity-60">a</span>
                <input type="time" aria-label="Hasta" className={inputClass} value={nuevo.horaHasta} onChange={(e) => setNuevo((n) => ({ ...n, horaHasta: e.target.value }))} />
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 min-h-11 cursor-pointer">
            <input type="checkbox" className="w-5 h-5 accent-[#FACC15]" checked={nuevo.todoElDia} onChange={(e) => setNuevo((n) => ({ ...n, todoElDia: e.target.checked }))} />
            <span className="text-sm">Todo el día</span>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold opacity-75 block">Motivo (opcional, solo lo ves vos)</span>
            <input className={`${inputClass} w-full`} maxLength={80} value={nuevo.motivo} onChange={(e) => setNuevo((n) => ({ ...n, motivo: e.target.value }))} placeholder="Ej: Vacaciones" />
          </label>
        </div>

        {msgBloqueo && <Aviso {...msgBloqueo} />}
        <div className="flex justify-end">
          <BotonGuardar saving={savingBloqueo} label="Bloquear" onClick={agregarBloqueo} />
        </div>

        {bloqueos.length > 0 && (
          <ul className="space-y-2 pt-2">
            {bloqueos.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-[var(--color-borde)] text-sm">
                <span>
                  <span className="font-semibold capitalize">{describirBloqueo(b)}</span>
                  {b.motivo && <span className="block text-xs opacity-70">{b.motivo}</span>}
                </span>
                <button type="button" onClick={() => borrarBloqueo(b.id)} aria-label="Quitar bloqueo" className="min-h-11 min-w-11 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 inline-flex items-center justify-center cursor-pointer hover:bg-red-500/10">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3. Reglas */}
      <section className={card}>
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-amber-500" /> Reglas de reserva
          </h2>
          <p className="text-xs opacity-70 mt-1">Ya vienen con valores recomendados. Cambialos solo si lo necesitás.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {selectReglas('Anticipación mínima para reservar', reglas.anticipacion_min_minutos, (v) => setReglas((r) => ({ ...r, anticipacion_min_minutos: v })), OPC_ANTICIPACION, 'Evita que te reserven para dentro de un rato.', 'r-anticipacion')}
          {selectReglas('Se puede reservar hasta', reglas.anticipacion_max_dias, (v) => setReglas((r) => ({ ...r, anticipacion_max_dias: v })), OPC_MAX_DIAS.map((d) => ({ v: d, l: `${d} días adelante` })), 'Cuánto hacia adelante se ve tu agenda.', 'r-max')}
          {selectReglas('Horarios de inicio cada', reglas.intervalo_grilla_minutos, (v) => setReglas((r) => ({ ...r, intervalo_grilla_minutos: v })), OPC_INTERVALO.map((m) => ({ v: m, l: `${m} minutos` })), 'Ej: cada 30 minutos ofrece 09:00, 09:30, 10:00...', 'r-intervalo')}
          {selectReglas('El cliente puede cancelar', reglas.cancelacion_hasta_horas, (v) => setReglas((r) => ({ ...r, cancelacion_hasta_horas: v })), OPC_CANCELACION, 'Después de ese plazo, solo vos podés cancelar.', 'r-cancelacion')}
        </div>

        <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-[var(--color-borde)] cursor-pointer min-h-11">
          <input type="checkbox" className="w-5 h-5 mt-0.5 accent-[#FACC15] shrink-0" checked={reglas.requiere_aprobacion} onChange={(e) => setReglas((r) => ({ ...r, requiere_aprobacion: e.target.checked }))} />
          <span className="text-sm">
            <span className="font-semibold block">Quiero aprobar cada turno antes de confirmarlo</span>
            <span className="text-xs opacity-70">Si lo dejás apagado, los turnos se confirman solos al reservar.</span>
          </span>
        </label>

        {msgReglas && <Aviso {...msgReglas} />}
        <div className="flex justify-end">
          <BotonGuardar saving={savingReglas} label="Guardar reglas" onClick={guardarReglas} />
        </div>
      </section>
    </div>
  )
}
