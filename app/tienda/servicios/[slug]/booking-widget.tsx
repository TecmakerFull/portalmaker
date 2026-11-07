// =============================================================================
// PORTALMAKER — Reserva de turno (tienda pública)
//
// Tres pasos en una sola pantalla, pensados para el celular:
//   1. Día (tira de fechas; los días sin lugar aparecen apagados)
//   2. Horario (botones grandes)
//   3. Confirmar (requiere cuenta en la tienda: decisión de negocio)
// Si el cliente elige un horario sin haber iniciado sesión, se guarda la
// elección, se lo manda a ingresar y al volver la encuentra seleccionada.
// =============================================================================

'use client'

import { useCallback, useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { fechaLocal, sumarDias } from '@/lib/booking/availability'
import { formatFechaTurno, formatDuracion, googleCalendarUrl, renglonesImporte } from '@/lib/booking/format'
import { CalendarCheck, Loader2, LogIn, Check, AlertCircle, CalendarPlus, MessageCircle, ChevronRight, BellRing } from 'lucide-react'

interface Horario {
  inicio: string
  etiqueta: string
  staff_id: string
}

interface Props {
  storeId: string
  storeNombre: string
  service: { id: string; nombre: string; duracion: number; precio?: number }
  zona: string
  maxDias: number
  requiereAprobacion: boolean
  cancelacionHoras: number
  tenantQuery: string
  // Monto de la seña a pagar con Mercado Pago (0 = sin seña)
  sena: number
}

const BLOQUE_DIAS = 14

const formatPesos = (monto: number) => '$' + monto.toLocaleString('es-AR')

export default function BookingWidget({ storeId, storeNombre, service, zona, maxDias, requiereAprobacion, cancelacionHoras, tenantQuery, sena }: Props) {
  const supabase = createSupabaseBrowserClient()
  const hoy = fechaLocal(new Date(), zona)
  const claveSeleccion = `pm_turno_pendiente_${storeId}`

  const [dias, setDias] = useState<Record<string, Horario[]>>({})
  // Días en que se atiende pero no queda lugar: se ofrece la lista de espera
  const [completos, setCompletos] = useState<Set<string>>(new Set())
  const [espera, setEspera] = useState<{ enviando: boolean; ok: string | null }>({ enviando: false, ok: null })
  const [diasCargados, setDiasCargados] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [diaSel, setDiaSel] = useState<string | null>(null)
  const [horarioSel, setHorarioSel] = useState<Horario | null>(null)

  const [usuario, setUsuario] = useState<{ email: string; nombre: string } | null | undefined>(undefined)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<null | { estado: string; starts_at: string; whatsappUrl: string | null; enlaceTurno: string }>(null)

  const apiUrl = (path: string, qs: string) => `${path}${tenantQuery ? `${tenantQuery}&` : '?'}${qs}`

  const cargarDias = useCallback(
    async (desdeOffset: number) => {
      setCargando(true)
      const desde = sumarDias(hoy, desdeOffset)
      const res = await fetch(apiUrl('/api/turnos/disponibilidad', `service_id=${service.id}&desde=${desde}&dias=${BLOQUE_DIAS}`), { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setDias((prev) => ({ ...prev, ...(data.dias ?? {}) }))
        setCompletos((prev) => {
          const next = new Set(prev)
          for (const f of Object.keys(data.dias ?? {})) next.delete(f)
          for (const f of (data.completos ?? []) as string[]) next.add(f)
          return next
        })
        setDiasCargados(desdeOffset + BLOQUE_DIAS)
      } else {
        setError(data?.error || 'No pudimos cargar los horarios. Probá de nuevo.')
      }
      setCargando(false)
      return res.ok ? (data.dias as Record<string, Horario[]>) : null
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hoy, service.id, tenantQuery]
  )

  // Carga inicial: horarios de las próximas 2 semanas, sesión del cliente y,
  // si volvió de iniciar sesión, el horario que había elegido.
  useEffect(() => {
    let cancelado = false
    ;(async () => {
      const disponibles = await cargarDias(0)
      if (cancelado) return

      const primerDia = Object.keys(disponibles ?? {}).sort()[0] ?? null
      let seleccion: { inicio: string } | null = null
      try {
        const guardada = sessionStorage.getItem(claveSeleccion)
        if (guardada) {
          const parsed = JSON.parse(guardada)
          if (parsed?.serviceId === service.id) seleccion = parsed
          sessionStorage.removeItem(claveSeleccion)
        }
      } catch {}

      if (seleccion) {
        const dia = fechaLocal(new Date(seleccion.inicio), zona)
        const horario = disponibles?.[dia]?.find((h) => h.inicio === seleccion!.inicio) ?? null
        setDiaSel(disponibles?.[dia] ? dia : primerDia)
        setHorarioSel(horario)
      } else {
        setDiaSel(primerDia)
      }

      const { data } = await supabase.auth.getUser()
      if (cancelado) return
      if (data.user?.email) {
        const nombreMeta = (data.user.user_metadata?.full_name || data.user.user_metadata?.nombre || '') as string
        setUsuario({ email: data.user.email, nombre: nombreMeta })
        setNombre(nombreMeta)
        setTelefono((data.user.user_metadata?.telefono as string) || '')
      } else {
        setUsuario(null)
      }
    })()
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const irAIngresar = () => {
    try {
      if (horarioSel) sessionStorage.setItem(claveSeleccion, JSON.stringify({ serviceId: service.id, inicio: horarioSel.inicio }))
    } catch {}
    const destino = window.location.pathname
    window.location.href = apiUrl('/tienda/cuenta', `next=${encodeURIComponent(destino)}`)
  }

  const anotarseEnEspera = async () => {
    if (!diaSel) return
    if (!usuario) {
      irAIngresar()
      return
    }
    setEspera({ enviando: true, ok: null })
    setError(null)
    const res = await fetch(`/api/turnos/espera${tenantQuery}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId: service.id, fecha: diaSel, nombre, telefono }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setEspera({ enviando: false, ok: data.yaAnotado ? 'Ya estabas anotado para ese día. Te avisamos por email si se libera un lugar.' : 'Listo: si se libera un turno ese día te avisamos por email.' })
      return
    }
    if (res.status === 401) {
      irAIngresar()
      return
    }
    setEspera({ enviando: false, ok: null })
    setError(data?.error || 'No pudimos anotarte. Probá de nuevo.')
  }

  const confirmar = async () => {
    if (!horarioSel) return
    if (!nombre.trim()) {
      setError('Escribí tu nombre para reservar.')
      return
    }
    setEnviando(true)
    setError(null)
    const res = await fetch(`/api/turnos${tenantQuery}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId: service.id, inicio: horarioSel.inicio, nombre, telefono, notas }),
    })
    const data = await res.json().catch(() => ({}))
    setEnviando(false)

    if (res.ok && data.pago) {
      // Seña: se crea la preferencia con el mismo endpoint del checkout y se
      // redirige a Mercado Pago. Al volver, la página del turno muestra el estado.
      setEnviando(true)
      const pref = await fetch(`/api/checkout/mercadopago/preference${tenantQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: data.pago.orderId, publicToken: data.pago.publicToken, storeId, returnOrigin: window.location.origin }),
      })
      const prefData = await pref.json().catch(() => ({}))
      if (pref.ok && prefData.initPoint) {
        window.location.href = prefData.initPoint
        return
      }
      setEnviando(false)
      setError('Reservamos tu horario pero no pudimos abrir Mercado Pago. Probá de nuevo desde el enlace de tu turno.')
      setResultado({ estado: 'pendiente', starts_at: data.booking.starts_at, whatsappUrl: data.whatsappUrl, enlaceTurno: data.enlaceTurno })
      return
    }
    if (res.ok) {
      setResultado({ estado: data.booking.estado, starts_at: data.booking.starts_at, whatsappUrl: data.whatsappUrl, enlaceTurno: data.enlaceTurno })
      return
    }
    if (res.status === 401) {
      irAIngresar()
      return
    }
    setError(data?.error || 'No se pudo reservar. Probá de nuevo.')
    if (res.status === 409) {
      // Alguien tomó ese horario: se recargan los horarios del día.
      setHorarioSel(null)
      await cargarDias(0)
    }
  }

  const tarjeta = 'rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.02] p-4 sm:p-5'

  // ------------------------------------------------------------- Confirmado
  if (resultado) {
    const pendiente = resultado.estado === 'pendiente'
    const fin = new Date(new Date(resultado.starts_at).getTime() + service.duracion * 60000).toISOString()
    return (
      <div className={`${tarjeta} space-y-4`}>
        <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <Check className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{pendiente ? '¡Solicitud enviada!' : '¡Turno reservado!'}</h2>
          <p className="text-sm opacity-75 mt-1">
            {service.nombre} · <span className="capitalize">{formatFechaTurno(resultado.starts_at, zona)}</span>
          </p>
          {renglonesImporte(service.precio ?? 0, 0).map((renglon) => (
            <p key={renglon} className="text-sm opacity-75">{renglon}</p>
          ))}
          <p className="text-sm opacity-75 mt-2">
            {pendiente
              ? `${storeNombre} va a confirmar tu turno. Te avisamos por email.`
              : 'Te mandamos un email con el detalle y el enlace para cancelar si lo necesitás.'}
          </p>
        </div>
        <div className="grid gap-2">
          {resultado.whatsappUrl && (
            <a href={resultado.whatsappUrl} target="_blank" rel="noopener noreferrer" className="min-h-12 rounded-xl bg-[#25D366] text-white text-sm font-semibold inline-flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> Avisar a la tienda por WhatsApp
            </a>
          )}
          {!pendiente && (
            <a
              href={googleCalendarUrl({ titulo: `${service.nombre} — ${storeNombre}`, inicio: resultado.starts_at, fin, detalle: `Ver o cancelar: ${resultado.enlaceTurno}` })}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-12 rounded-xl border border-black/15 dark:border-white/15 text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              <CalendarPlus className="w-4 h-4" /> Agregar a mi calendario
            </a>
          )}
          <a href={resultado.enlaceTurno} className="min-h-12 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1 opacity-75 hover:opacity-100">
            Ver mi turno <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    )
  }

  const diasTira = Array.from({ length: Math.min(diasCargados || BLOQUE_DIAS, maxDias) }, (_, i) => sumarDias(hoy, i))
  const horariosDia = diaSel ? dias[diaSel] ?? [] : []

  return (
    <div className={`${tarjeta} space-y-5`}>
      <div className="flex items-center gap-2">
        <CalendarCheck className="w-5 h-5 text-[var(--color-primario)]" />
        <h2 className="text-lg font-semibold">Reservá tu turno</h2>
      </div>

      {/* 1. Día */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-60">1. Elegí el día</p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {diasTira.map((f) => {
            const libres = dias[f]?.length ?? 0
            const lleno = libres === 0 && completos.has(f)
            const d = new Date(`${f}T12:00:00Z`)
            const activo = f === diaSel
            return (
              <button
                key={f}
                type="button"
                disabled={libres === 0 && !lleno}
                onClick={() => {
                  setDiaSel(f)
                  setHorarioSel(null)
                  setError(null)
                  setEspera({ enviando: false, ok: null })
                }}
                className={`shrink-0 min-w-[58px] min-h-[68px] rounded-2xl border flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  activo
                    ? 'border-[var(--color-primario)] bg-[var(--color-primario)] text-[var(--color-primario-texto)]'
                    : libres > 0
                      ? 'border-black/15 dark:border-white/15 hover:border-[var(--color-primario)] cursor-pointer'
                      : lleno
                        ? 'border-dashed border-black/20 dark:border-white/20 opacity-70 cursor-pointer'
                        : 'border-black/5 dark:border-white/5 opacity-35 cursor-not-allowed'
                }`}
              >
                <span className="text-[11px] capitalize">{f === hoy ? 'Hoy' : new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: 'UTC' }).format(d)}</span>
                <span className="text-lg font-semibold leading-none">{d.getUTCDate()}</span>
                <span className="text-[10px] capitalize">{lleno ? 'Lleno' : new Intl.DateTimeFormat('es-AR', { month: 'short', timeZone: 'UTC' }).format(d)}</span>
              </button>
            )
          })}
          {diasCargados < maxDias && (
            <button
              type="button"
              disabled={cargando}
              onClick={() => cargarDias(diasCargados)}
              className="shrink-0 min-w-[72px] min-h-[68px] rounded-2xl border border-dashed border-black/20 dark:border-white/20 text-xs font-semibold cursor-pointer"
            >
              {cargando ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Más días'}
            </button>
          )}
        </div>
      </div>

      {/* 2. Horario */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-60">2. Elegí el horario</p>
        {cargando && Object.keys(dias).length === 0 ? (
          <Loader2 className="w-5 h-5 animate-spin opacity-60" />
        ) : !diaSel ? (
          <p className="text-sm opacity-70">No hay turnos libres en los próximos días. Probá con &quot;Más días&quot; o escribile a la tienda.</p>
        ) : horariosDia.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm opacity-70">Ese día ya no tiene horarios libres.</p>
            {completos.has(diaSel) &&
              (espera.ok ? (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-start gap-2">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" /> {espera.ok}
                </p>
              ) : (
                <button
                  type="button"
                  disabled={espera.enviando}
                  onClick={anotarseEnEspera}
                  className="w-full min-h-12 rounded-xl border border-[var(--color-primario)] text-[var(--color-primario)] text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {espera.enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
                  Avisarme si se libera un turno
                </button>
              ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {horariosDia.map((h) => (
              <button
                key={h.inicio}
                type="button"
                onClick={() => {
                  setHorarioSel(h)
                  setError(null)
                }}
                className={`min-h-12 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                  horarioSel?.inicio === h.inicio
                    ? 'border-[var(--color-primario)] bg-[var(--color-primario)] text-[var(--color-primario-texto)]'
                    : 'border-black/15 dark:border-white/15 hover:border-[var(--color-primario)]'
                }`}
              >
                {h.etiqueta}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Confirmar */}
      {horarioSel && (
        <div className="space-y-3 border-t border-black/10 dark:border-white/10 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-60">3. Confirmá</p>
          <p className="text-sm">
            <strong>{service.nombre}</strong> ({formatDuracion(service.duracion)})<br />
            <span className="capitalize">{formatFechaTurno(horarioSel.inicio, zona)}</span>
          </p>

          {usuario === undefined ? (
            <Loader2 className="w-5 h-5 animate-spin opacity-60" />
          ) : usuario === null ? (
            <div className="space-y-2">
              <p className="text-sm opacity-75">Para reservar necesitás tu cuenta en {storeNombre}. Es gratis y te lleva un minuto.</p>
              <button type="button" onClick={irAIngresar} className="w-full min-h-12 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer">
                <LogIn className="w-4 h-4" /> Ingresar o crear mi cuenta
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input className="min-h-12 px-3 rounded-xl border border-black/15 dark:border-white/15 bg-transparent text-base sm:text-sm" maxLength={100} placeholder="Tu nombre" aria-label="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                <input className="min-h-12 px-3 rounded-xl border border-black/15 dark:border-white/15 bg-transparent text-base sm:text-sm" maxLength={30} inputMode="tel" placeholder="Tu WhatsApp" aria-label="Tu WhatsApp" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              </div>
              <textarea className="w-full min-h-12 px-3 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-transparent text-base sm:text-sm" rows={2} maxLength={500} placeholder="¿Algo que la tienda deba saber? (opcional)" aria-label="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
              <button type="button" disabled={enviando} onClick={confirmar} className="w-full min-h-12 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {sena > 0 ? `Pagar seña de ${formatPesos(sena)} y reservar` : requiereAprobacion ? 'Solicitar turno' : 'Confirmar turno'}
              </button>
              {sena > 0 && (
                <p className="text-[11px] opacity-70">
                  Para confirmar el turno se paga una seña con Mercado Pago. Tenés 20 minutos para completar el pago; si no, el horario se libera.
                </p>
              )}
              <p className="text-[11px] opacity-60">
                Reservás como {usuario.email}.{cancelacionHoras > 0 ? ` Podés cancelar hasta ${cancelacionHoras} h antes.` : ' Podés cancelar cuando quieras.'}
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </p>
      )}
    </div>
  )
}
