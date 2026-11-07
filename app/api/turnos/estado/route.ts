// =============================================================================
// PORTALMAKER — POST /api/turnos/estado (panel de la tienda)
// Cambia el estado de un turno desde la Agenda. Pasa por el servidor (y no por
// un update directo) para disparar los avisos: confirmación al cliente,
// cancelación al cliente y aviso a la lista de espera cuando se libera el lugar.
// =============================================================================

import { NextResponse } from 'next/server'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'
import { getBookingConfig } from '@/lib/booking/setup'
import { getRequestOrigin } from '@/lib/store-metadata'
import { notificarListaEspera } from '@/lib/booking/waitlist'
import { sendBookingConfirmationEmail, sendBookingCancelledByStoreEmail } from '@/lib/booking/emails'
import type { Booking, BookingEstado } from '@/types/database'

// Transiciones permitidas desde la Agenda
const TRANSICIONES: Record<string, BookingEstado[]> = {
  pendiente: ['confirmado', 'cancelado'],
  confirmado: ['completado', 'ausente', 'cancelado'],
  completado: ['ausente'],
  ausente: ['completado'],
}

export async function POST(req: Request) {
  const tenant = await getTenantStore()
  if (!tenant) return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
  const { store, context } = tenant

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const auth = await verifyStoreAccess(user.email, store.id, {
    allowCollaborators: true,
    requiredCollaboratorRoles: ['admin', 'editor', 'colaborador'],
  })
  if (!auth.authorized) return NextResponse.json({ error: 'No tenés permisos sobre esta tienda' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const bookingId = String(body?.bookingId || '')
  const estado = String(body?.estado || '') as BookingEstado

  const supabaseAdmin = createSupabaseAdminClient()
  const { data: actual } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('store_id', store.id)
    .maybeSingle()
  if (!actual) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })

  if (!TRANSICIONES[actual.estado]?.includes(estado)) {
    return NextResponse.json({ error: 'Ese cambio no está permitido para este turno.' }, { status: 400 })
  }

  const ahora = new Date().toISOString()
  const patch: Record<string, unknown> = { estado, updated_at: ahora }
  if (estado === 'cancelado') {
    patch.cancelado_por = 'tienda'
    patch.cancelado_at = ahora
  }

  const { data: actualizado } = await supabaseAdmin
    .from('bookings')
    .update(patch)
    .eq('id', actual.id)
    .eq('estado', actual.estado) // si cambió mientras tanto, no se pisa
    .select('*')
    .maybeSingle()
  if (!actualizado) return NextResponse.json({ error: 'El turno cambió recién. Actualizá la agenda.' }, { status: 409 })

  await supabaseAdmin.from('booking_events').insert({ booking_id: actual.id, store_id: store.id, tipo: estado, actor: 'tienda' })

  const { settings } = await getBookingConfig(store)
  const origin = await getRequestOrigin()
  const tenantQs = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''
  const booking = actualizado as Booking
  let avisadosEspera = 0

  if (estado === 'confirmado' && actual.estado === 'pendiente') {
    await sendBookingConfirmationEmail({
      store,
      booking,
      zona: settings.zona_horaria,
      enlaceTurno: `${origin}/tienda/turno/${booking.public_token}${tenantQs}`,
    }).catch(() => {})
  }

  if (estado === 'cancelado') {
    const [, espera] = await Promise.allSettled([
      sendBookingCancelledByStoreEmail({ store, booking, zona: settings.zona_horaria }),
      notificarListaEspera({ store, booking, zona: settings.zona_horaria, origin, tenantQs }),
    ])
    if (espera.status === 'fulfilled') avisadosEspera = espera.value
  }

  return NextResponse.json({ success: true, booking, avisadosEspera })
}
