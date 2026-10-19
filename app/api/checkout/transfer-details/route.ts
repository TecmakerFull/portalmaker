import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================================
// PORTALMAKER — Endpoint Seguro para Datos Bancarios en Checkout (P3, Q)
// Retorna información de transferencia bancaria ÚNICAMENTE para pedidos existentes
// con método 'transferencia' y validando su public_token de comprador en el servidor.
// =============================================================================

export async function GET(req: Request) {
  try {
    const clientIp = getClientIp(req)
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('order_id') || searchParams.get('orderId')
    const token = searchParams.get('token')

    if (!orderId || !token) {
      return NextResponse.json(
        { error: 'order_id y token de verificación son obligatorios' },
        { status: 400 }
      )
    }

    // Rate limiting distribuido por IP (Q, X)
    const ipCheck = await checkRateLimit({
      ip: clientIp,
      maxPerIp: 20,
      windowMs: 60000,
    })

    if (!ipCheck.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor aguarda un momento.' },
        { status: 429, headers: { 'Retry-After': String(ipCheck.retryAfter || 30) } }
      )
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // 1. Validar que el pedido exista, corresponda a transferencia y el token coincida (P3)
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, store_id, metodo_pago, public_token')
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    if (!order.public_token || order.public_token !== token) {
      return NextResponse.json({ error: 'Token de acceso al pedido inválido' }, { status: 403 })
    }

    if (order.metodo_pago !== 'transferencia') {
      return NextResponse.json(
        { error: 'Este pedido no fue registrado con la modalidad de transferencia bancaria' },
        { status: 400 }
      )
    }

    // Alerta de volumen por tienda sin bloqueo duro (X: previene denegación de servicio)
    const storeCheck = await checkRateLimit({
      ip: clientIp,
      storeId: order.store_id,
      alertPerStore: 40,
      windowMs: 60000,
    })

    if (storeCheck.storeAlert) {
      console.warn(`Alerta de volumen en transfer-details para tienda ${order.store_id}`)
    }

    // 2. Obtener datos de transferencia de la tienda
    const { data: store, error: storeErr } = await supabaseAdmin
      .from('stores')
      .select('id, transferencia_activa, transferencia_alias, transferencia_cbu_cvu, transferencia_banco, transferencia_titular, transferencia_cuit, transferencia_instrucciones')
      .eq('id', order.store_id)
      .maybeSingle()

    if (storeErr || !store || !store.transferencia_activa) {
      return NextResponse.json({ transferencia_activa: false }, { status: 200 })
    }

    return NextResponse.json({
      transferencia_activa: true,
      alias: store.transferencia_alias,
      cbuCvu: store.transferencia_cbu_cvu,
      banco: store.transferencia_banco,
      titular: store.transferencia_titular,
      cuit: store.transferencia_cuit,
      instrucciones: store.transferencia_instrucciones,
    })
  } catch (err: any) {
    console.error('Error en /api/checkout/transfer-details:', err)
    return NextResponse.json({ error: 'Error interno al consultar datos de cobro' }, { status: 500 })
  }
}
