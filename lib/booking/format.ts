// =============================================================================
// PORTALMAKER — Formatos de turnos (sin dependencias de servidor)
// Se usa en emails, en la confirmación del cliente y en el panel.
// =============================================================================

const TZ_DEFAULT = 'America/Argentina/Buenos_Aires'

/** "jueves 12 de noviembre, 10:00 hs" en la zona de la tienda. */
export function formatFechaTurno(iso: string | Date, zona: string = TZ_DEFAULT): string {
  const fecha = typeof iso === 'string' ? new Date(iso) : iso
  const dia = new Intl.DateTimeFormat('es-AR', { timeZone: zona, weekday: 'long', day: 'numeric', month: 'long' }).format(fecha)
  const hora = new Intl.DateTimeFormat('es-AR', { timeZone: zona, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(fecha)
  return `${dia}, ${hora} hs`
}

/** "10:00" en la zona de la tienda. */
export function formatHora(iso: string | Date, zona: string = TZ_DEFAULT): string {
  const fecha = typeof iso === 'string' ? new Date(iso) : iso
  return new Intl.DateTimeFormat('es-AR', { timeZone: zona, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(fecha)
}

/** "1 h 30 min" a partir de minutos. */
export function formatDuracion(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

function compactUtc(fecha: Date): string {
  // Formato que pide Google Calendar: 20261112T130000Z
  return fecha.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Enlace para que el cliente agregue el turno a su Google Calendar (sin permisos). */
export function googleCalendarUrl(params: {
  titulo: string
  inicio: string
  fin: string
  detalle?: string
  ubicacion?: string | null
}): string {
  const url = new URL('https://calendar.google.com/calendar/render')
  url.searchParams.set('action', 'TEMPLATE')
  url.searchParams.set('text', params.titulo)
  url.searchParams.set('dates', `${compactUtc(new Date(params.inicio))}/${compactUtc(new Date(params.fin))}`)
  if (params.detalle) url.searchParams.set('details', params.detalle)
  if (params.ubicacion) url.searchParams.set('location', params.ubicacion)
  return url.toString()
}

/**
 * Mensaje de WhatsApp del cliente a la tienda con el detalle del turno.
 * Las reservas le llegan al dueño por WhatsApp, igual que las ventas.
 * Sin emojis (regla del proyecto).
 */
export function whatsappReservaUrl(params: {
  numeroTienda: string
  servicio: string
  inicio: string
  zona?: string
  cliente: string
  telefono?: string | null
  pendiente?: boolean
  enlaceTurno?: string
}): string | null {
  const numero = (params.numeroTienda || '').replace(/[^0-9]/g, '')
  if (!numero) return null

  const lineas = [
    params.pendiente ? 'Hola, solicité un turno:' : 'Hola, reservé un turno:',
    `- Servicio: ${params.servicio}`,
    `- Día y hora: ${formatFechaTurno(params.inicio, params.zona)}`,
    `- Nombre: ${params.cliente}`,
  ]
  if (params.telefono) lineas.push(`- Teléfono: ${params.telefono}`)
  if (params.enlaceTurno) lineas.push(`Detalle: ${params.enlaceTurno}`)

  return `https://wa.me/${numero}?text=${encodeURIComponent(lineas.join('\n'))}`
}
