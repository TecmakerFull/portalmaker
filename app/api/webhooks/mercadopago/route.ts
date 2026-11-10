import { NextResponse } from 'next/server'
import { verifyMpWebhookSignature } from '@/lib/mercadopago'
import { processMpPayment, handleSellerTokenRevoked } from '@/lib/mp-payments'
import { creditPlatformPayment } from '@/lib/subscriptions/server'
import { creditAutoDebitPayment, handleAuthorizedPayment, isAutodebitEnabled, syncMandate } from '@/lib/subscriptions/autodebit'

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
    // Tópicos del débito automático (suscripciones de MP). Con el flag apagado se ignoran.
    const isSubscriptionTopic = eventType === 'subscription_preapproval' || eventType === 'subscription_authorized_payment'
    if (eventType !== 'payment' && !isSubscriptionTopic) {
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
      let isValid = verifyMpWebhookSignature(xSignature, xRequestId, String(paymentId), webhookSecret)

      // Si el token de cobro de planes pertenece a otra aplicación de MP, su firma usa
      // otro secreto. Se acepta como alternativa solo si está configurado explícitamente.
      const subsSecret = process.env.MP_SUBSCRIPTIONS_WEBHOOK_SECRET
      if (!isValid && subsSecret) {
        isValid = verifyMpWebhookSignature(xSignature, xRequestId, String(paymentId), subsSecret)
      }

      if (!isValid) {
        console.warn(`Webhook MP: Firma HMAC inválida para pago ${paymentId}`)
        return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
      }
    }

    // Débito automático: la firma ya fue validada arriba; el estado y los montos se
    // consultan siempre en la API de MP, nunca se toman del cuerpo de la notificación.
    if (isSubscriptionTopic) {
      if (!isAutodebitEnabled()) {
        return NextResponse.json({ status: 'ignored_autodebit_disabled' }, { status: 200 })
      }
      const r =
        eventType === 'subscription_preapproval'
          ? await syncMandate(String(paymentId))
          : await handleAuthorizedPayment(String(paymentId))
      return NextResponse.json({ status: r.status }, { status: r.httpStatus })
    }

    // A1: Leer order_id inyectado en notification_url de la preferencia o buscar por external_reference
    const orderId = searchParams.get('order_id') || body?.order_id || null

    // Cobro de planes de Portalmaker: los pagos de pedidos siempre llevan order_id en la
    // notification_url, así que los que no lo traen (o traen kind=sub) se prueban primero
    // contra la cuenta de la plataforma. 'kind' es solo una pista: lo que decide es el
    // external_reference del pago consultado en la API de MP, nunca la query.
    if (searchParams.get('kind') === 'sub' || !orderId) {
      const sub = await creditPlatformPayment(String(paymentId))
      if (sub.handled) {
        return NextResponse.json({ status: sub.status, paymentId: String(paymentId) }, { status: sub.httpStatus })
      }
      // Cobro recurrente del débito automático (external_reference = mandate_<id>).
      if (sub.status === 'mandate_payment' && isAutodebitEnabled()) {
        const auto = await creditAutoDebitPayment(sub.payment)
        return NextResponse.json({ status: auto.status, paymentId: String(paymentId) }, { status: auto.httpStatus })
      }
    }

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
