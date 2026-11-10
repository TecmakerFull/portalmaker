import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { cancelMandate, isAutodebitEnabled } from '@/lib/subscriptions/autodebit'

// =============================================================================
// PORTALMAKER — POST /api/subscriptions/autodebit/cancel
// El dueño cancela el débito automático: vuelve al pago manual y conserva el
// período ya pagado.
// =============================================================================

export async function POST(req: Request) {
  try {
    if (!isAutodebitEnabled()) {
      return NextResponse.json({ error: 'El débito automático no está disponible todavía.' }, { status: 404 })
    }
    const ip = getClientIp(req)
    const rate = await checkRateLimit({ ip: `autodebit-cancel:${ip}`, maxPerIp: 10, windowMs: 10 * 60 * 1000 })
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Esperá unos minutos.' }, { status: 429 })
    }

    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

    const body = await req.json().catch(() => null)
    const storeId = typeof body?.storeId === 'string' ? body.storeId : ''
    if (!storeId) return NextResponse.json({ error: 'storeId es obligatorio.' }, { status: 400 })

    const access = await verifyStoreAccess(user.email, storeId, { allowCollaborators: false })
    if (!access.authorized) {
      return NextResponse.json({ error: 'No tenés permisos sobre esta tienda.' }, { status: 403 })
    }

    const { cancelled } = await cancelMandate(storeId)
    return NextResponse.json({ cancelled })
  } catch (err: any) {
    console.error('autodebit/cancel: error', err?.message)
    return NextResponse.json({ error: 'No pudimos cancelar el débito automático. Intentá de nuevo.' }, { status: 500 })
  }
}
