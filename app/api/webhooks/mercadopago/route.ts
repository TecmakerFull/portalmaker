import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { sendOrderPaidNotification } from '@/lib/email-notifications'
import { getValidMpAccessToken, verifyMpWebhookSignature } from '@/lib/mercadopago'

// =============================================================================
// PORTALMAKER — Webhook Oficial de Mercado Pago (Checkout Pro Marketplace)
// Procesamiento seguro con token del vendedor, RPC atómica de stock y validación de firma.
// =============================================================================

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    // A7: Filtrar por tipo de evento (solo procesar payment; ignorar merchant_order, etc.)
    const eventType = searchParams.get('type') || searchParams.get('topic')
    if (eventType && eventType !== 'payment') {
      return NextResponse.json({ status: 'ignored_non_payment_type', type: eventType }, { status: 200 })
    }

    // A2: Tomar data.id estrictamente del query string (es lo firmado por MP)
    const paymentId = searchParams.get('data.id') || searchParams.get('id')
    if (!paymentId) {
      return NextResponse.json({ status: 'ignored_no_id' }, { status: 200 })
    }

    // A2: Validación de firma HMAC obligatoria
    const webhookSecret = process.env.MP_WEBHOOK_SECRET
    if (!webhookSecret) {
      if (process.env.NODE_ENV === 'production') {
        console.error('ERROR CRITICO: MP_WEBHOOK_SECRET no está configurado en producción.')
        return NextResponse.json({ error: 'Configuración de seguridad incompleta' }, { status: 500 })
      }
      console.warn('MP_WEBHOOK_SECRET no configurado (modo desarrollo / bypass temporal)')
    } else {
      const xSignature = req.headers.get('x-signature')
      const xRequestId = req.headers.get('x-request-id')
      const isValid = verifyMpWebhookSignature(xSignature, xRequestId, paymentId, webhookSecret)

      if (!isValid) {
        console.warn(`Webhook MP: Firma HMAC inválida para pago ${paymentId}`)
        return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
      }
    }

    // A1: Leer order_id inyectado en notification_url de la preferencia
    const orderId = searchParams.get('order_id')
    if (!orderId) {
      console.warn(`Webhook MP: Notificación recibida sin order_id en query string para pago ${paymentId}`)
      // Respondemos 200 para eventos huerfanos que no corresponden al flujo
      return NextResponse.json({ status: 'ignored_no_order_id' }, { status: 200 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // 1. Cargar el pedido de la base de datos
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr) {
      console.error(`Webhook MP: Error de base de datos al buscar pedido ${orderId}:`, orderErr)
      // A5: Error transitorio de DB -> responder 500 para que MP reintente
      return NextResponse.json({ error: 'database_error' }, { status: 500 })
    }

    if (!order) {
      console.warn(`Webhook MP: Pedido ${orderId} no existe en la base de datos`)
      return NextResponse.json({ status: 'order_not_found' }, { status: 200 })
    }

    // A3: Si ya está aprobado y stock descontado, cortar rápido (idempotencia)
    if (order.estado_pago === 'aprobado' && order.stock_descontado) {
      return NextResponse.json({ status: 'already_approved' }, { status: 200 })
    }

    // 2. Cargar la tienda dueña del pedido
    const { data: store, error: storeErr } = await supabaseAdmin
      .from('stores')
      .select('*')
      .eq('id', order.store_id)
      .maybeSingle()

    if (storeErr) {
      console.error(`Webhook MP: Error al consultar tienda ${order.store_id}:`, storeErr)
      return NextResponse.json({ error: 'store_database_error' }, { status: 500 })
    }

    if (!store || !store.mp_connected) {
      console.warn(`Webhook MP: Tienda ${order.store_id} no encontrada o sin MP conectado`)
      return NextResponse.json({ status: 'store_not_connected' }, { status: 200 })
    }

    // 3. Obtener el token válido del vendedor (renueva si está por vencer)
    let sellerToken: string | null = null
    try {
      sellerToken = await getValidMpAccessToken(store)
    } catch (refreshErr: any) {
      console.error(`Webhook MP: Error transitorio al refrescar token de tienda ${store.id}:`, refreshErr)
      // A5: Error transitorio de refresh -> 503 para reintento de MP
      return NextResponse.json({ error: 'seller_token_refresh_transient' }, { status: 503 })
    }

    if (!sellerToken) {
      console.error(`Webhook MP: Tienda ${store.id} requiere revinculación de Mercado Pago`)
      return NextResponse.json({ status: 'seller_token_revoked' }, { status: 200 })
    }

    // 4. Consultar el pago en la API de Mercado Pago SIEMPRE con el token del vendedor
    let payment: any = null
    try {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${sellerToken}`,
        },
      })

      if (!mpRes.ok) {
        if (mpRes.status >= 500) {
          // A5: Falla transitoria de MP -> 502 para que MP reintente
          console.error(`Webhook MP: Mercado Pago respondió ${mpRes.status} al consultar pago ${paymentId}`)
          return NextResponse.json({ error: 'mp_gateway_error' }, { status: 502 })
        }
        if (mpRes.status === 404) {
          console.warn(`Webhook MP: Pago ${paymentId} no encontrado en cuenta de tienda ${store.id}`)
          return NextResponse.json({ status: 'payment_not_found' }, { status: 200 })
        }
        const errBody = await mpRes.text()
        console.error(`Webhook MP: Error ${mpRes.status} al consultar pago ${paymentId}:`, errBody)
        return NextResponse.json({ error: 'payment_fetch_failed' }, { status: 500 })
      }

      payment = await mpRes.json()
    } catch (fetchErr) {
      console.error(`Webhook MP: Excepción de red al consultar pago ${paymentId}:`, fetchErr)
      // A5: Falla de red transitoria -> 503 para reintento
      return NextResponse.json({ error: 'network_fetch_error' }, { status: 503 })
    }

    if (!payment || !payment.status) {
      return NextResponse.json({ error: 'invalid_payment_payload' }, { status: 500 })
    }

    // A1: Verificar que el external_reference coincida estrictamente con el ID del pedido
    if (String(payment.external_reference) !== String(order.id)) {
      console.warn(
        `Webhook MP: external_reference mismatch (${payment.external_reference} !== ${order.id}) en pago ${paymentId}`
      )
      return NextResponse.json({ status: 'reference_mismatch' }, { status: 200 })
    }

    // 5. Procesar según estado del pago
    const paymentStatus = payment.status

    if (paymentStatus === 'approved') {
      const paidAmount = Number(payment.transaction_amount) || 0
      const paymentCurrency = String(payment.currency_id || 'ARS')
      const netReceived = payment.transaction_details?.net_received_amount ?? null
      const feeDetails = payment.fee_details || []
      const mpFeePortalmaker =
        feeDetails.find((f: any) => f.type === 'marketplace_fee')?.amount ?? order.mp_fee_portalmaker

      // A3/L3: Ejecutar RPC atómica idempotente para verificar monto/moneda, actualizar pago y descontar stock
      const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc('process_approved_payment', {
        p_order_id: order.id,
        p_payment_id: String(paymentId),
        p_net_received: netReceived,
        p_fee: mpFeePortalmaker,
        p_amount: paidAmount,
        p_currency: paymentCurrency,
      })

      if (rpcErr) {
        console.error(`Webhook MP: Error en RPC process_approved_payment para pedido ${order.id}:`, rpcErr)
        // A5: Error de base de datos -> 500 para reintento de MP
        return NextResponse.json({ error: 'rpc_execution_error' }, { status: 500 })
      }

      // L3: Si la RPC detectó monto menor o moneda inválida, quedó en 'revision' sin descontar stock
      if (rpcResult?.status === 'revision') {
        console.warn(
          `Webhook MP: Pedido ${order.id} marcado en revision por la RPC (monto: $${paidAmount}, moneda: ${paymentCurrency})`
        )
        return NextResponse.json(
          { success: true, status: 'revision', processed: true },
          { status: 200 }
        )
      }

      // Enviar email al vendedor SOLO si es la primera vez que se aprueba
      if (rpcResult?.first_time && rpcResult?.status === 'aprobado') {
        try {
          await sendOrderPaidNotification({
            store,
            order: { ...order, total: paidAmount || order.total },
          })
        } catch (emailErr) {
          console.error(`Webhook MP: Error enviando email de confirmación para pedido ${order.id}:`, emailErr)
        }
      }

      return NextResponse.json(
        {
          success: true,
          processed: true,
          status: rpcResult?.status || 'aprobado',
          firstTime: Boolean(rpcResult?.first_time),
        },
        { status: 200 }
      )
    }

    // A6: Manejo de otros estados de pago
    if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
      await supabaseAdmin
        .from('orders')
        .update({
          estado_pago: 'rechazado',
          mp_payment_id: String(paymentId),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      return NextResponse.json({ success: true, status: 'rejected' }, { status: 200 })
    }

    if (paymentStatus === 'refunded') {
      // Registrar reembolso en el pedido
      // TODO: Evaluar según política comercial de la tienda si se repone stock automáticamente
      await supabaseAdmin
        .from('orders')
        .update({
          estado_pago: 'reembolsado',
          mp_payment_id: String(paymentId),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      console.warn(`Webhook MP: Pago ${paymentId} reembolsado para pedido ${order.id}`)
      return NextResponse.json({ success: true, status: 'refunded' }, { status: 200 })
    }

    if (paymentStatus === 'charged_back') {
      // Registrar contracargo en el pedido
      await supabaseAdmin
        .from('orders')
        .update({
          estado_pago: 'contracargo',
          mp_payment_id: String(paymentId),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      console.error(`Webhook MP: CONTRACARGO registrado en pago ${paymentId} para pedido ${order.id}`)
      return NextResponse.json({ success: true, status: 'charged_back' }, { status: 200 })
    }

    if (paymentStatus === 'in_process' || paymentStatus === 'pending') {
      await supabaseAdmin
        .from('orders')
        .update({
          estado_pago: 'pendiente',
          mp_payment_id: String(paymentId),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      return NextResponse.json({ success: true, status: 'pending' }, { status: 200 })
    }

    return NextResponse.json({ status: `unhandled_${paymentStatus}` }, { status: 200 })
  } catch (err: any) {
    console.error('Webhook MP: Excepción no controlada:', err)
    // A5: Errores transitorios no capturados deben retornar 500 para permitir reintento
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'Portalmaker Mercado Pago Webhook' }, { status: 200 })
}
