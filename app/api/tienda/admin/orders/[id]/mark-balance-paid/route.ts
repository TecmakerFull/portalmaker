import { NextResponse } from 'next/server'
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const adminClient = createSupabaseAdminClient()
    const { data: order, error: orderErr } = await adminClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    const authCheck = await verifyStoreAccess(user.email, order.store_id)
    if (!authCheck.authorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    await adminClient
      .from('orders')
      .update({
        balance_paid: true,
        balance_pending: 0.00,
        estado_pago: 'aprobado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    await adminClient.from('order_events').insert([
      {
        order_id: order.id,
        store_id: order.store_id,
        tipo: 'estado_pago',
        de: order.estado_pago,
        a: 'aprobado',
        actor: 'dueño_manual',
      },
    ])

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error al marcar saldo como cobrado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

