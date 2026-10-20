import { NextResponse } from 'next/server'
import { verifyMpWebhookSignature } from '@/lib/mercadopago'
import { processMpPayment, handleSellerTokenRevoked } from '@/lib/mp-payments'

// =============================================================================
// PORTALMAKER — Webhook Oficial de Mercado Pago (Checkout Pro Marketplace)
// Procesamiento seguro con token del vendedor, firma HMAC, auditoría y alertas.
// =============================================================================

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    // Leer cuerpo si viene en formato JSON
    let body: any = null
    try {
      body = await req.clone().json()
    } catch {
      // Ignorar si el payload no es JSON
    }

    // Manejo de revocación de autorización del vendedor
    const action = body?.action || searchParams.get('action')
    const typeParam = body?.type || searchParams.get('type') || searchParams.get('topic')
    if (action === 'seller_token_revoked' || typeParam === 'seller_token_revoked') {
      const revokedUserId = String(body?.user_id || searchParams.get('user_id') || '')
      await handleSellerTokenRevoked(revokedUserId)
      return NextResponse.json({ status: 'seller_token_revoked', user_id: revokedUserId }, { status: 200 })
    }

    // A7: Filtrar por tipo de evento (solo procesar payment; ignorar merchant_order, etc.)
    const eventType = typeParam || 'payment'
    if (eventType !== 'payment') {
      return NextResponse.json({ status: 'ignored_non_payment_type', type: eventType }, { status: 200 })
    }

    // A2: Tomar data.id del query string o del cuerpo
    const paymentId = searchParams.get('data.id') || searchParams.get('id') || body?.data?.id
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
      const isValid = verifyMpWebhookSignature(xSignature, xRequestId, String(paymentId), webhookSecret)

      if (!isValid) {
        console.warn(`Webhook MP: Firma HMAC inválida para pago ${paymentId}`)
        return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
      }
    }

    // A1: Leer order_id inyectado en notification_url de la preferencia o buscar por external_reference
    const orderId = searchParams.get('order_id') || body?.order_id || null

    // Procesar el pago con el motor unificado de Mercado Pago (registra en mp_webhook_events y alerta)
    const result = await processMpPayment({
      paymentId: String(paymentId),
      orderId,
      eventType,
    })

    return NextResponse.json(
      {
        success: result.httpStatus === 200,
        status: result.status,
        orderId: result.orderId,
        paymentId: result.paymentId,
        error: result.error,
      },
      { status: result.httpStatus }
    )
  } catch (err: any) {
    console.error('Webhook MP: Excepción no controlada:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'Portalmaker Mercado Pago Webhook' }, { status: 200 })
}
