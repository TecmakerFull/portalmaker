// =============================================================================
// PORTALMAKER — Gestión de Horarios de Atención Semanales y Estado en Vivo
// =============================================================================

export interface FranjaHoraria {
  desde: string // ej: "09:00"
  hasta: string // ej: "13:00"
}

export interface DiaHorario {
  activo: boolean // true = abierto, false = cerrado
  turno1: FranjaHoraria
  dobleTurno: boolean // true = habilitar segundo turno (tarde)
  turno2: FranjaHoraria
}

export type DiaSemana =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo'

export const DIAS_SEMANA: { key: DiaSemana; label: string; shortLabel: string }[] = [
  { key: 'lunes', label: 'Lunes', shortLabel: 'Lun' },
  { key: 'martes', label: 'Martes', shortLabel: 'Mar' },
  { key: 'miercoles', label: 'Miércoles', shortLabel: 'Mié' },
  { key: 'jueves', label: 'Jueves', shortLabel: 'Jue' },
  { key: 'viernes', label: 'Viernes', shortLabel: 'Vie' },
  { key: 'sabado', label: 'Sábado', shortLabel: 'Sáb' },
  { key: 'domingo', label: 'Domingo', shortLabel: 'Dom' },
]

export interface HorariosConfig {
  mostrar: boolean
  dias: Record<DiaSemana, DiaHorario>
}

export const DEFAULT_HORARIOS_CONFIG: HorariosConfig = {
  mostrar: false,
  dias: {
    lunes: {
      activo: true,
      turno1: { desde: '09:00', hasta: '13:00' },
      dobleTurno: true,
      turno2: { desde: '16:00', hasta: '20:00' },
    },
    martes: {
      activo: true,
      turno1: { desde: '09:00', hasta: '13:00' },
      dobleTurno: true,
      turno2: { desde: '16:00', hasta: '20:00' },
    },
    miercoles: {
      activo: true,
      turno1: { desde: '09:00', hasta: '13:00' },
      dobleTurno: true,
      turno2: { desde: '16:00', hasta: '20:00' },
    },
    jueves: {
      activo: true,
      turno1: { desde: '09:00', hasta: '13:00' },
      dobleTurno: true,
      turno2: { desde: '16:00', hasta: '20:00' },
    },
    viernes: {
      activo: true,
      turno1: { desde: '09:00', hasta: '13:00' },
      dobleTurno: true,
      turno2: { desde: '16:00', hasta: '20:00' },
    },
    sabado: {
      activo: true,
      turno1: { desde: '09:00', hasta: '13:00' },
      dobleTurno: false,
      turno2: { desde: '16:00', hasta: '20:00' },
    },
    domingo: {
      activo: false,
      turno1: { desde: '09:00', hasta: '13:00' },
      dobleTurno: false,
      turno2: { desde: '16:00', hasta: '20:00' },
    },
  },
}

const TAG_JSON = '<!--HORARIOS_CONFIG:'
const TAG_JSON_END = '-->'

/**
 * Parsea la configuración de horarios desde la tienda (soporta columna dedicada o payload embebido)
 */
export function parseHorarios(store: {
  mostrar_horarios?: boolean | null
  horarios_semanales?: any
  horario_atencion?: string | null
}): HorariosConfig {
  // 1. Si existe columna JSONB horarios_semanales
  if (store.horarios_semanales && typeof store.horarios_semanales === 'object') {
    return {
      mostrar: Boolean(store.mostrar_horarios ?? store.horarios_semanales.mostrar ?? false),
      dias: {
        ...DEFAULT_HORARIOS_CONFIG.dias,
        ...(store.horarios_semanales.dias || store.horarios_semanales),
      },
    }
  }

  // 2. Si está serializado en horario_atencion con tag <!--HORARIOS_CONFIG:...-->
  const raw = store.horario_atencion || ''
  if (raw.includes(TAG_JSON)) {
    try {
      const jsonStr = raw.substring(
        raw.indexOf(TAG_JSON) + TAG_JSON.length,
        raw.indexOf(TAG_JSON_END, raw.indexOf(TAG_JSON))
      )
      const parsed = JSON.parse(jsonStr)
      return {
        mostrar: Boolean(store.mostrar_horarios ?? parsed.mostrar ?? true),
        dias: {
          ...DEFAULT_HORARIOS_CONFIG.dias,
          ...(parsed.dias || parsed),
        },
      }
    } catch {
      // Fallback a default si hubo error en parseo
    }
  }

  // 3. Fallback: si hay horario_atencion pero texto libre, dejamos mostrar en false o true si no vacío
  return {
    ...DEFAULT_HORARIOS_CONFIG,
    mostrar: Boolean(store.mostrar_horarios ?? false),
  }
}

/**
 * Genera un texto amigable y legible para humanos a partir de la configuración
 * Ej: "Lun a Vie 09:00 - 13:00 / 16:00 - 20:00 · Sáb 09:00 - 13:00"
 */
export function generarTextoHorarios(config: HorariosConfig): string {
  const lineas: string[] = []

  // Agrupar días contiguos que tengan exactamente el mismo horario
  const formatearDia = (d: DiaHorario): string => {
    if (!d.activo) return 'Cerrado'
    let txt = `${d.turno1.desde} a ${d.turno1.hasta} hs`
    if (d.dobleTurno && d.turno2.desde && d.turno2.hasta) {
      txt += ` y ${d.turno2.desde} a ${d.turno2.hasta} hs`
    }
    return txt
  }

  let grupoInicio = 0
  while (grupoInicio < DIAS_SEMANA.length) {
    const diaA = DIAS_SEMANA[grupoInicio]
    const formatoA = formatearDia(config.dias[diaA.key])

    let grupoFin = grupoInicio
    while (
      grupoFin + 1 < DIAS_SEMANA.length &&
      formatearDia(config.dias[DIAS_SEMANA[grupoFin + 1].key]) === formatoA
    ) {
      grupoFin++
    }

    if (formatoA !== 'Cerrado') {
      const etiqueta =
        grupoInicio === grupoFin
          ? diaA.shortLabel
          : `${diaA.shortLabel} a ${DIAS_SEMANA[grupoFin].shortLabel}`
      lineas.push(`${etiqueta}: ${formatoA}`)
    }

    grupoInicio = grupoFin + 1
  }

  return lineas.length > 0 ? lineas.join(' · ') : 'Cerrado temporalmente'
}

/**
 * Serializa la configuración para almacenamiento seguro
 */
export function serializeHorarioPayload(config: HorariosConfig): {
  resumen: string
  payloadCompleto: string
} {
  const resumen = generarTextoHorarios(config)
  const payloadCompleto = `${resumen}${TAG_JSON}${JSON.stringify(config)}${TAG_JSON_END}`
  return { resumen, payloadCompleto }
}

/**
 * Limpia el texto de horario_atencion para remover tags internos si los hubiese
 */
export function limpiarTextoHorario(raw?: string | null): string {
  if (!raw) return ''
  if (!raw.includes(TAG_JSON)) return raw.trim()
  return raw.split(TAG_JSON)[0].trim()
}

export interface EstadoTienda {
  abierto: boolean
  mensaje: string
  detalleTurno?: string
  diaActualKey: DiaSemana
  diaActualNombre: string
}

/**
 * Calcula en tiempo real el estado de apertura de la tienda en horario de Argentina
 */
export function getEstadoTienda(config: HorariosConfig, refDate = new Date()): EstadoTienda {
  // Convertir fecha a hora de Argentina (UTC-3)
  const fechaAr = new Date(
    refDate.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })
  )

  const dayOfWeek = fechaAr.getDay() // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const diasMap: DiaSemana[] = [
    'domingo',
    'lunes',
    'martes',
    'miercoles',
    'jueves',
    'viernes',
    'sabado',
  ]
  const diaKey = diasMap[dayOfWeek]
  const diaConfig = config.dias[diaKey]

  const horaActualMinutos = fechaAr.getHours() * 60 + fechaAr.getMinutes()

  const parseMinutos = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }

  const diaActualInfo = DIAS_SEMANA.find((d) => d.key === diaKey)!

  if (!diaConfig || !diaConfig.activo) {
    return {
      abierto: false,
      mensaje: 'Cerrado hoy',
      diaActualKey: diaKey,
      diaActualNombre: diaActualInfo.label,
    }
  }

  const t1Desde = parseMinutos(diaConfig.turno1.desde)
  const t1Hasta = parseMinutos(diaConfig.turno1.hasta)

  // ¿Está dentro del turno 1?
  if (horaActualMinutos >= t1Desde && horaActualMinutos < t1Hasta) {
    return {
      abierto: true,
      mensaje: `Abierto ahora`,
      detalleTurno: `Cierra a las ${diaConfig.turno1.hasta} hs`,
      diaActualKey: diaKey,
      diaActualNombre: diaActualInfo.label,
    }
  }

  // Antes del turno 1
  if (horaActualMinutos < t1Desde) {
    return {
      abierto: false,
      mensaje: `Cerrado ahora`,
      detalleTurno: `Abre hoy a las ${diaConfig.turno1.desde} hs`,
      diaActualKey: diaKey,
      diaActualNombre: diaActualInfo.label,
    }
  }

  // Si tiene turno 2 (tarde)
  if (diaConfig.dobleTurno && diaConfig.turno2.desde && diaConfig.turno2.hasta) {
    const t2Desde = parseMinutos(diaConfig.turno2.desde)
    const t2Hasta = parseMinutos(diaConfig.turno2.hasta)

    // Entre turno 1 y turno 2
    if (horaActualMinutos >= t1Hasta && horaActualMinutos < t2Desde) {
      return {
        abierto: false,
        mensaje: `Cerrado al mediodía`,
        detalleTurno: `Vuelve a abrir hoy a las ${diaConfig.turno2.desde} hs`,
        diaActualKey: diaKey,
        diaActualNombre: diaActualInfo.label,
      }
    }

    // Dentro del turno 2
    if (horaActualMinutos >= t2Desde && horaActualMinutos < t2Hasta) {
      return {
        abierto: true,
        mensaje: `Abierto ahora`,
        detalleTurno: `Cierra a las ${diaConfig.turno2.hasta} hs`,
        diaActualKey: diaKey,
        diaActualNombre: diaActualInfo.label,
      }
    }
  }

  // Ya cerró por hoy
  return {
    abierto: false,
    mensaje: `Cerrado por hoy`,
    detalleTurno: `Cerró su atención por hoy`,
    diaActualKey: diaKey,
    diaActualNombre: diaActualInfo.label,
  }
}
