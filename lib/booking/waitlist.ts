// =============================================================================
// PORTALMAKER — Lista de espera: aviso cuando se libera un turno (servidor)
//
// Al cancelarse un turno (por el cliente o por la tienda) se avisa por email a
// quienes esperaban ese servicio ese día. Se avisa a todos a la vez: el primero
// que reserva se queda el lugar (más simple y justo que reservar en nombre de
// alguien que quizás ya no puede). El dueño ve la lista en la Agenda y puede
// avisar además por WhatsApp.
// =============================================================================

import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { fechaLocal } from '@/lib/booking/availability'
import { sendWaitlistAvailableEmail } from '@/lib/booking/emails'
import type { Booking, BookingWaitlist, Store } from '@/types/database'

function fechaTexto(fecha: string): string {
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(`${fecha}T12:00:00Z`)
  )
}

export async function notificarListaEspera(params: {
  store: Store
  booking: Booking
  zona: string
  origin: string
  tenantQs: string
}): Promise<number> {
  const { store, booking, zona } = params
  if (!booking.service_id) return 0
  // Un turno que ya pasó no libera nada aprovechable.
  if (new Date(booking.starts_at).getTime() < Date.now()) return 0

  const supabaseAdmin = createSupabaseAdminClient()
  const fecha = fechaLocal(new Date(booking.starts_at), zona)

  const [{ data: espera }, { data: service }] = await Promise.all([
    supabaseAdmin
      .from('booking_waitlist')
      .select('*')
      .eq('store_id', store.id)
      .eq('service_id', booking.service_id)
      .eq('fecha', fecha)
      .eq('estado', 'esperando'),
    supabaseAdmin.from('services').select('slug, nombre, visible').eq('id', booking.service_id).maybeSingle(),
  ])

  if (!espera?.length || !service?.visible) return 0

  const enlaceReserva = `${params.origin}/tienda/servicios/${service.slug}${params.tenantQs}`
  let avisados = 0

  for (const entrada of espera as BookingWaitlist[]) {
    // Sin email (o si el envío falla) queda "esperando" para que la tienda avise por WhatsApp.
    if (!entrada.cliente_email) continue
    const enviado = await sendWaitlistAvailableEmail({
      store,
      to: entrada.cliente_email,
      nombre: entrada.cliente_nombre,
      servicio: service.nombre,
      fechaTexto: fechaTexto(fecha),
      enlaceReserva,
    }).catch(() => false)
    if (!enviado) continue
    await supabaseAdmin
      .from('booking_waitlist')
      .update({ estado: 'avisado', avisado_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', entrada.id)
    avisados++
  }

  return avisados
}
