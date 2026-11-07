// =============================================================================
// PORTALMAKER — POST /api/turnos/espera
// El cliente se anota para que le avisen si se libera un turno de un servicio
// en un día que está lleno. Requiere cuenta en la tienda (mismo criterio y
// mismo límite de clientes que reservar).
// =============================================================================

import { NextResponse } from 'next/server'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { getBookingConfig } from '@/lib/booking/setup'
import { registrarClienteTurnos } from '@/lib/booking/customers'
import { fechaLocal, sumarDias } from '@/lib/booking/availability'

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/
const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

export async function POST(req: Request) {
  const rate = await checkRateLimit({ ip: `turnos-espera:${getClientIp(req)}`, maxPerIp: 10, windowMs: 60000 })
  if (!rate.allowed) return NextResponse.json({ error: 'Demasiados intentos. Esperá un momento.' }, { status: 429 })

  const tenant = await getTenantStore()
  if (!tenant) return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
  const { store } = tenant
  if ((store.tipo_negocio ?? 'productos') === 'productos') {
    return NextResponse.json({ error: 'Esta tienda no ofrece turnos' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Iniciá sesión para anotarte.', code: 'login_requerido' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const serviceId = clean(body?.serviceId, 40)
  const fecha = clean(body?.fecha, 10)
  const email = user.email.trim().toLowerCase()
  const nombre = clean(body?.nombre, 100) || clean(user.user_metadata?.full_name, 100) || email.split('@')[0]
  const telefono = clean(body?.telefono, 30) || null

  if (!FECHA_REGEX.test(fecha)) return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })

  const { settings } = await getBookingConfig(store)
  const hoy = fechaLocal(new Date(), settings.zona_horaria)
  if (fecha < hoy || fecha > sumarDias(hoy, settings.anticipacion_max_dias)) {
    return NextResponse.json({ error: 'Esa fecha no está disponible para reservar.' }, { status: 400 })
  }

  const supabaseAdmin = createSupabaseAdminClient()
  const { data: service } = await supabaseAdmin
    .from('services')
    .select('id, visible')
    .eq('id', serviceId)
    .eq('store_id', store.id)
    .maybeSingle()
  if (!service?.visible) return NextResponse.json({ error: 'El servicio ya no está disponible.' }, { status: 404 })

  const registro = await registrarClienteTurnos({ store, email, nombre, telefono })
  if (!registro.ok) return NextResponse.json({ error: registro.error, code: registro.code }, { status: 403 })

  const { error } = await supabaseAdmin.from('booking_waitlist').insert({
    store_id: store.id,
    service_id: service.id,
    fecha,
    cliente_user_id: user.id,
    cliente_nombre: nombre,
    cliente_email: email,
    cliente_telefono: telefono,
  })

  // 23505: ya estaba anotado para ese servicio y día (índice único parcial).
  if (error && error.code !== '23505') {
    return NextResponse.json({ error: 'No pudimos anotarte. Probá de nuevo.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, yaAnotado: error?.code === '23505' })
}
