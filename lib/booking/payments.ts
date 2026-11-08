// =============================================================================
// PORTALMAKER — Seña de turnos: confirmación al acreditarse el pago (servidor)
//
// Lo llama lib/mp-payments.ts cuando Mercado Pago aprueba un pago por primera
// vez. Si la orden es la seña de un turno:
//   - confirma el turno (aunque la retención haya vencido, si el horario sigue libre),
//   - manda los emails de confirmación al cliente y de aviso a la tienda,
//   - si el horario ya lo tomó otra persona, avisa a la tienda para que
//     coordine con el cliente o le devuelva la seña desde Mercado Pago.
// Devuelve true si la orden era de un turno (para saltear la lógica de envíos).
// =============================================================================

import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getBookingConfig } from '@/lib/booking/setup'
import { getStorePublicOrigin } from '@/lib/booking/links'
import { sendBookingConfirmationEmail, notifyStoreBookingEmail } from '@/lib/booking/emails'
import type { Booking, Store } from '@/types/database'

export async function confirmarTurnoPorPago(orderId: string, store: Store): Promise<boolean> {
  const supabaseAdmin = createSupabaseAdminClient()
  const { data: turno } = await supabaseAdmin.from('bookings').select('*').eq('order_id', orderId).maybeSingle()
  if (!turno) return false

  const { settings } = await getBookingConfig(store)
  const origin = getStorePublicOrigin(store)
  const enlaceTurno = `${origin}/tienda/turno/${turno.public_token}`
  const enlacePanel = `${origin}/tienda/admin/agenda`

  if (!['pendiente', 'expirado'].includes(turno.estado)) return true // ya procesado
  // Con aprobación manual, un turno ya pagado queda "pendiente" sin vencimiento hasta que
  // la tienda lo apruebe: si el aviso de pago llega de nuevo, no se repite nada.
  if (settings.requiere_aprobacion && turno.estado === 'pendiente' && !turno.pendiente_expira_at) return true

  const { data: confirmado, error } = await supabaseAdmin
    .from('bookings')
    // Si la tienda aprueba cada turno a mano, la seña no lo confirma: queda pendiente (ya
    // pagado, sin vencimiento) esperando la aprobación. Si no, se confirma al acreditarse.
    .update({ estado: settings.requiere_aprobacion ? 'pendiente' : 'confirmado', pendiente_expira_at: null, updated_at: new Date().toISOString() })
    .eq('id', turno.id)
    .in('estado', ['pendiente', 'expirado'])
    .select('*')
    .maybeSingle()

  if (error?.code === '23P01') {
    // Pagó tarde y otra persona tomó el horario: no se puede confirmar.
    await supabaseAdmin
      .from('orders')
      .update({ observaciones_admin: `Seña acreditada pero el horario del turno ${turno.id} ya estaba ocupado. Coordinar otro horario o devolver la seña desde Mercado Pago.` })
      .eq('id', orderId)
    await supabaseAdmin.from('booking_events').insert({
      booking_id: turno.id,
      store_id: store.id,
      tipo: 'pago_sin_lugar',
      detalle: 'La seña se acreditó después de que el horario fue tomado por otra reserva.',
      actor: 'sistema',
    })
    await notifyStoreBookingEmail({
      store,
      booking: turno as Booking,
      zona: settings.zona_horaria,
      tipo: 'pago_sin_lugar',
      enlacePanel,
    }).catch(() => {})
    return true
  }

  if (!confirmado) return true

  await supabaseAdmin.from('booking_events').insert({
    booking_id: turno.id,
    store_id: store.id,
    tipo: settings.requiere_aprobacion ? 'sena_acreditada' : 'confirmado',
    detalle: settings.requiere_aprobacion ? 'Seña acreditada en Mercado Pago; falta la aprobación de la tienda' : 'Seña acreditada en Mercado Pago',
    actor: 'sistema',
  })

  await Promise.allSettled([
    sendBookingConfirmationEmail({ store, booking: confirmado as Booking, zona: settings.zona_horaria, enlaceTurno }),
    notifyStoreBookingEmail({ store, booking: confirmado as Booking, zona: settings.zona_horaria, tipo: 'nuevo', enlacePanel }),
  ])
  return true
}
