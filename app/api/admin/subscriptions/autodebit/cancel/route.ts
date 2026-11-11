import { NextResponse } from 'next/server'
import { verifySuperadmin } from '@/lib/store-auth'
import { cancelMandate } from '@/lib/subscriptions/autodebit'

// =============================================================================
// PORTALMAKER — POST /api/admin/subscriptions/autodebit/cancel
// El superadmin cancela el débito automático de cualquier tienda (cambio de plan,
// baja del cliente, error de cobro). No depende del flag: siempre se puede cancelar.
// =============================================================================

export async function POST(req: Request) {
  try {
    const auth = await verifySuperadmin()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'No autorizado' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const storeId = typeof body?.storeId === 'string' ? body.storeId : ''
    if (!storeId) return NextResponse.json({ error: 'storeId es obligatorio.' }, { status: 400 })

    const { cancelled } = await cancelMandate(storeId)
    return NextResponse.json({ cancelled })
  } catch (err: any) {
    console.error('admin/autodebit/cancel: error', err?.message)
    return NextResponse.json({ error: 'No se pudo cancelar el débito automático.' }, { status: 500 })
  }
}
