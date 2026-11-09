// =============================================================================
// PORTALMAKER — Panel: Agenda de turnos
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ensureBookingSetup } from '@/lib/booking/setup'
import AgendaManager from './agenda-manager'
import type { Booking, BookingWaitlist, Service } from '@/types/database'
import { fechaLocal } from '@/lib/booking/availability'

// Turnos desde hace 7 días hasta 60 días adelante. Fuera del componente porque
// depende de la hora actual (la página se renderiza en cada request).
function ventanaAgenda(zona: string) {
  const ahora = Date.now()
  return {
    desde: new Date(ahora - 7 * 24 * 3600000).toISOString(),
    hasta: new Date(ahora + 60 * 24 * 3600000).toISOString(),
    hoy: fechaLocal(new Date(ahora), zona),
  }
}

export default async function AdminAgendaPage() {
  const tenant = await getTenantStore()
  if (!tenant) notFound()

  const { store, context } = tenant
  // Revalidación: ensureBookingSetup usa service_role y la página corre en paralelo al layout.
  if (!(await isStoreAdmin(store))) notFound()

  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''
  const { settings } = await ensureBookingSetup(store)

  const supabase = await createSupabaseServerClient()
  const { desde, hasta, hoy } = ventanaAgenda(settings.zona_horaria)
  const [{ data: turnos }, { data: services }, { data: espera }] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, order:orders(id, estado_pago, is_deposit, deposit_amount, balance_pending, balance_paid, total)')
      .eq('store_id', store.id)
      .gte('starts_at', desde)
      .lte('starts_at', hasta)
      .order('starts_at', { ascending: true }),
    supabase.from('services').select('*').eq('store_id', store.id).order('orden'),
    // Lista de espera activa desde hoy en adelante
    supabase
      .from('booking_waitlist')
      .select('*')
      .eq('store_id', store.id)
      .gte('fecha', hoy)
      .in('estado', ['esperando', 'avisado'])
      .order('fecha', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  return (
    <div className="w-full space-y-6">
      <AgendaManager
        store={store}
        zona={settings.zona_horaria}
        initialTurnos={(turnos as Booking[]) ?? []}
        services={(services as Service[]) ?? []}
        initialEspera={(espera as BookingWaitlist[]) ?? []}
        tenantQuery={tenantQuery}
        puedeCobrarSena={Boolean(store.mp_connected) && settings.sena_modo !== 'ninguna'}
      />
    </div>
  )
}
