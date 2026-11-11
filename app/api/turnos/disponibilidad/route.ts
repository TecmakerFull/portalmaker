// =============================================================================
// PORTALMAKER — GET /api/turnos/disponibilidad
// Horarios libres de un servicio para los próximos días.
// Público (lo usa la página de reserva), con rate limit por IP.
//   ?service_id=uuid&desde=YYYY-MM-DD&dias=14
// =============================================================================

import { NextResponse } from 'next/server'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { getHorariosDisponibles } from '@/lib/booking/server'

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/
const UUID_REGEX = /^[0-9a-f-]{36}$/i

export async function GET(req: Request) {
  const rate = await checkRateLimit({ ip: `turnos-disp:${getClientIp(req)}`, maxPerIp: 60, windowMs: 60000 })
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Demasiadas consultas. Esperá un momento.' }, { status: 429 })
  }

  const tenant = await getTenantStore()
  if (!tenant) return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
  const { store } = tenant

  if ((store.tipo_negocio ?? 'productos') === 'productos') {
    return NextResponse.json({ error: 'Esta tienda no ofrece turnos' }, { status: 400 })
  }
  // Tienda pausada: no se abren nuevas reservas ni listas de espera.
  if (store.suscripcion_activa === false) {
    return NextResponse.json({ error: 'La tienda se encuentra temporalmente inactiva' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const serviceId = searchParams.get('service_id') || ''
  const desde = searchParams.get('desde') || ''
  const dias = Number(searchParams.get('dias') || 14)

  if (!UUID_REGEX.test(serviceId) || !FECHA_REGEX.test(desde) || !Number.isFinite(dias)) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  const supabaseAdmin = createSupabaseAdminClient()
  const { data: service } = await supabaseAdmin
    .from('services')
    .select('id, duracion_minutos, buffer_despues_minutos, visible')
    .eq('id', serviceId)
    .eq('store_id', store.id)
    .maybeSingle()

  if (!service || !service.visible) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 404 })
  }

  const resultado = await getHorariosDisponibles({ store, service, desde, dias })
  return NextResponse.json(resultado, { headers: { 'Cache-Control': 'no-store' } })
}
