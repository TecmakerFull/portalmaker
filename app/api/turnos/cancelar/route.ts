// =============================================================================
// PORTALMAKER — POST /api/turnos/cancelar
// El cliente cancela su turno con el enlace secreto que recibió por email
// (public_token), sin iniciar sesión. Respeta "cancelar hasta X horas antes".
// =============================================================================

import { NextResponse } from 'next/server'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { getBookingConfig } from '@/lib/booking/setup'
import { notifyStoreBookingEmail } from '@/lib/booking/emails'
import { getRequestOrigin } from '@/lib/store-metadata'
import { notificarListaEspera } from '@/lib/booking/waitlist'
import type { Booking } from '@/types/database'

const UUID_REGEX = /^[0-9a-f-]{36}$/i

export async function POST(req: Request) {
  const rate = await checkRateLimit({ ip: `turnos-cancel:${getClientIp(req)}`, maxPerIp: 10, windowMs: 60000 })
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Demasiados intentos. Esperá un momento.' }, { status: 429 })
  }

  const tenant = await getTenantStore()
  if (!tenant) return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
  const { store, context } = tenant

  const body = await req.json().catch(() => ({}))
  const token = String(body?.token || '')
  if (!UUID_REGEX.test(token)) {
    return NextResponse.json({ error: 'Enlace inválido' }, { status: 400 })
  }

  const supabaseAdmin = createSupabaseAdminClient()
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('public_token', token)
    .eq('store_id', store.id)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
  if (!['pendiente', 'confirmado'].includes(booking.estado)) {
    return NextResponse.json({ error: 'Este turno ya no se puede cancelar.' }, { status: 400 })
  }

  const { settings } = await getBookingConfig(store)
  const limite = new Date(booking.starts_at).getTime() - settings.cancelacion_hasta_horas * 3600000
  if (Date.now() > limite) {
    return NextResponse.json(
      {
        error: `Solo se puede cancelar hasta ${settings.cancelacion_hasta_horas} horas antes. Escribile a la tienda por WhatsApp.`,
        code: 'fuera_de_termino',
      },
      { status: 400 }
    )
  }

  // Transición condicional: si otro proceso ya lo cambió, no se pisa.
  const { data: actualizado } = await supabaseAdmin
    .from('bookings')
    .update({ estado: 'cancelado', cancelado_por: 'cliente', cancelado_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', booking.id)
    .in('estado', ['pendiente', 'confirmado'])
    .select('*')
    .maybeSingle()

  if (!actualizado) return NextResponse.json({ error: 'Este turno ya no se puede cancelar.' }, { status: 400 })

  await supabaseAdmin.from('booking_events').insert({
    booking_id: booking.id,
    store_id: store.id,
    tipo: 'cancelado',
    actor: 'cliente',
  })

  const origin = await getRequestOrigin()
  const tenantQs = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''
  // Aviso a la tienda y a la lista de espera de ese día (allSettled: un fallo de
  // email no revierte la cancelación).
  await Promise.allSettled([
    notifyStoreBookingEmail({
      store,
      booking: actualizado as Booking,
      zona: settings.zona_horaria,
      tipo: 'cancelado',
      enlacePanel: `${origin}/tienda/admin/agenda${tenantQs}`,
    }),
    notificarListaEspera({ store, booking: actualizado as Booking, zona: settings.zona_horaria, origin, tenantQs }),
  ])

  return NextResponse.json({ success: true })
}
