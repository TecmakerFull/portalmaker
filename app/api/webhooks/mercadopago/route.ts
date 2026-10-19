import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { sendOrderPaidNotification } from '@/lib/email-notifications'
import { getValidMpAccessToken, verifyMpWebhookSignature } from '@/lib/mercadopago'

// =============================================================================
// PORTALMAKER — Webhook Oficial de Mercado Pago
// Procesa notificaciones de pago con validación de firma, token de vendedor,
// idempotencia estricta, descuento de stock y alerta por correo.
// =============================================================================

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    let paymentId = searchParams.get('data.id') || searchParams.get('id')

    // Leer también del body si no vino en URL
    if (!paymentId) {
      try {
        const body = await req.json()
        if (body?.data?.id) {
          paymentId = String(body.data.id)
        } else if (body?.id) {
          paymentId = String(body.id)
        }
      } catch {
        // Body no es JSON o vacío
      }
    }

    if (!paymentId) {
      return NextResponse.json({ status: 'ignored_no_id' }, { status: 200 })
    }

    // 1. Opcional: Validar firma HMAC si está configurado MP_WEBHOOK_SECRET
    const webhookSecret = process.env.MP_WEBHOOK_SECRET
    if (webhookSecret) {
      const xSignature = req.headers.get('x-signature')
      const xRequestId = req.headers.get('x-request-id')
      const isValid = verifyMpWebhookSignature(xSignature, xRequestId, paymentId, webhookSecret)

      if (!isValid) {
        console.warn(`Webhook: Firma inválida para el pago ${paymentId}`)
        return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
      }
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // 2. Intentar consultar primero con el Access Token maestro o buscar el pedido
    // Consultar Mercado Pago para obtener external_reference (orderId)
    const masterAccessToken = process.env.MP_ACCESS_TOKEN

    let mpPaymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${masterAccessToken}`,
      },
    })

    let payment = mpPaymentRes.ok ? await mpPaymentRes.json() : null
    let orderId = payment?.external_reference

    // Si falló con el master token, buscar si el pedido ya tenía registrado el paymentId o preference
    if (!orderId) {
      const { data: matchedOrder } = await supabaseAdmin
        .from('orders')
        .select('id, store_id, estado_pago, total, stock_descontado, items')
        .eq('mp_payment_id', paymentId)
        .maybeSingle()

      if (matchedOrder) {
        orderId = matchedOrder.id
      }
    }

    if (!orderId) {
      console.warn(`Webhook: No se pudo determinar el pedido asociado al pago ${paymentId}`)
      return NextResponse.json({ status: 'ignored_no_order' }, { status: 200 })
    }

    // 3. Buscar el pedido en la base de datos
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      console.warn(`Webhook: Pedido ${orderId} no encontrado`)
      return NextResponse.json({ status: 'order_not_found' }, { status: 200 })
    }

    // 4. IDEMPOTENCIA: Si el pedido ya está aprobado, no re-procesar (evita doble descuento de stock)
    if (order.estado_pago === 'aprobado') {
      return NextResponse.json({ status: 'already_approved' }, { status: 200 })
    }

    // 5. Obtener la tienda para consultar con su token de vendedor
    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('*')
      .eq('id', order.store_id)
      .single()

    if (store && store.mp_connected) {
      const sellerToken = await getValidMpAccessToken(store)
      if (sellerToken && (!payment || payment.status === undefined)) {
        const sellerPaymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${sellerToken}` },
        })
        if (sellerPaymentRes.ok) {
          payment = await sellerPaymentRes.json()
        }
      }
    }

    if (!payment) {
      console.warn(`Webhook: No se pudo obtener la información del pago ${paymentId}`)
      return NextResponse.json({ status: 'payment_fetch_failed' }, { status: 200 })
    }

    // 6. Validar coherencia: que el pago corresponda efectivamente a este pedido
    if (String(payment.external_reference) !== String(order.id)) {
      console.warn(`Webhook: Mismatch de external_reference (${payment.external_reference} !== ${order.id})`)
      return NextResponse.json({ status: 'reference_mismatch' }, { status: 200 })
    }

    // 7. Procesar según estado
    if (payment.status === 'approved') {
      // Validar que el monto cobrado cubra el total del pedido
      const paidAmount = Number(payment.transaction_amount) || 0
      const expectedAmount = Number(order.total) || 0

      if (paidAmount < expectedAmount - 1) { // margen de 1 peso por posibles redondeos
        console.warn(`Webhook: Monto pagado menor al esperado ($${paidAmount} < $${expectedAmount})`)
      }

      const netReceived = payment.transaction_details?.net_received_amount ?? null
      const feeDetails = payment.fee_details || []
      const mpFeePortalmaker = feeDetails.find((f: any) => f.type === 'marketplace_fee')?.amount ?? order.mp_fee_portalmaker

      // Actualizar estado del pago a 'aprobado'
      await supabaseAdmin
        .from('orders')
        .update({
          estado_pago: 'aprobado',
          mp_payment_id: String(paymentId),
          mp_net_received: netReceived,
          mp_fee_portalmaker: mpFeePortalmaker,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      // Descontar inventario de forma segura
      if (!order.stock_descontado && Array.isArray(order.items)) {
        for (const item of order.items) {
          const qty = Number(item.cantidad) || 0
          if (qty <= 0) continue

          if (item.variant_id) {
            const { data: variant } = await supabaseAdmin
              .from('product_variants')
              .select('id, stock')
              .eq('id', item.variant_id)
              .single()

            if (variant && variant.stock !== null && variant.stock !== undefined) {
              const newStock = Math.max(0, Number(variant.stock) - qty)
              await supabaseAdmin
                .from('product_variants')
                .update({ stock: newStock })
                .eq('id', variant.id)
            }
          } else if (item.product_id) {
            const { data: prod } = await supabaseAdmin
              .from('products')
              .select('id, stock, gestiona_stock')
              .eq('id', item.product_id)
              .single()

            if (prod && prod.gestiona_stock && prod.stock !== null && prod.stock !== undefined) {
              const newStock = Math.max(0, Number(prod.stock) - qty)
              await supabaseAdmin
                .from('products')
                .update({ stock: newStock })
                .eq('id', prod.id)
            }
          }
        }

        await supabaseAdmin
          .from('orders')
          .update({ stock_descontado: true })
          .eq('id', order.id)
      }

      // Enviar email de notificación al dueño de la tienda
      if (store) {
        try {
          await sendOrderPaidNotification({ store, order: { ...order, total: paidAmount || order.total } })
        } catch (emailErr) {
          console.error('Error enviando email de notificación de venta:', emailErr)
        }
      }
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      await supabaseAdmin
        .from('orders')
        .update({
          estado_pago: 'rechazado',
          mp_payment_id: String(paymentId),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    console.error('Excepción en webhook de Mercado Pago:', err)
    return NextResponse.json({ status: 'error_handled' }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'Portalmaker MP Webhook' }, { status: 200 })
}
