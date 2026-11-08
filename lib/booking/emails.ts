// =============================================================================
// PORTALMAKER — Emails de turnos (confirmación al cliente y aviso a la tienda)
// Reusa el envío por Resend de lib/store-auth-email.ts. Todo valor
// interpolado se escapa (los datos vienen del cliente).
// =============================================================================

import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { escapeHtml, sendStoreAuthEmail } from '@/lib/store-auth-email'
import { formatFechaTurno, formatDuracion, googleCalendarUrl, renglonesImporte, formatPesos } from '@/lib/booking/format'
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
export async function sendBookingCancelledByStoreEmail(params: {
  store: Store
  booking: Booking
  zona: string
  /** Motivo escrito por la tienda (opcional). */
  motivo?: string | null
  /** true si el turno todavía no estaba confirmado: se rechazó la solicitud. */
  rechazado?: boolean
}): Promise<void> {
  const { store, booking, zona, motivo, rechazado } = params
  if (!booking.cliente_email) return
  const whatsapp = (store.whatsapp_numero || '').replace(/[^0-9]/g, '')
  const cuerpo = `
    <h1>${rechazado ? 'No pudimos confirmar tu turno' : 'Tu turno fue cancelado'}</h1>
    <p>Hola ${escapeHtml(booking.cliente_nombre)}, ${escapeHtml(store.nombre)} ${rechazado ? 'no pudo confirmar' : 'canceló'} este turno:</p>
    ${detalleTurno(booking, zona)}
    ${motivo ? `<p><strong>Motivo:</strong> ${escapeHtml(motivo)}</p>` : ''}
    <p>Si querés, podés reservar otro horario o escribirle a la tienda.</p>
    ${whatsapp ? `<a class="btn" href="https://wa.me/${whatsapp}">Escribirle por WhatsApp</a>` : ''}`

  await sendStoreAuthEmail({
    to: booking.cliente_email,
    subject: rechazado ? `No pudimos confirmar tu turno en ${store.nombre}` : `Tu turno en ${store.nombre} fue cancelado`,
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

/**
 * Aviso a la dueña: una persona no pudo comprar, reservar o crear su cuenta porque la
 * tienda llegó al tope de clientes de su plan. Es la señal para que mire sus clientes
 * o cambie de plan. Se manda como máximo una vez por día y por tienda, para no inundar
 * la casilla si varias personas lo intentan.
 */
export async function avisarCupoClientesLleno(params: {
  store: Store
  motivo: 'comprar' | 'reservar' | 'cuenta'
  enlacePanel: string
  enlacePlanes: string
}): Promise<void> {
  const { store, motivo } = params
  const permitido = await checkRateLimit({ ip: `cupo-lleno:${store.id}`, maxPerIp: 1, windowMs: 24 * 60 * 60 * 1000 })
  if (!permitido.allowed) return

  const supabaseAdmin = createSupabaseAdminClient()
  const { data } = await supabaseAdmin.from('stores').select('admin_email, email_contacto').eq('id', store.id).maybeSingle()
  const destino = data?.email_contacto?.trim() || data?.admin_email?.trim()
  if (!destino) return

  const quePaso =
    motivo === 'comprar'
      ? 'Alguien quiso comprar en tu tienda'
      : motivo === 'reservar'
        ? 'Alguien quiso reservar un turno en tu tienda'
        : 'Alguien quiso crear una cuenta en tu tienda'

  const cuerpo = `
    <h1>${quePaso} y no pudo</h1>
    <p>Tu tienda llegó al límite de clientes registrados de su plan, así que las personas nuevas no pueden crear su cuenta. Para comprar o reservar hay que estar registrado.</p>
    <p>Podés liberar lugar borrando clientes que ya no uses, o pasar a un plan con más capacidad. Los clientes que ya tienen cuenta pueden seguir comprando y reservando con normalidad.</p>
    <a class="btn" href="${escapeHtml(params.enlacePanel)}">Ver mis clientes</a>
    <a class="btn btn-sec" href="${escapeHtml(params.enlacePlanes)}">Ver planes</a>
    <p style="font-size:12px;color:#94a3b8;margin-top:16px">Te avisamos como máximo una vez por día.</p>`

  await sendStoreAuthEmail({
    to: destino,
    subject: 'Tu tienda llegó al límite de clientes',
    html: layout(store.nombre, cuerpo),
    fromName: 'Portalmaker',
  })
}

function fechaLarga(fecha: string): string {
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(`${fecha}T12:00:00Z`)
  )
}

/** Confirmación al cliente: quedó anotado en la lista de espera. */
export async function sendWaitlistJoinedEmail(params: {
  store: Store
  to: string
  nombre: string
  servicio: string
  fecha: string
  hora?: string | null
}): Promise<void> {
  const { store } = params
  const cuerpo = `
    <h1>Quedaste en la lista de espera</h1>
    <p>Hola ${escapeHtml(params.nombre)}, te anotamos en la lista de espera de ${escapeHtml(store.nombre)}:</p>
    <div class="box">
      <strong>${escapeHtml(params.servicio)}</strong><br/>
      ${escapeHtml(fechaLarga(params.fecha))}${params.hora ? `, buscabas las ${escapeHtml(params.hora)} hs` : ''}
    </div>
    <p>Si se libera un turno ese día, te avisamos por email. Se avisa a todas las personas en espera y el primero que reserva se queda el lugar.</p>`

  await sendStoreAuthEmail({
    to: params.to,
    subject: `Estás en la lista de espera de ${store.nombre}`,
    html: layout(store.nombre, cuerpo),
    fromName: String(store.nombre || 'Tu tienda').replace(/["<>\r\n]/g, '').slice(0, 80),
  })
}

/** Aviso a la tienda: alguien se anotó en la lista de espera. */
export async function notifyStoreWaitlistEmail(params: {
  store: Store
  clienteNombre: string
  clienteTelefono?: string | null
  clienteEmail?: string | null
  servicio: string
  fecha: string
  hora?: string | null
  enlacePanel: string
}): Promise<void> {
  const { store } = params
  const supabaseAdmin = createSupabaseAdminClient()
  const { data } = await supabaseAdmin.from('stores').select('admin_email, email_contacto').eq('id', store.id).maybeSingle()
  const destino = data?.email_contacto?.trim() || data?.admin_email?.trim()
  if (!destino) return

  const cuerpo = `
    <h1>Alguien se anotó en tu lista de espera</h1>
    <div class="box">
      <strong>${escapeHtml(params.servicio)}</strong><br/>
      ${escapeHtml(fechaLarga(params.fecha))}${params.hora ? `, quería las ${escapeHtml(params.hora)} hs` : ''}
    </div>
    <p>Cliente: <strong>${escapeHtml(params.clienteNombre)}</strong>${
      params.clienteTelefono ? `<br/>Teléfono: ${escapeHtml(params.clienteTelefono)}` : ''
    }${params.clienteEmail ? `<br/>Email: ${escapeHtml(params.clienteEmail)}` : ''}</p>
    <p>Si se libera un turno ese día, se le avisa automáticamente por email. También podés escribirle vos desde la Agenda.</p>
    <a class="btn" href="${escapeHtml(params.enlacePanel)}">Ver lista de espera</a>`

  await sendStoreAuthEmail({
    to: destino,
    subject: `Nueva persona en la lista de espera: ${params.servicio}`,
    html: layout(store.nombre, cuerpo),
    fromName: 'Portalmaker',
  })
}

/** Turno reservado por la tienda que espera la seña: el cliente la paga desde el enlace. */
export async function sendSenaPendienteEmail(params: {
  store: Store
  booking: Booking
  zona: string
  enlaceTurno: string
  sena: number
  horas: number
}): Promise<void> {
  const { store, booking, zona } = params
  if (!booking.cliente_email) return
  const cuerpo = `
    <h1>Te reservamos un turno</h1>
    <p>Hola ${escapeHtml(booking.cliente_nombre)}, se liberó un lugar y ${escapeHtml(store.nombre)} te lo reservó:</p>
    ${detalleTurno(booking, zona)}
    <p>Para confirmarlo, pagá la seña de <strong>${escapeHtml(formatPesos(params.sena))}</strong> con Mercado Pago. Tenés ${params.horas} horas: si no la pagás, el horario se libera para otra persona.</p>
    <a class="btn" href="${escapeHtml(params.enlaceTurno)}">Pagar la seña</a>`

  await sendStoreAuthEmail({
    to: booking.cliente_email,
    subject: `Pagá la seña para confirmar tu turno en ${store.nombre}`,
    html: layout(store.nombre, cuerpo),
    fromName: String(store.nombre || 'Tu tienda').replace(/["<>\r\n]/g, '').slice(0, 80),
  })
}
