import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { canChooseTargetPlan } from '@/lib/subscriptions/billing'
import { createManualInvoice, getPlatformMpToken } from '@/lib/subscriptions/server'

// =============================================================================
// PORTALMAKER — POST /api/subscriptions/create-preference
// El dueño genera el link de pago (Checkout Pro) de su plan: renovación o upgrade.
// El monto y el plan se resuelven en el servidor; del cliente solo se acepta el
// plan objetivo, que se valida contra una lista cerrada.
// =============================================================================

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const rate = await checkRateLimit({ ip: `sub-pref:${ip}`, maxPerIp: 20, windowMs: 10 * 60 * 1000 })
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Esperá unos minutos.' }, { status: 429 })
    }

    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }

    let body: any = null
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
    }
    const storeId = typeof body?.storeId === 'string' ? body.storeId : ''
    const targetPlan = typeof body?.targetPlan === 'string' ? body.targetPlan : ''
    const returnOrigin = typeof body?.returnOrigin === 'string' ? body.returnOrigin : null
    if (!storeId) {
      return NextResponse.json({ error: 'storeId es obligatorio.' }, { status: 400 })
    }

    // Solo dueño o superadmin: editores y colaboradores no pagan ni cambian de plan.
    const access = await verifyStoreAccess(user.email, storeId, { allowCollaborators: false })
    if (!access.authorized || !access.store) {
      return NextResponse.json({ error: 'No tenés permisos sobre esta tienda.' }, { status: 403 })
    }
    const store = access.store

    if (store.plan === 'bonificado' || store.estado_pago === 'bonificado') {
      return NextResponse.json({ error: 'Tu cuenta está bonificada: no tiene cobros.' }, { status: 400 })
    }
    if (!canChooseTargetPlan(store.plan ?? null, targetPlan)) {
      return NextResponse.json({ error: 'El plan elegido no está disponible para tu tienda.' }, { status: 400 })
    }
    if (!getPlatformMpToken()) {
      console.error('create-preference: MP_PLATFORM_ACCESS_TOKEN no configurado.')
      return NextResponse.json({ error: 'El cobro online no está disponible en este momento.' }, { status: 503 })
    }

    const { initPoint, invoice } = await createManualInvoice({ store, targetPlan, returnOrigin })
    return NextResponse.json({ initPoint, invoiceId: invoice.id, amount: invoice.amount })
  } catch (err: any) {
    console.error('create-preference: error', err?.message)
    return NextResponse.json({ error: 'No pudimos generar el link de pago. Intentá de nuevo.' }, { status: 500 })
  }
}
