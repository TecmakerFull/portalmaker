import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { createMandate, isAutodebitEnabled } from '@/lib/subscriptions/autodebit'
import { getPlatformMpToken } from '@/lib/subscriptions/server'

// =============================================================================
// PORTALMAKER — POST /api/subscriptions/autodebit/enable
// El dueño activa el débito automático de su plan. El monto y el plan salen de la
// tienda en el servidor; del cliente solo se acepta el storeId.
// =============================================================================

export async function POST(req: Request) {
  try {
    if (!isAutodebitEnabled()) {
      return NextResponse.json({ error: 'El débito automático no está disponible todavía.' }, { status: 404 })
    }
    const ip = getClientIp(req)
    const rate = await checkRateLimit({ ip: `autodebit:${ip}`, maxPerIp: 10, windowMs: 10 * 60 * 1000 })
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
    const returnOrigin = typeof body?.returnOrigin === 'string' ? body.returnOrigin : null
    if (!storeId) return NextResponse.json({ error: 'storeId es obligatorio.' }, { status: 400 })

    const access = await verifyStoreAccess(user.email, storeId, { allowCollaborators: false })
    if (!access.authorized || !access.store) {
      return NextResponse.json({ error: 'No tenés permisos sobre esta tienda.' }, { status: 403 })
    }
    if (access.store.plan === 'bonificado' || access.store.estado_pago === 'bonificado') {
      return NextResponse.json({ error: 'Tu cuenta está bonificada: no tiene cobros.' }, { status: 400 })
    }
    if (!getPlatformMpToken()) {
      return NextResponse.json({ error: 'El cobro online no está disponible en este momento.' }, { status: 503 })
    }

    const { initPoint } = await createMandate({ store: access.store, returnOrigin })
    return NextResponse.json({ initPoint })
  } catch (err: any) {
    console.error('autodebit/enable: error', err?.message)
    const msg = String(err?.message ?? '')
    if (msg.startsWith('ALREADY_ACTIVE')) return NextResponse.json({ error: 'El débito automático ya está activo.' }, { status: 409 })
    if (msg.startsWith('PLAN_NOT_BILLABLE')) return NextResponse.json({ error: 'Tu plan actual no tiene cobro mensual.' }, { status: 400 })
    return NextResponse.json({ error: 'No pudimos activar el débito automático. Intentá de nuevo.' }, { status: 500 })
  }
}
