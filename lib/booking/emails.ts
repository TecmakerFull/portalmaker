// =============================================================================
// PORTALMAKER — Emails de turnos (confirmación al cliente y aviso a la tienda)
// Reusa el envío por Resend de lib/store-auth-email.ts. Todo valor
// interpolado se escapa (los datos vienen del cliente).
// =============================================================================

import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { escapeHtml, sendStoreAuthEmail } from '@/lib/store-auth-email'
import { formatFechaTurno, formatDuracion, googleCalendarUrl, renglonesImporte } from '@/lib/booking/format'
import type { Booking, Store } from '@/types/database'

function layout(storeName: string, cuerpo: string): string {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f8fafc; color:#1e293b; margin:0; padding:32px 16px; }
  .card { max-width:520px; margin:0 auto; background:#fff; border-radius:20px; border:1px solid #e2e8f0; padding:32px 26px; }
  h1 { font-size:20px; font-weight:600; margin:0 0 12px; color:#0f172a; }
  p { font-size:14px; line-height:1.6; color:#475569; margin:0 0 16px; }
  .box { background:#f1f5f9; border-radius:12px; padding:16px; margin:16px 0; font-size:14px; line-height:1.7; }
  .btn { display:inline-block; background:#0f172a; color:#fff !important; text-decoration:none; padding:12px 22px; border-radius:12px; font-size:14px; font-weight:600; margin:4px 4px 4px 0; }
  .btn-sec { background:#e2e8f0; color:#0f172a !important; }
  .footer { font-size:11px; color:#94a3b8; text-align:center; margin-top:20px; }
</style></head>
<body><div class="card">${cuerpo}</div><div class="footer">Enviado por <strong>${escapeHtml(storeName)}</strong> vía Portalmaker</div></body></html>`
}

/**
 * Seña que el cliente ya pagó por este turno (0 si no hubo). Se lee de la orden
 * vinculada, y solo cuenta si el pago está acreditado.
 */
async function senaAbonada(booking: Booking): Promise<number> {
  if (!booking.order_id) return 0
  const { data } = await createSupabaseAdminClient()
    .from('orders')
    .select('total, estado_pago')
    .eq('id', booking.order_id)
    .maybeSingle()
  return data && data.estado_pago === 'aprobado' ? Number(data.total) || 0 : 0
}

function detalleTurno(booking: Booking, zona: string, sena = 0): string {
  const importes = renglonesImporte(booking.precio, sena)
  return `<div class="box">
    <strong>${escapeHtml(booking.servicio_nombre)}</strong><br/>
    ${escapeHtml(formatFechaTurno(booking.starts_at, zona))}<br/>
    Duración: ${escapeHtml(formatDuracion(booking.servicio_duracion))}${importes.map((r) => `<br/>${escapeHtml(r)}`).join('')}
  </div>`
}

/** Confirmación (o solicitud pendiente) al cliente, con enlace para ver o cancelar. */
export async function sendBookingConfirmationEmail(params: {
  store: Store
  booking: Booking
  zona: string
  enlaceTurno: string
}): Promise<void> {
  const { store, booking, zona, enlaceTurno } = params
  if (!booking.cliente_email) return

  const pendiente = booking.estado === 'pendiente'
  const sena = await senaAbonada(booking)
  const calendario = googleCalendarUrl({
    titulo: `${booking.servicio_nombre} — ${store.nombre}`,
    inicio: booking.starts_at,
    fin: booking.ends_at,
    detalle: `Turno en ${store.nombre}. Ver o cancelar: ${enlaceTurno}`,
    ubicacion: store.direccion,
  })

  const cuerpo = `
    <h1>${pendiente ? 'Recibimos tu solicitud de turno' : 'Tu turno está confirmado'}</h1>
    <p>Hola ${escapeHtml(booking.cliente_nombre)}, ${
      pendiente
        ? `${escapeHtml(store.nombre)} va a revisar tu solicitud y te avisamos cuando la confirme.`
        : `te esperamos en ${escapeHtml(store.nombre)}.`
    }</p>
    ${detalleTurno(booking, zona, sena)}
    ${store.direccion ? `<p>Dirección: ${escapeHtml(store.direccion)}</p>` : ''}
    <div>
      ${pendiente ? '' : `<a class="btn" href="${escapeHtml(calendario)}">Agregar a mi calendario</a>`}
      <a class="btn btn-sec" href="${escapeHtml(enlaceTurno)}">Ver o cancelar mi turno</a>
    </div>`

  await sendStoreAuthEmail({
    to: booking.cliente_email,
    subject: pendiente ? `Solicitud de turno en ${store.nombre}` : `Turno confirmado en ${store.nombre}`,
    html: layout(store.nombre, cuerpo),
    fromName: String(store.nombre || 'Tu tienda').replace(/["<>\r\n]/g, '').slice(0, 80),
  })
}

/** Aviso a la tienda: turno nuevo o cancelado por el cliente. */
export async function notifyStoreBookingEmail(params: {
  store: Store
  booking: Booking
  zona: string
  tipo: 'nuevo' | 'cancelado' | 'pago_sin_lugar'
  enlacePanel: string
}): Promise<void> {
  const { store, booking, zona, tipo, enlacePanel } = params

  // admin_email no está en la vista pública: se lee con service_role.
  const supabaseAdmin = createSupabaseAdminClient()
  const { data } = await supabaseAdmin
    .from('stores')
    .select('admin_email, email_contacto')
    .eq('id', store.id)
    .maybeSingle()
  const destino = data?.email_contacto?.trim() || data?.admin_email?.trim()
  if (!destino) return

  const titulo =
    tipo === 'pago_sin_lugar'
      ? 'Seña cobrada sin horario disponible: coordiná con el cliente'
      : tipo === 'cancelado'
      ? 'Un cliente canceló su turno'
      : booking.estado === 'pendiente'
        ? 'Nueva solicitud de turno para confirmar'
        : 'Tenés un turno nuevo'

  const cuerpo = `
    <h1>${titulo}</h1>
    ${detalleTurno(booking, zona)}
    <p>Cliente: <strong>${escapeHtml(booking.cliente_nombre)}</strong>${
      booking.cliente_telefono ? `<br/>Teléfono: ${escapeHtml(booking.cliente_telefono)}` : ''
    }${booking.cliente_email ? `<br/>Email: ${escapeHtml(booking.cliente_email)}` : ''}${
      booking.notas_cliente ? `<br/>Notas: ${escapeHtml(booking.notas_cliente)}` : ''
    }</p>
    <a class="btn" href="${escapeHtml(enlacePanel)}">Ver agenda</a>`

  await sendStoreAuthEmail({
    to: destino,
    subject: `${titulo}: ${booking.servicio_nombre}`,
    html: layout(store.nombre, cuerpo),
    fromName: 'Portalmaker',
  })
}

/** Aviso a quien está en lista de espera: se liberó un lugar ese día. */
export async function sendWaitlistAvailableEmail(params: {
  store: Store
  to: string
  nombre: string
  servicio: string
  fechaTexto: string
  enlaceReserva: string
}): Promise<boolean> {
  const { store } = params
  const cuerpo = `
    <h1>Se liberó un turno</h1>
    <p>Hola ${escapeHtml(params.nombre)}, se liberó un lugar para <strong>${escapeHtml(params.servicio)}</strong> el ${escapeHtml(params.fechaTexto)} en ${escapeHtml(store.nombre)}.</p>
    <p>Avisamos a todas las personas en espera: el primero que reserva se lo queda.</p>
    <a class="btn" href="${escapeHtml(params.enlaceReserva)}">Reservar ahora</a>`

  return sendStoreAuthEmail({
    to: params.to,
    subject: `Se liberó un turno en ${store.nombre}`,
    html: layout(store.nombre, cuerpo),
    fromName: String(store.nombre || 'Tu tienda').replace(/["<>\r\n]/g, '').slice(0, 80),
  })
}

/** Aviso al cliente de que la tienda canceló o rechazó su turno. */
export async function sendBookingCancelledByStoreEmail(params: { store: Store; booking: Booking; zona: string }): Promise<void> {
  const { store, booking, zona } = params
  if (!booking.cliente_email) return
  const whatsapp = (store.whatsapp_numero || '').replace(/[^0-9]/g, '')
  const cuerpo = `
    <h1>Tu turno fue cancelado</h1>
    <p>Hola ${escapeHtml(booking.cliente_nombre)}, ${escapeHtml(store.nombre)} canceló este turno:</p>
    ${detalleTurno(booking, zona)}
    <p>Si querés, podés reservar otro horario o escribirle a la tienda.</p>
    ${whatsapp ? `<a class="btn" href="https://wa.me/${whatsapp}">Escribirle por WhatsApp</a>` : ''}`

  await sendStoreAuthEmail({
    to: booking.cliente_email,
    subject: `Tu turno en ${store.nombre} fue cancelado`,
    html: layout(store.nombre, cuerpo),
    fromName: String(store.nombre || 'Tu tienda').replace(/["<>\r\n]/g, '').slice(0, 80),
  })
}

/** Recordatorio al cliente X horas antes del turno. */
export async function sendBookingReminderEmail(params: {
  store: Store
  booking: Booking
  zona: string
  enlaceTurno: string
}): Promise<boolean> {
  const { store, booking, zona, enlaceTurno } = params
  if (!booking.cliente_email) return false
  const sena = await senaAbonada(booking)
  const cuerpo = `
    <h1>Te esperamos pronto</h1>
    <p>Hola ${escapeHtml(booking.cliente_nombre)}, te recordamos tu turno en ${escapeHtml(store.nombre)}:</p>
    ${detalleTurno(booking, zona, sena)}
    ${store.direccion ? `<p>Dirección: ${escapeHtml(store.direccion)}</p>` : ''}
    <p>Si no podés asistir, avisanos así otra persona puede usar el horario.</p>
    <a class="btn btn-sec" href="${escapeHtml(enlaceTurno)}">Ver o cancelar mi turno</a>`

  return sendStoreAuthEmail({
    to: booking.cliente_email,
    subject: `Recordatorio: tu turno en ${store.nombre}`,
    html: layout(store.nombre, cuerpo),
    fromName: String(store.nombre || 'Tu tienda').replace(/["<>\r\n]/g, '').slice(0, 80),
  })
}
