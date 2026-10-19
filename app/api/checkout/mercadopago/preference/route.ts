import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

// =============================================================================
// PORTALMAKER — Mercado Pago: Crear Preferencia de Pago Checkout Pro
// Utiliza las credenciales OAuth de la tienda con split de comisiones (marketplace_fee)
// =============================================================================

export async function POST(req: Request) {
  try {
    const { orderId, storeId, returnOrigin } = await req.json()

    if (!orderId || !storeId) {
      return NextResponse.json({ error: 'orderId y storeId son requeridos' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // 1. Obtener la tienda y verificar conexión con Mercado Pago
    const { data: store, error: storeErr } = await supabaseAdmin
      .from('stores')
      .select('id, nombre, slug, mp_connected, mp_access_token, mp_recargo_porcentaje, comision_portalmaker')
      .eq('id', storeId)
      .single()

    if (storeErr || !store || !store.mp_connected || !store.mp_access_token) {
      return NextResponse.json(
        { error: 'La tienda no tiene una cuenta de Mercado Pago vinculada' },
        { status: 400 }
      )
    }

    // 2. Obtener el pedido
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    // 3. Preparar items de la preferencia
    const items = (order.items || []).map((item: any) => ({
      id: item.variant_id || item.product_id || 'item',
      title: item.variante ? `${item.nombre} (${item.variante})` : item.nombre,
      quantity: Number(item.cantidad) || 1,
      unit_price: Number(item.precio_unitario) || 0,
      currency_id: 'ARS',
    }))

    // Si hubo recargo de Mercado Pago, agregar como item descriptivo o sumarlo
    const recargoPct = Number(store.mp_recargo_porcentaje) || 0
    if (recargoPct > 0) {
      const subtotalProductos = items.reduce((acc: number, it: any) => acc + it.quantity * it.unit_price, 0)
      const montoRecargo = Number(((subtotalProductos * recargoPct) / 100).toFixed(2))
      if (montoRecargo > 0) {
        items.push({
          id: 'recargo_mp',
          title: `Recargo por servicio de cobro (${recargoPct}%)`,
          quantity: 1,
          unit_price: montoRecargo,
          currency_id: 'ARS',
        })
      }
    }

    // Si hay costo de envío
    if (Number(order.costo_envio) > 0) {
      items.push({
        id: 'costo_envio',
        title: 'Costo de envío',
        quantity: 1,
        unit_price: Number(order.costo_envio),
        currency_id: 'ARS',
      })
    }

    // 4. Calcular comisión de Portalmaker (marketplace_fee)
    const comisionPortalmakerPct = Number(store.comision_portalmaker) || 0
    let marketplaceFee = 0

    if (comisionPortalmakerPct > 0) {
      const baseCalculo = Number(order.total) || 0
      marketplaceFee = Number(((baseCalculo * comisionPortalmakerPct) / 100).toFixed(2))
    }

    const hostOrigin = returnOrigin || process.env.NEXT_PUBLIC_APP_URL || 'https://www.portalmaker.ar'
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.portalmaker.ar'}/api/webhooks/mercadopago`

    // 5. Crear la preferencia en Mercado Pago con el Access Token de la TIENDA
    const preferencePayload: any = {
      items,
      payer: {
        name: order.nombre_comprador || 'Cliente',
        email: order.email_comprador || 'cliente@portalmaker.ar',
        phone: {
          number: order.telefono_comprador || '',
        },
        address: {
          street_name: order.direccion_entrega || '',
        },
      },
      back_urls: {
        success: `${hostOrigin}/tienda/pedido-confirmado?order_id=${order.id}&status=approved`,
        failure: `${hostOrigin}/tienda/checkout?order_id=${order.id}&status=failure`,
        pending: `${hostOrigin}/tienda/pedido-confirmado?order_id=${order.id}&status=pending`,
      },
      auto_return: 'approved',
      external_reference: order.id,
      notification_url: webhookUrl,
      statement_descriptor: store.nombre.slice(0, 16),
    }

    // Inyectar comisión para la cuenta de Portalmaker si está configurada
    if (marketplaceFee > 0) {
      preferencePayload.marketplace_fee = marketplaceFee
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${store.mp_access_token}`,
      },
      body: JSON.stringify(preferencePayload),
    })

    const mpData = await mpRes.json()

    if (!mpRes.ok || !mpData.id) {
      console.error('Error al generar preferencia en Mercado Pago:', mpData)
      return NextResponse.json(
        { error: mpData.message || 'Error al generar la preferencia de pago en Mercado Pago' },
        { status: 500 }
      )
    }

    // 6. Actualizar la orden con el preference_id y la comisión estimada
    await supabaseAdmin
      .from('orders')
      .update({
        mp_preference_id: mpData.id,
        mp_fee_portalmaker: marketplaceFee,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    return NextResponse.json({
      preferenceId: mpData.id,
      initPoint: mpData.init_point,
      sandboxInitPoint: mpData.sandbox_init_point,
    })
  } catch (err: any) {
    console.error('Excepción al crear preferencia de Mercado Pago:', err)
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 })
  }
}
