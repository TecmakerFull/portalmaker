import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getValidMpAccessToken, getSafeReturnOrigin } from '@/lib/mercadopago'

// =============================================================================
// PORTALMAKER — Mercado Pago: Crear Preferencia de Pago Checkout Pro
// Utiliza las credenciales OAuth de la tienda con split de comisiones (marketplace_fee).
// =============================================================================

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId, storeId: candidateStoreId, returnOrigin } = body

    if (!orderId) {
      return NextResponse.json({ error: 'orderId es requerido' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // 1. SEGURIDAD: Obtener primero el pedido para determinar la tienda real
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    // Validar estado del pedido
    if (order.estado_pago === 'aprobado') {
      return NextResponse.json({ error: 'El pedido ya fue pagado' }, { status: 400 })
    }

    if (order.estado_pedido === 'cancelado') {
      return NextResponse.json({ error: 'El pedido se encuentra cancelado' }, { status: 400 })
    }

    // Validar que el storeId enviado coincida estrictamente con el dueño del pedido
    if (candidateStoreId && candidateStoreId !== order.store_id) {
      console.warn(`Intento de mismatch de storeId: enviado ${candidateStoreId}, pedido es de ${order.store_id}`)
      return NextResponse.json({ error: 'Identificador de tienda no válido para este pedido' }, { status: 403 })
    }

    // 2. Obtener la tienda real desde el pedido
    const { data: store, error: storeErr } = await supabaseAdmin
      .from('stores')
      .select('*')
      .eq('id', order.store_id)
      .single()

    if (storeErr || !store || !store.mp_connected) {
      return NextResponse.json(
        { error: 'La tienda no tiene una cuenta de Mercado Pago vinculada' },
        { status: 400 }
      )
    }

    // 3. SEGURIDAD: Obtener y validar el access token de la tienda (renueva automáticamente si expiró)
    const storeAccessToken = await getValidMpAccessToken(store)
    if (!storeAccessToken) {
      return NextResponse.json(
        { error: 'La conexión de Mercado Pago de la tienda no está activa. Requiere revinculación.' },
        { status: 400 }
      )
    }

    // 4. Construir items y base real de cobro
    const items = (order.items || []).map((item: any) => ({
      id: String(item.variant_id || item.product_id || 'item'),
      title: item.variante ? `${item.nombre} (${item.variante})` : item.nombre,
      quantity: Number(item.cantidad) || 1,
      unit_price: Number(item.precio_unitario) || 0,
      currency_id: 'ARS',
    }))

    // TODO: Revisión legal de defensa del consumidor sobre recargos en precio final
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

    // Costo de envío si aplica
    if (Number(order.costo_envio) > 0) {
      items.push({
        id: 'costo_envio',
        title: 'Costo de envío',
        quantity: 1,
        unit_price: Number(order.costo_envio),
        currency_id: 'ARS',
      })
    }

    // 5. Calcular monto total cobrado y la comisión de Portalmaker (marketplace_fee)
    const totalCobro = items.reduce((acc: number, it: any) => acc + it.quantity * it.unit_price, 0)
    const comisionPortalmakerPct = Number(store.comision_portalmaker) || 0
    let marketplaceFee = 0

    if (comisionPortalmakerPct > 0) {
      marketplaceFee = Number(((totalCobro * comisionPortalmakerPct) / 100).toFixed(2))
      // Salvaguarda: la comisión no puede ser igual o mayor al total
      if (marketplaceFee >= totalCobro) {
        marketplaceFee = 0
      }
    }

    // 6. Validar y sanitizar origen de retorno (Anti Open Redirect)
    const safeOrigin = getSafeReturnOrigin(returnOrigin, store)
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.portalmaker.ar'}/api/webhooks/mercadopago`

    // 7. Formatear datos del comprador
    const cleanPhone = (order.telefono_comprador || '').replace(/[^0-9]/g, '')
    let payerPhone: { area_code: string; number: number } | undefined = undefined

    if (cleanPhone.length >= 8) {
      const area = cleanPhone.length > 8 ? cleanPhone.slice(0, cleanPhone.length - 8) : '11'
      const num = parseInt(cleanPhone.slice(-8), 10)
      if (!isNaN(num)) {
        payerPhone = { area_code: area, number: num }
      }
    }

    // Exigir email válido del comprador
    const buyerEmail = order.email_comprador?.trim()
    if (!buyerEmail || !buyerEmail.includes('@')) {
      return NextResponse.json({ error: 'El email del comprador es obligatorio para procesar el pago' }, { status: 400 })
    }

    // Vencimiento de la preferencia (48 horas para evitar links infinitos)
    const now = new Date()
    const expirationDate = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()

    const preferencePayload: any = {
      items,
      payer: {
        name: order.nombre_comprador?.trim() || 'Cliente',
        email: buyerEmail,
        ...(payerPhone ? { phone: payerPhone } : {}),
        ...(order.direccion_entrega ? { address: { street_name: order.direccion_entrega.trim() } } : {}),
      },
      back_urls: {
        success: `${safeOrigin}/tienda/pedido-confirmado?order_id=${order.id}&status=approved`,
        failure: `${safeOrigin}/tienda/checkout?order_id=${order.id}&status=failure`,
        pending: `${safeOrigin}/tienda/pedido-confirmado?order_id=${order.id}&status=pending`,
      },
      auto_return: 'approved',
      external_reference: order.id,
      notification_url: webhookUrl,
      statement_descriptor: store.nombre.slice(0, 16),
      expires: true,
      expiration_date_from: now.toISOString(),
      expiration_date_to: expirationDate,
      metadata: {
        order_id: order.id,
        store_id: store.id,
      },
    }

    if (marketplaceFee > 0) {
      preferencePayload.marketplace_fee = marketplaceFee
    }

    // 8. Crear la preferencia en Mercado Pago
    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storeAccessToken}`,
      },
      body: JSON.stringify(preferencePayload),
    })

    const mpData = await mpRes.json()

    if (!mpRes.ok || !mpData.id) {
      console.error('Error al generar preferencia en Mercado Pago:', mpData)
      return NextResponse.json(
        { error: 'No se pudo generar la preferencia de pago. Intenta nuevamente.' },
        { status: 500 }
      )
    }

    // 9. Actualizar la orden con preference_id, total real y comisión calculada
    const { error: updateOrderErr } = await supabaseAdmin
      .from('orders')
      .update({
        total: totalCobro,
        mp_preference_id: mpData.id,
        mp_fee_portalmaker: marketplaceFee,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (updateOrderErr) {
      console.error('Error al guardar preference_id en orders:', updateOrderErr)
    }

    return NextResponse.json({
      preferenceId: mpData.id,
      initPoint: mpData.init_point,
    })
  } catch (err: any) {
    console.error('Excepción al crear preferencia de Mercado Pago:', err)
    return NextResponse.json({ error: 'Ocurrió un error inesperado al procesar el pago' }, { status: 500 })
  }
}
