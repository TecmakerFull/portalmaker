// =============================================================================
// PORTALMAKER — Cálculo de horarios libres para turnos
//
// Función pura (sin base de datos ni red) para poder testearla a fondo: es el
// corazón del sistema de turnos. Recibe la disponibilidad semanal del
// profesional, lo ya ocupado (turnos y bloqueos) y las reglas de la tienda, y
// devuelve los horarios de inicio que se pueden ofrecer en una fecha.
//
// Todo se calcula en la zona horaria de la tienda. Las fechas de entrada son
// "YYYY-MM-DD" locales; los instantes de salida son Date (UTC).
// =============================================================================

export type DiaSemanaKey = 'domingo' | 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado'

// Mismo formato que HorariosConfig.dias de lib/horarios.ts, así el dueño
// edita su disponibilidad con el editor de horarios que ya conoce.
export interface DiaDisponible {
  activo: boolean
  turno1: { desde: string; hasta: string }
  dobleTurno: boolean
  turno2: { desde: string; hasta: string }
}

export type DisponibilidadSemanal = Partial<Record<DiaSemanaKey, DiaDisponible>>

export interface RangoOcupado {
  inicio: Date
  fin: Date
}

export interface ReglasReserva {
  zonaHoraria: string
  intervaloMinutos: number
  anticipacionMinMinutos: number
  anticipacionMaxDias: number
}

export interface Horario {
  inicio: Date
  fin: Date
  // "HH:MM" en la hora local de la tienda, listo para mostrar en un botón
  etiqueta: string
}

const DIAS_POR_INDICE: DiaSemanaKey[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/
const HORA_REGEX = /^([01]\d|2[0-4]):([0-5]\d)$/

/** Diferencia en minutos entre la hora local de `zona` y UTC en un instante dado. */
function offsetMinutos(instante: Date, zona: string): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instante)
  const get = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value)
  const comoUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return Math.round((comoUtc - instante.getTime()) / 60000)
}

/**
 * Convierte una fecha y hora locales ("2026-11-12", "10:30") de una zona
 * horaria al instante UTC correspondiente. Se recalcula el offset una segunda
 * vez para que funcione también en zonas con cambio de horario.
 */
export function localAUtc(fecha: string, hora: string, zona: string): Date {
  const [y, m, d] = fecha.split('-').map(Number)
  const [hh, mm] = hora.split(':').map(Number)
  const supuesto = Date.UTC(y, m - 1, d, hh, mm)
  const offset1 = offsetMinutos(new Date(supuesto), zona)
  let ts = supuesto - offset1 * 60000
  const offset2 = offsetMinutos(new Date(ts), zona)
  if (offset2 !== offset1) ts = supuesto - offset2 * 60000
  return new Date(ts)
}

/** "HH:MM" de un instante en la zona de la tienda. */
export function horaLocal(instante: Date, zona: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: zona,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instante)
}

/** "YYYY-MM-DD" de un instante en la zona de la tienda. */
export function fechaLocal(instante: Date, zona: string): string {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instante)
}

/** Día de la semana de una fecha local "YYYY-MM-DD" (no depende de la zona). */
export function diaSemana(fecha: string): DiaSemanaKey {
  const [y, m, d] = fecha.split('-').map(Number)
  return DIAS_POR_INDICE[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

/** Suma días a una fecha local "YYYY-MM-DD". */
export function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, d + dias))
  return base.toISOString().slice(0, 10)
}

function seSuperpone(inicio: Date, fin: Date, ocupados: RangoOcupado[]): boolean {
  // Rangos semiabiertos [inicio, fin): un turno que termina 10:00 no choca con otro que empieza 10:00
  return ocupados.some((o) => inicio < o.fin && fin > o.inicio)
}

/**
 * Horarios de inicio disponibles para un servicio en una fecha local.
 *
 * - duracionMinutos: lo que dura el servicio (lo que ve el cliente).
 * - bufferMinutos: tiempo extra que queda ocupado después (limpieza, preparación).
 *   Puede excederse del cierre de la franja: no tiene sentido negar el último
 *   turno del día por un tiempo de limpieza.
 * - ocupados: turnos activos (con su buffer) y bloqueos del profesional.
 */
export function calcularHorariosDisponibles(params: {
  fecha: string
  disponibilidad: DisponibilidadSemanal
  duracionMinutos: number
  bufferMinutos?: number
  ocupados: RangoOcupado[]
  reglas: ReglasReserva
  ahora: Date
}): Horario[] {
  const { fecha, disponibilidad, duracionMinutos, ocupados, reglas, ahora } = params
  const buffer = Math.max(0, params.bufferMinutos ?? 0)

  if (!FECHA_REGEX.test(fecha) || duracionMinutos <= 0 || reglas.intervaloMinutos <= 0) return []

  const dia = disponibilidad[diaSemana(fecha)]
  if (!dia?.activo) return []

  const franjas = [dia.turno1, ...(dia.dobleTurno ? [dia.turno2] : [])].filter(
    (f) => f && HORA_REGEX.test(f.desde) && HORA_REGEX.test(f.hasta) && f.hasta > f.desde
  )

  const minimo = new Date(ahora.getTime() + reglas.anticipacionMinMinutos * 60000)
  const maximo = new Date(ahora.getTime() + reglas.anticipacionMaxDias * 24 * 60 * 60000)
  const paso = reglas.intervaloMinutos * 60000
  const duracion = duracionMinutos * 60000

  const resultado: Horario[] = []
  const vistos = new Set<number>()

  for (const franja of franjas) {
    const aperturaFranja = localAUtc(fecha, franja.desde, reglas.zonaHoraria)
    const cierreFranja = localAUtc(fecha, franja.hasta, reglas.zonaHoraria)

    for (let t = aperturaFranja.getTime(); t + duracion <= cierreFranja.getTime(); t += paso) {
      const inicio = new Date(t)
      const fin = new Date(t + duracion)
      const ocupadoHasta = new Date(fin.getTime() + buffer * 60000)

      if (inicio < minimo || inicio > maximo) continue
      if (seSuperpone(inicio, ocupadoHasta, ocupados)) continue
      if (vistos.has(t)) continue // franjas superpuestas mal cargadas

      vistos.add(t)
      resultado.push({ inicio, fin, etiqueta: horaLocal(inicio, reglas.zonaHoraria) })
    }
  }

  return resultado.sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
}

/**
 * Verifica que un inicio concreto siga disponible. Se usa al confirmar la
 * reserva en el servidor: nunca se confía en que el horario que eligió el
 * navegador siga libre (la base igual rechaza superposiciones).
 */
export function esHorarioDisponible(
  inicio: Date,
  params: Omit<Parameters<typeof calcularHorariosDisponibles>[0], 'fecha'>
): boolean {
  const fecha = fechaLocal(inicio, params.reglas.zonaHoraria)
  return calcularHorariosDisponibles({ ...params, fecha }).some((h) => h.inicio.getTime() === inicio.getTime())
}
