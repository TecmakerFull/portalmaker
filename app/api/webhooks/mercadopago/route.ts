import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { sendOrderPaidNotification } from '@/lib/email-notifications'

// =============================================================================
// PORTALMAKER — Webhook de Mercado Pago
// Recibe notificaciones automáticas en tiempo real cuando un pago es aprobado,
// actualiza el estado del pedido y ajusta el stock.
// =============================================================================

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    let paymentId = searchParams.get('data.id') || searchParams.get('id')
    const type = searchParams.get('type') || searchParams.get('topic')

    // Leer también del body si no viene en los searchParams
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

    // Mercado Pago envía notificaciones de verificación u otros tópicos
    if (!paymentId) {
      return NextResponse.json({ status: 'ignored_no_id' }, { status: 200 })
    }

    const masterAccessToken = process.env.MP_ACCESS_TOKEN
    if (!masterAccessToken) {
      console.error('Webhook: MP_ACCESS_TOKEN no configurado')
      return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 })
    }

    // Consultar el detalle del pago en Mercado Pago usando el access token maestro de la plataforma
    const mpPaymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${masterAccessToken}`,
      },
    })

    if (!mpPaymentRes.ok) {
      console.warn(`Webhook: No se pudo obtener el pago ${paymentId} de MP (status ${mpPaymentRes.status})`)
      return NextResponse.json({ status: 'payment_not_found' }, { status: 200 })
    }

    const payment = await mpPaymentRes.json()
    const orderId = payment.external_reference

    if (!orderId) {
      console.warn(`Webhook: El pago ${paymentId} no tiene external_reference (orderId)`)
      return NextResponse.json({ status: 'no_external_reference' }, { status: 200 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // Buscar el pedido correspondiente
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      console.warn(`Webhook: Pedido ${orderId} no encontrado en la base de datos`)
      return NextResponse.json({ status: 'order_not_found' }, { status: 200 })
    }

    // Procesar según el estado del pago
    if (payment.status === 'approved') {
      const netReceived = payment.transaction_details?.net_received_amount ?? null
      const feeDetails = payment.fee_details || []
      const mpFeePortalmaker = feeDetails.find((f: any) => f.type === 'marketplace_fee')?.amount ?? null

      // Actualizar estado del pago a 'aprobado'
      await supabaseAdmin
        .from('orders')
        .update({
          estado_pago: 'aprobado',
          mp_payment_id: String(paymentId),
          mp_net_received: netReceived,
          ...(mpFeePortalmaker ? { mp_fee_portalmaker: mpFeePortalmaker } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      // Descontar inventario si aún no se había descontado
      if (!order.stock_descontado && Array.isArray(order.items)) {
        for (const item of order.items) {
          const qty = Number(item.cantidad) || 0
          if (qty <= 0) continue

          if (item.variant_id) {
            // Descontar stock de variante
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
            // Descontar stock de producto simple
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

        // Marcar que el stock ya fue descontado
        await supabaseAdmin
          .from('orders')
          .update({ stock_descontado: true })
          .eq('id', order.id)
      }

      // Enviar email de notificación al dueño de la tienda con datos del comprador y enlace de WhatsApp
      try {
        const { data: store } = await supabaseAdmin
          .from('stores')
          .select('*')
          .eq('id', order.store_id)
          .single()

        if (store) {
          await sendOrderPaidNotification({ store, order })
        }
      } catch (emailErr) {
        console.error('Error al enviar email de notificación de venta:', emailErr)
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
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 })
  }
}

// También responder 200 en GET por si Mercado Pago realiza verificaciones de endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'Portalmaker MP Webhook' }, { status: 200 })
}
