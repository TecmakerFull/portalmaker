// =============================================================================
// PORTALMAKER — POST /api/turnos
// Crea un turno. Dos modos:
//   - Cliente (web): requiere sesión en la tienda y respeta el límite de
//     clientes del plan (decisión de negocio: para reservar hay que ser usuario).
//   - Carga manual (panel): requiere permisos sobre la tienda; los datos del
//     cliente se escriben a mano (turnos pedidos por teléfono o WhatsApp).
// Toda la validación de horario ocurre en el servidor (lib/booking/server.ts).
// =============================================================================

import { NextResponse } from 'next/server'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { verifyStoreAccess } from '@/lib/store-auth'
import { registrarClienteTurnos } from '@/lib/booking/customers'
import { getRequestOrigin } from '@/lib/store-metadata'
import { crearTurno, BookingError } from '@/lib/booking/server'
import { SENA_MINUTOS_ASIGNADO } from '@/lib/booking/sena'
import { getBookingConfig } from '@/lib/booking/setup'
import { sendBookingConfirmationEmail, notifyStoreBookingEmail, sendSenaPendienteEmail } from '@/lib/booking/emails'
import { whatsappReservaUrl } from '@/lib/booking/format'
import { fechaLocal } from '@/lib/booking/availability'

const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

export async function POST(req: Request) {
  const rate = await checkRateLimit({ ip: `turnos-alta:${getClientIp(req)}`, maxPerIp: 10, windowMs: 60000 })
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Demasiados intentos. Esperá un momento.' }, { status: 429 })
  }

  const tenant = await getTenantStore()
  if (!tenant) return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
  const { store, context } = tenant

  if ((store.tipo_negocio ?? 'productos') === 'productos') {
    return NextResponse.json({ error: 'Esta tienda no ofrece turnos' }, { status: 400 })
  }
  if (store.suscripcion_activa === false) {
    return NextResponse.json({ error: 'La tienda se encuentra temporalmente inactiva' }, { status: 403 })
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Iniciá sesión para reservar tu turno.', code: 'login_requerido' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const manual = body?.manual === true
  const serviceId = clean(body?.serviceId, 40)
  const inicio = clean(body?.inicio, 40)
  const notas = clean(body?.notas, 500) || null

  let cliente: { userId: string | null; nombre: string; email: string | null; telefono: string | null }
  // Entrada de la lista de espera a la que la tienda le está asignando este turno
  let asignadoDeEspera: string | null = null

  if (manual) {
    const auth = await verifyStoreAccess(user.email, store.id, {
      allowCollaborators: true,
      requiredCollaboratorRoles: ['admin', 'editor', 'colaborador'],
    })
    if (!auth.authorized) {
      return NextResponse.json({ error: 'No tenés permisos sobre esta tienda' }, { status: 403 })
    }
    cliente = {
      userId: null,
      nombre: clean(body?.clienteNombre, 100),
      email: clean(body?.clienteEmail, 150).toLowerCase() || null,
      telefono: clean(body?.clienteTelefono, 30) || null,
    }

    // Turno asignado a alguien de la lista de espera: se vincula a su cuenta (así lo ve en
    // "Mis turnos") y el aviso de confirmación le llega por email. La entrada se valida
    // contra esta tienda: nunca se confía en el id que mande el navegador.
    const waitlistId = clean(body?.waitlistId, 40)
    if (/^[0-9a-f-]{36}$/i.test(waitlistId)) {
      const { data: entrada } = await createSupabaseAdminClient()
        .from('booking_waitlist')
        .select('cliente_user_id, cliente_email, cliente_telefono')
        .eq('id', waitlistId)
        .eq('store_id', store.id)
        .in('estado', ['esperando', 'avisado'])
        .maybeSingle()
      if (entrada) {
        cliente.userId = entrada.cliente_user_id
        cliente.email = cliente.email || entrada.cliente_email
        cliente.telefono = cliente.telefono || entrada.cliente_telefono
        asignadoDeEspera = waitlistId
      }
    }
  } else {
    const email = user.email.trim().toLowerCase()
    cliente = {
      userId: user.id,
      nombre: clean(body?.nombre, 100) || clean(user.user_metadata?.full_name, 100) || email.split('@')[0],
      email,
      telefono: clean(body?.telefono, 30) || null,
    }

    // Límite de clientes registrados según el plan (solo cuenta clientes nuevos).
    const registro = await registrarClienteTurnos({ store, email, nombre: cliente.nombre, telefono: cliente.telefono })
    if (!registro.ok) {
      return NextResponse.json({ error: registro.error, code: registro.code }, { status: 403 })
    }
  }

  if (!serviceId || !inicio || !cliente.nombre) {
    return NextResponse.json({ error: 'Faltan datos para reservar el turno.' }, { status: 400 })
  }

  try {
    const { booking, sena, order } = await crearTurno({
      store,
      serviceId,
      inicioIso: inicio,
      staffId: clean(body?.staffId, 40) || null,
      cliente,
      notas,
      origen: manual ? 'manual' : 'web',
      // Turno asignado desde la lista de espera: puede pedir seña, con más plazo para pagarla
      cobrarSena: Boolean(asignadoDeEspera) && body?.cobrarSena === true,
      retencionMinutos: asignadoDeEspera ? SENA_MINUTOS_ASIGNADO : undefined,
      pagoModalidad: body?.pagoModalidad === 'total' ? 'total' : 'sena',
    })

    const { settings } = await getBookingConfig(store)

    if (asignadoDeEspera) {
      await createSupabaseAdminClient()
        .from('booking_waitlist')
        .update({ estado: 'resuelto', updated_at: new Date().toISOString() })
        .eq('id', asignadoDeEspera)
        .eq('store_id', store.id)
    }

    // Si estaba en lista de espera para ese servicio y ese día, ya consiguió turno.
    if (cliente.userId && booking.service_id) {
      await createSupabaseAdminClient()
        .from('booking_waitlist')
        .update({ estado: 'resuelto', updated_at: new Date().toISOString() })
        .eq('store_id', store.id)
        .eq('service_id', booking.service_id)
        .eq('fecha', fechaLocal(new Date(booking.starts_at), settings.zona_horaria))
        .eq('cliente_user_id', cliente.userId)
        .in('estado', ['esperando', 'avisado'])
    }

    const origin = await getRequestOrigin()
    const tenantQs = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''
    const enlaceTurno = `${origin}/tienda/turno/${booking.public_token}${tenantQs}`

    // Con seña, los emails salen cuando Mercado Pago acredita el pago
    // (lib/mp-payments.ts); antes de eso el turno es solo una retención.
    // Se esperan antes de responder (en Vercel una promesa suelta puede cortarse),
    // pero con allSettled: un fallo de Resend no anula el turno.
    if (order && manual) {
      // Seña pedida por la tienda: el cliente recibe el enlace para pagarla
      await Promise.allSettled([
        sendSenaPendienteEmail({ store, booking, zona: settings.zona_horaria, enlaceTurno, sena, horas: SENA_MINUTOS_ASIGNADO / 60 }),
      ])
    }
    if (!order) {
      await Promise.allSettled([
        sendBookingConfirmationEmail({ store, booking, zona: settings.zona_horaria, enlaceTurno }),
        manual
          ? Promise.resolve()
          : notifyStoreBookingEmail({ store, booking, zona: settings.zona_horaria, tipo: 'nuevo', enlacePanel: `${origin}/tienda/admin/agenda${tenantQs}` }),
      ])
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        estado: booking.estado,
        starts_at: booking.starts_at,
        public_token: booking.public_token,
      },
      // Seña: el navegador crea la preferencia de Mercado Pago con estos datos
      // (mismo endpoint que el checkout) y redirige a pagar.
      pago: order ? { orderId: order.id, publicToken: order.public_token, monto: sena } : null,
      // Las reservas le llegan al dueño por WhatsApp, igual que las ventas.
      whatsappUrl: manual
        ? null
        : whatsappReservaUrl({
            numeroTienda: store.whatsapp_numero || '',
            servicio: booking.servicio_nombre,
            inicio: booking.starts_at,
            zona: settings.zona_horaria,
            cliente: booking.cliente_nombre,
            telefono: booking.cliente_telefono,
            pendiente: booking.estado === 'pendiente',
            enlaceTurno,
          }),
      enlaceTurno,
    })
  } catch (err) {
    if (err instanceof BookingError) {
      const status = err.code === 'horario_ocupado' ? 409 : 400
      return NextResponse.json({ error: err.message, code: err.code }, { status })
    }
    console.error('Error creando turno:', err)
    return NextResponse.json({ error: 'No se pudo reservar el turno. Probá de nuevo.' }, { status: 500 })
  }
}
