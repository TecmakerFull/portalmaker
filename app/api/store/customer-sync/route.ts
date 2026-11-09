import { NextResponse } from 'next/server'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { sincronizarClienteTienda } from '@/lib/booking/customers'

// =============================================================================
// PORTALMAKER — Alta del cliente de la tienda a partir de su sesión
//
// Se llama cuando alguien inicia sesión (con contraseña, con el enlace del correo
// o al confirmar su registro) y cuando edita sus datos en "Mi cuenta". Aplica a
// todos los tipos de tienda.
//
// Seguridad: el email sale SIEMPRE de la sesión, nunca del cuerpo del pedido, y la
// tienda sale del dominio (getTenantStore). Nombre y teléfono se acotan en largo.
// =============================================================================

const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

export async function POST(req: Request) {
  const rate = await checkRateLimit({ ip: `customer-sync:${getClientIp(req)}`, maxPerIp: 30, windowMs: 60000 })
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Demasiados intentos. Esperá un momento.' }, { status: 429 })
  }

  const tenant = await getTenantStore()
  if (!tenant) return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
  const { store } = tenant

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const actualizar = body?.actualizar === true
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>

  const nombre =
    clean(body?.nombre, 100) ||
    clean(meta.nombre, 100) ||
    clean(meta.full_name, 100) ||
    clean(meta.name, 100) ||
    null
  // Con `actualizar` el teléfono vacío significa "borrarlo"; sin eso se toma lo que
  // haya en el perfil de la cuenta.
  const telefono = actualizar ? clean(body?.telefono, 30) : clean(body?.telefono, 30) || clean(meta.telefono, 30) || null

  const resultado = await sincronizarClienteTienda({ store, email: user.email, nombre, telefono, actualizar })
  if (!resultado.ok) {
    // No es un error para quien navega: simplemente no queda en la lista. Al querer
    // reservar se le explica (y puede coordinar por WhatsApp).
    return NextResponse.json({ ok: true, registrado: false, code: resultado.code })
  }
  return NextResponse.json({ ok: true, registrado: true, creado: resultado.creado })
}
