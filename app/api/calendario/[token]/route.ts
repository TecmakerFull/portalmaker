// =============================================================================
// PORTALMAKER — GET /api/calendario/{token}.ics
// Calendario privado de turnos de un profesional, para suscribirse desde
// Google Calendar ("Agregar calendario → Desde URL"), Apple o Outlook.
//
// Por qué así y no con permisos de Google: no requiere la verificación de la
// app en Google (scopes sensibles). Es de una sola dirección y Google lo
// refresca cada varias horas. El token es secreto y se puede regenerar desde
// Horarios y reglas si se filtra.
// =============================================================================

import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import type { Booking } from '@/types/database'

const UUID_REGEX = /^[0-9a-f-]{36}$/i

/** Escapa texto según RFC 5545 (barras, comas, punto y coma y saltos de línea). */
function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** 20261112T130000Z */
function fechaIcs(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Corta líneas largas a 75 octetos como pide el estándar (aproximado por caracteres). */
function plegar(linea: string): string {
  if (linea.length <= 74) return linea
  const partes: string[] = []
  for (let i = 0; i < linea.length; i += 73) partes.push((i === 0 ? '' : ' ') + linea.slice(i, i + 73))
  return partes.join('\r\n')
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const rate = await checkRateLimit({ ip: `ics:${getClientIp(req)}`, maxPerIp: 30, windowMs: 60000 })
  if (!rate.allowed) return new Response('Demasiadas solicitudes', { status: 429 })

  const { token: raw } = await params
  const token = raw.replace(/\.ics$/i, '')
  if (!UUID_REGEX.test(token)) return new Response('No encontrado', { status: 404 })

  const supabaseAdmin = createSupabaseAdminClient()
  const { data: staff } = await supabaseAdmin
    .from('staff')
    .select('id, nombre, store_id, stores(nombre)')
    .eq('ics_token', token)
    .maybeSingle()
  if (!staff) return new Response('No encontrado', { status: 404 })

  // Turnos del último mes y los próximos 4 meses
  const desde = new Date(Date.now() - 30 * 24 * 3600000).toISOString()
  const hasta = new Date(Date.now() + 120 * 24 * 3600000).toISOString()
  const { data: turnos } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('staff_id', staff.id)
    .in('estado', ['pendiente', 'confirmado', 'completado'])
    .gte('starts_at', desde)
    .lte('starts_at', hasta)
    .order('starts_at', { ascending: true })

  const tienda = (staff as unknown as { stores?: { nombre?: string } }).stores?.nombre || 'Portalmaker'
  const ahora = fechaIcs(new Date().toISOString())

  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Portalmaker//Turnos//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(`Turnos ${tienda}`)}`,
    'X-WR-TIMEZONE:America/Argentina/Buenos_Aires',
    // Sugerencia de refresco para los clientes que la respetan (Google usa su propio ritmo)
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ]

  for (const t of (turnos ?? []) as Booking[]) {
    const pendiente = t.estado === 'pendiente'
    const detalle = [
      t.cliente_telefono ? `WhatsApp: ${t.cliente_telefono}` : null,
      t.cliente_email ? `Email: ${t.cliente_email}` : null,
      t.notas_cliente ? `Nota: ${t.notas_cliente}` : null,
      pendiente ? 'Estado: por confirmar' : null,
    ]
      .filter(Boolean)
      .join('\n')

    lineas.push(
      'BEGIN:VEVENT',
      `UID:${t.id}@portalmaker`,
      `DTSTAMP:${ahora}`,
      `DTSTART:${fechaIcs(t.starts_at)}`,
      `DTEND:${fechaIcs(t.ends_at)}`,
      plegar(`SUMMARY:${escapeIcs(`${pendiente ? '[Por confirmar] ' : ''}${t.servicio_nombre} - ${t.cliente_nombre}`)}`),
      plegar(`DESCRIPTION:${escapeIcs(detalle)}`),
      `STATUS:${pendiente ? 'TENTATIVE' : 'CONFIRMED'}`,
      'END:VEVENT'
    )
  }

  lineas.push('END:VCALENDAR')

  return new Response(lineas.join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="turnos.ics"',
      'Cache-Control': 'private, max-age=300',
    },
  })
}
