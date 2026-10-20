import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getValidMpAccessToken, getSafeReturnOrigin, calcularMarketplaceFee } from '@/lib/mercadopago'

// =============================================================================
// PORTALMAKER — Mercado Pago: Crear Preferencia de Pago Checkout Pro
// Utiliza las credenciales OAuth de la tienda con split de comisiones (marketplace_fee).
// =============================================================================

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId, publicToken, storeId: candidateStoreId, returnOrigin } = body

    // T2: Exigir orderId + public_token
    if (!orderId || !publicToken) {
      return NextResponse.json({ error: 'orderId y publicToken son obligatorios' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // 1. SEGURIDAD: Obtener primero el pedido para determinar la tienda real y validar token
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    // T2: Validar token público
    if (order.public_token !== publicToken) {
      return NextResponse.json({ error: 'Token de acceso no válido para este pedido' }, { status: 403 })
    }

    // Ronda 7: Exigir metodo_pago === 'mercadopago'
    if (order.metodo_pago !== 'mercadopago') {
      return NextResponse.json(
        { error: `El pedido no fue creado para abonar con Mercado Pago (método actual: ${order.metodo_pago})` },
        { status: 400 }
      )
    }

    // Ronda 7: Aceptar pendiente y rechazado para permitir reintentos; rechazar aprobado, revision, reembolsado, contracargo
    if (!['pendiente', 'rechazado'].includes(order.estado_pago)) {
      return NextResponse.json(
        { error: `El pedido no admite nuevo intento de pago en su estado actual (estado: ${order.estado_pago})` },
        { status: 400 }
      )
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
    let storeAccessToken: string | null = null
    try {
      storeAccessToken = await getValidMpAccessToken(store)
    } catch (tokenErr: any) {
      if (tokenErr?.message === 'MP_TOKEN_REFRESH_TEMPORARY_ERROR') {
        return NextResponse.json(
          { error: 'Servicio de pago temporalmente no disponible. Intenta nuevamente en unos instantes.' },
          { status: 503 }
        )
      }
      throw tokenErr
    }

    if (!storeAccessToken) {
      return NextResponse.json(
        { error: 'La conexión de Mercado Pago de la tienda no está activa. Requiere revinculación.' },
        { status: 400 }
      )
    }

    // 4. Construir items y base real de cobro
    if (!Array.isArray(order.items) || order.items.length === 0) {
      return NextResponse.json({ error: 'El pedido no contiene productos válidos' }, { status: 400 })
    }

    // C5: Validar precios contra la base de datos en el servidor para evitar manipulación en el cliente
    const validatedItems: Array<{
      id: string
      title: string
      quantity: number
      unit_price: number
      currency_id: string
    }> = []

    for (const item of order.items) {
      const qty = Number(item.cantidad) || 0
      let verifiedUnitPrice = Number(item.precio_unitario) || 0

      // Consultar precio real en la base de datos si product_id está presente
      if (item.product_id) {
        const { data: dbProduct } = await supabaseAdmin
          .from('products')
          .select('id, precio_base, precio_oferta, oferta_activa')
          .eq('id', item.product_id)
          .maybeSingle()

        if (dbProduct) {
          let basePrice = dbProduct.oferta_activa && dbProduct.precio_oferta != null
            ? Number(dbProduct.precio_oferta)
            : Number(dbProduct.precio_base)

          // Si tiene variante, sumar precio adicional de la variante
          if (item.variant_id) {
            const { data: dbVariant } = await supabaseAdmin
              .from('product_variants')
              .select('id, precio_adicional')
              .eq('id', item.variant_id)
              .maybeSingle()

            if (dbVariant) {
              basePrice += Number(dbVariant.precio_adicional || 0)
            }
          }

          if (basePrice > 0 && Math.abs(basePrice - verifiedUnitPrice) > 0.01) {
            console.warn(
              `Discrepancia de precio detectada en pedido ${order.id}, producto ${item.product_id}: client=${verifiedUnitPrice}, db=${basePrice}. Se aplica precio de DB.`
            )
            verifiedUnitPrice = basePrice
          }
        }
      }

      // C2: Validar items antes de llamar a MP
      if (qty <= 0 || verifiedUnitPrice <= 0) {
        return NextResponse.json(
          { error: 'Todos los productos deben tener cantidad y precio mayores a 0' },
          { status: 400 }
        )
      }

      validatedItems.push({
        id: String(item.variant_id || item.product_id || 'item'),
        title: item.variante ? `${item.nombre} (${item.variante})` : item.nombre,
        quantity: qty,
        unit_price: Number(verifiedUnitPrice.toFixed(2)),
        currency_id: 'ARS',
      })
    }

    // Ronda 7: El recargo sale del snapshot order.mp_recargo_pct (lo que vio el comprador)
    const recargoPct = order.mp_recargo_pct != null
      ? Number(order.mp_recargo_pct)
      : (Number(store.mp_recargo_porcentaje) || 0)

    if (recargoPct > 0) {
      const subtotalProductos = validatedItems.reduce((acc, it) => acc + it.quantity * it.unit_price, 0)
      const montoRecargo = Number(((subtotalProductos * recargoPct) / 100).toFixed(2))
      if (montoRecargo > 0) {
        validatedItems.push({
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
      validatedItems.push({
        id: 'costo_envio',
        title: 'Costo de envío',
        quantity: 1,
        unit_price: Number(Number(order.costo_envio).toFixed(2)),
        currency_id: 'ARS',
      })
    }

    // C1, AB2: Calcular monto total cobrado y redondear
    const totalCobro = Number(validatedItems.reduce((acc, it) => acc + it.quantity * it.unit_price, 0).toFixed(2))
    if (totalCobro <= 0) {
      return NextResponse.json({ error: 'El monto total a cobrar debe ser mayor a 0' }, { status: 400 })
    }

    // Ronda 7: Si el total recalculado difiere del order.total mostrado en más de $1, responder 409
    if (Math.abs(Number(order.total) - totalCobro) > 1.00) {
      console.warn(`Discrepancia de total detectada: order.total=${order.total} vs totalCobro=${totalCobro} en pedido ${order.id}`)
      return NextResponse.json(
        {
          error: 'El total del pedido difiere del cálculo actual debido a una actualización de precios. Por favor recarga el checkout.',
          code: 'TOTAL_MISMATCH',
          expected: Number(order.total),
          calculated: totalCobro,
        },
        { status: 409 }
      )
    }

    // Ronda 7: Reutilizar preferencia solo si tiene menos de 24h según mp_preference_created_at, está pendiente y el total no cambió
    if (order.mp_preference_id && order.mp_init_point && order.mp_preference_created_at) {
      const prefCreatedAt = new Date(order.mp_preference_created_at).getTime()
      const isUnder24Hours = !isNaN(prefCreatedAt) && (Date.now() - prefCreatedAt < 24 * 60 * 60 * 1000)
      const totalUnchanged = Math.abs(Number(order.total) - totalCobro) < 0.01

      if (isUnder24Hours && order.estado_pago === 'pendiente' && totalUnchanged) {
        return NextResponse.json({
          preferenceId: order.mp_preference_id,
          initPoint: order.mp_init_point,
        })
      }
    }

    // D3c, AB3: Comisión de Portalmaker (marketplace_fee) calculada mediante helper centralizado
    const comisionPortalmakerPct = Number(store.comision_portalmaker) || 0
    let marketplaceFee = 0

    if (comisionPortalmakerPct > 0) {
      marketplaceFee = calcularMarketplaceFee(validatedItems, store)

      // C6, AB2: Salvaguarda si la comisión supera el total con warning explícito
      if (marketplaceFee >= totalCobro) {
        console.warn(`marketplaceFee (${marketplaceFee}) >= totalCobro (${totalCobro}) en pedido ${order.id}, omitiendo fee.`)
        marketplaceFee = 0
      }
    }

    // Validar y sanitizar origen de retorno (Anti Open Redirect)
    const safeOrigin = getSafeReturnOrigin(returnOrigin, store)

    // A1: notification_url con order_id explícito en query string
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.portalmaker.ar').replace(/\/$/, '')
    const webhookUrl = `${appUrl}/api/webhooks/mercadopago?order_id=${order.id}`

    // Exigir email válido del comprador
    const buyerEmail = order.email_comprador?.trim()
    if (!buyerEmail || !buyerEmail.includes('@')) {
      return NextResponse.json({ error: 'El email del comprador es obligatorio para procesar el pago' }, { status: 400 })
    }

    // Vencimiento de la preferencia (48 horas para evitar links infinitos)
    const now = new Date()
    const expirationDate = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()

    // C3: Omitir payer.phone para evitar rechazos de formato de MP
    // C7: Nombre seguro de tienda para statement_descriptor
    const safeStoreName = ((store.nombre || 'Tienda').trim()).slice(0, 16)

    const preferencePayload: any = {
      items: validatedItems,
      payer: {
        name: order.nombre_comprador?.trim() || 'Cliente',
        email: buyerEmail,
        ...(order.direccion_entrega ? { address: { street_name: order.direccion_entrega.trim() } } : {}),
      },
      back_urls: {
        success: `${safeOrigin}/tienda/pedido-confirmado?order_id=${order.id}&token=${order.public_token || ''}&status=approved`,
        failure: `${safeOrigin}/tienda/checkout?order_id=${order.id}&token=${order.public_token || ''}&status=failure`,
        pending: `${safeOrigin}/tienda/pedido-confirmado?order_id=${order.id}&token=${order.public_token || ''}&status=pending`,
      },
      auto_return: 'approved',
      external_reference: order.id,
      notification_url: webhookUrl,
      statement_descriptor: safeStoreName,
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

    // 5. Crear la preferencia en Mercado Pago
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

    // 6. Actualizar la orden con preference_id, init_point, total real, comisión y snapshots de porcentaje (D3)
    const { error: updateOrderErr } = await supabaseAdmin
      .from('orders')
      .update({
        total: totalCobro,
        mp_preference_id: mpData.id,
        mp_init_point: mpData.init_point,
        mp_preference_created_at: new Date().toISOString(),
        mp_fee_portalmaker: marketplaceFee,
        comision_portalmaker_pct: comisionPortalmakerPct,
        mp_recargo_pct: recargoPct,
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
