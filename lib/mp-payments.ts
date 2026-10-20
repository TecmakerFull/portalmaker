import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getValidMpAccessToken } from '@/lib/mercadopago'
import { sendOrderPaidNotification, notifyPlatformAlert } from '@/lib/email-notifications'
import { handlePostPaymentShipping } from '@/lib/shipping/post-payment'

export interface ProcessMpPaymentResult {
  status: string
  orderId?: string
  paymentId: string
  httpStatus: number
  error?: string
  message?: string
}

/**
 * Obtiene la URL base de la API de Mercado Pago.
 * En desarrollo permite MP_API_BASE_URL para simular respuestas; en producción siempre apunta a api.mercadopago.com.
 */
export function getMpApiBaseUrl(): string {
  if (process.env.NODE_ENV !== 'production' && process.env.MP_API_BASE_URL) {
    return process.env.MP_API_BASE_URL.replace(/\/$/, '')
  }
  return 'https://api.mercadopago.com'
}

/**
 * Registra y procesa la revocación de autorización de un vendedor desde Mercado Pago.
 */
export async function handleSellerTokenRevoked(userId: string): Promise<void> {
  const supabaseAdmin = createSupabaseAdminClient()
  try {
    // 1. Auditoría en mp_webhook_events
    await supabaseAdmin.from('mp_webhook_events').insert({
      type: 'seller_token_revoked',
      result: { user_id: userId },
      received_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      status: 'seller_token_revoked',
    })

    // 2. Buscar si coincide con alguna tienda
    const { data: cred } = await supabaseAdmin
      .from('store_mp_credentials')
      .select('store_id')
      .eq('mp_user_id', userId)
      .maybeSingle()

    let store: any = null
    if (cred?.store_id) {
      const { data: s } = await supabaseAdmin
        .from('stores')
        .select('*')
        .eq('id', cred.store_id)
        .maybeSingle()
      store = s

      await supabaseAdmin
        .from('stores')
        .update({ mp_connected: false })
        .eq('id', cred.store_id)
    }

    // 3. Notificación de alerta por correo
    await notifyPlatformAlert({
      type: 'seller_token_revoked',
      store,
      details: `Mercado Pago notificó revocación de credenciales para el MP user_id: ${userId}`,
    })
  } catch (err) {
    console.error('Error procesando seller_token_revoked:', err)
  }
}

/**
 * Procesa integralmente un pago de Mercado Pago contra la base de datos de Portalmaker.
 * Utilizado por el Webhook en tiempo real (/api/webhooks/mercadopago) y por el Cron de Reconciliación (/api/cron/mp-reconcile).
 */
export async function processMpPayment(params: {
  paymentId: string
  orderId?: string | null
  eventType?: string
}): Promise<ProcessMpPaymentResult> {
  const { paymentId, eventType = 'payment' } = params
  const supabaseAdmin = createSupabaseAdminClient()
  const nowIso = new Date().toISOString()

  // 1. Registrar evento en mp_webhook_events para auditoría inmutable
  let eventRecordId: string | null = null
  try {
    const { data: eventData } = await supabaseAdmin
      .from('mp_webhook_events')
      .insert({
        payment_id: paymentId,
        order_id: params.orderId || null,
        type: eventType,
        received_at: nowIso,
        status: 'pending',
      })
      .select('id')
      .maybeSingle()

    eventRecordId = eventData?.id || null
  } catch (eventLogErr) {
    console.error('Error registrando evento en mp_webhook_events:', eventLogErr)
  }

  const finalizeEvent = async (result: { status: string; httpStatus: number; error?: string; data?: any }) => {
    if (eventRecordId) {
      try {
        await supabaseAdmin
          .from('mp_webhook_events')
          .update({
            processed_at: new Date().toISOString(),
            status: result.status,
            result: result.data || null,
            error: result.error || null,
          })
          .eq('id', eventRecordId)
      } catch (e) {
        console.error('Error actualizando mp_webhook_events:', e)
      }
    }
    return {
      status: result.status,
      orderId: params.orderId || undefined,
      paymentId,
      httpStatus: result.httpStatus,
      error: result.error,
    }
  }

  // 2. Localizar el pedido correspondiente
  let orderId = params.orderId
  let order: any = null

  if (orderId) {
    const { data: foundOrder, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr) {
      return finalizeEvent({ status: 'database_error', httpStatus: 500, error: orderErr.message })
    }
    order = foundOrder
  }

  // Fallback: si no vino orderId en query string, buscar por mp_payment_id ya asociado
  if (!order) {
    const { data: fallbackOrder } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('mp_payment_id', paymentId)
      .maybeSingle()

    if (fallbackOrder) {
      order = fallbackOrder
      orderId = fallbackOrder.id
    }
  }

  if (!order) {
    console.warn(`Procesamiento MP: No se encontró pedido para el pago ${paymentId}`)
    return finalizeEvent({ status: 'payment_not_found', httpStatus: 200 })
  }

  // 3. Localizar la tienda asociada
  const { data: store, error: storeErr } = await supabaseAdmin
    .from('stores')
    .select('*')
    .eq('id', order.store_id)
    .maybeSingle()

  if (storeErr || !store || !store.mp_connected) {
    console.warn(`Procesamiento MP: Tienda ${order.store_id} no conectada a Mercado Pago`)
    await notifyPlatformAlert({
      type: 'seller_token_revoked',
      store: store || null,
      order,
      details: `Notificación recibida para pedido ${order.id} pero la tienda no tiene MP conectado.`,
      paymentId,
    })
    return finalizeEvent({ status: 'store_not_connected', httpStatus: 200 })
  }

  // 4. Obtener token del vendedor (renueva automáticamente si está próximo a expirar)
  let sellerToken: string | null = null
  try {
    sellerToken = await getValidMpAccessToken(store)
  } catch (refreshErr: any) {
    console.error(`Procesamiento MP: Fallo transitorio al obtener token de tienda ${store.id}:`, refreshErr)
    return finalizeEvent({ status: 'seller_token_refresh_transient', httpStatus: 503, error: refreshErr?.message })
  }

  if (!sellerToken) {
    console.error(`Procesamiento MP: La tienda ${store.id} no posee token de MP activo`)
    await notifyPlatformAlert({
      type: 'seller_token_revoked',
      store,
      order,
      details: `El token de Mercado Pago de la tienda está revocado o vencido sin refresh disponible.`,
      paymentId,
    })
    return finalizeEvent({ status: 'seller_token_revoked', httpStatus: 200 })
  }

  // 5. Consultar estado del pago en Mercado Pago
  const baseUrl = getMpApiBaseUrl()
  const paymentUrl = `${baseUrl}/v1/payments/${paymentId}`

  let paymentRes: Response
  try {
    paymentRes = await fetch(paymentUrl, {
      headers: {
        Authorization: `Bearer ${sellerToken}`,
      },
    })
  } catch (fetchErr: any) {
    console.error(`Procesamiento MP: Error de red al consultar pago ${paymentId}:`, fetchErr)
    return finalizeEvent({ status: 'mp_fetch_network_error', httpStatus: 500, error: fetchErr?.message })
  }

  if (!paymentRes.ok) {
    const errorBody = await paymentRes.text().catch(() => '')
    console.error(`Procesamiento MP: Error ${paymentRes.status} consultando pago ${paymentId}:`, errorBody)
    if (paymentRes.status === 404) {
      return finalizeEvent({ status: 'payment_not_found', httpStatus: 200 })
    }
    return finalizeEvent({ status: 'mp_fetch_error', httpStatus: 500, error: errorBody })
  }

  const payment = await paymentRes.json()

  // 6. Extracción de fee de Portalmaker
  const feeDetails = Array.isArray(payment.fee_details) ? payment.fee_details : []
  const mpFeePortalObj = feeDetails.find(
    (f: any) => f.type === 'marketplace_fee' || f.type === 'application_fee'
  )

  let mpFeePortal = mpFeePortalObj ? Number(mpFeePortalObj.amount) || 0 : 0

  if (!mpFeePortalObj && feeDetails.length > 0 && Number(order.comision_portalmaker_pct || 0) > 0) {
    const feeTypes = feeDetails.map((f: any) => f.type).join(', ')
    console.warn(`Procesamiento MP: No se encontró marketplace_fee ni application_fee en pago ${paymentId} (tipos: ${feeTypes})`)
    await notifyPlatformAlert({
      type: 'unrecognized_fee_type',
      store,
      order,
      details: `El pago posee fee_details pero ninguno es marketplace_fee ni application_fee. Tipos detectados: ${feeTypes}`,
      paymentId,
    })
  }

  const mpNetReceived = Number(payment.transaction_details?.net_received_amount) || (payment.transaction_amount - mpFeePortal)

  // 7. Evaluar estado del pago
  if (payment.status === 'approved') {
    // Ronda 7: Detección de pago duplicado (si el pedido ya estaba aprobado con otro payment_id)
    if (
      (order.estado_pago === 'aprobado' || order.estado_pago === 'revision') &&
      order.mp_payment_id &&
      String(order.mp_payment_id) !== String(paymentId)
    ) {
      const duplicateKey = `[DUPLICATE_PAYMENT:${paymentId}]`
      const currentObs = order.observaciones_admin || ''

      if (!currentObs.includes(duplicateKey)) {
        const duplicateNote = `${currentObs ? currentObs + '\n' : ''}${duplicateKey} Alerta: Posible cobro duplicado recibido en Mercado Pago (ID: ${paymentId}, monto: $${payment.transaction_amount}). El pedido ya estaba acreditado con el pago ${order.mp_payment_id}. Reembolsar el pago ${paymentId}.`
        await supabaseAdmin
          .from('orders')
          .update({ observaciones_admin: duplicateNote })
          .eq('id', order.id)

        await notifyPlatformAlert({
          type: 'pago_duplicado',
          store,
          order,
          details: `Se recibió un segundo pago aprobado para el pedido ${order.id}. Pago acreditado original: ${order.mp_payment_id}, Pago duplicado: ${paymentId} por $${payment.transaction_amount}. Por favor procede al reembolso del pago duplicado en Mercado Pago.`,
          paymentId,
        })
      }

      return finalizeEvent({ status: 'pago_duplicado_notificado', httpStatus: 200, data: { paymentId } })
    }

    // Ronda 7: Manejo idempotente de reembolso parcial
    const refundedAmount = Number(payment.transaction_amount_refunded) || 0
    if (refundedAmount > 0) {
      const partialKey = `[PARTIAL_REFUND:${paymentId}:$${refundedAmount}]`
      const currentObs = order.observaciones_admin || ''

      if (!currentObs.includes(partialKey)) {
        const partialNote = `${currentObs ? currentObs + '\n' : ''}${partialKey} Reembolso parcial registrado: $${refundedAmount} (fecha: ${nowIso})`
        await supabaseAdmin
          .from('orders')
          .update({ observaciones_admin: partialNote })
          .eq('id', order.id)
      }
    }

    // Ejecutar la RPC atómica process_approved_payment
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('process_approved_payment', {
      p_order_id: order.id,
      p_payment_id: String(paymentId),
      p_amount: Number(payment.transaction_amount),
      p_fee: Number(mpFeePortal),
      p_net_received: Number(mpNetReceived),
      p_currency: String(payment.currency_id || 'ARS'),
    })

    if (rpcError) {
      console.error(`Procesamiento MP: Error en RPC process_approved_payment para orden ${order.id}:`, rpcError)
      return finalizeEvent({ status: 'rpc_error', httpStatus: 500, error: rpcError.message })
    }

    // Alertas por resultado de RPC
    if (rpcResult?.status === 'revision') {
      await notifyPlatformAlert({
        type: 'revision',
        store,
        order,
        details: `El pedido pasó a estado REVISIÓN por discrepancia. Razón: ${rpcResult.reason || 'Monto o moneda no coinciden'}. Monto recibido: $${payment.transaction_amount}, Esperado: $${order.total}`,
        paymentId,
      })
    }

    if (rpcResult?.stock_warning) {
      await notifyPlatformAlert({
        type: 'stock_warning',
        store,
        order,
        details: `Se registró una sobreventa al acreditar el pago ${paymentId} para el pedido ${order.id}. Por favor revisa el inventario de la tienda.`,
        paymentId,
      })
    }

    // Enviar email de venta confirmada solo en la primera aprobación exitosa
    if (rpcResult?.first_time && rpcResult?.status === 'aprobado') {
      void Promise.resolve(
        supabaseAdmin.from('order_events').insert([
          {
            order_id: order.id,
            store_id: store.id,
            tipo: 'estado_pago',
            de: 'pendiente',
            a: 'aprobado',
            actor: 'webhook',
          },
          {
            order_id: order.id,
            store_id: store.id,
            tipo: 'estado_pedido',
            de: 'pendiente',
            a: 'confirmado',
            actor: 'webhook',
          },
        ])
      ).catch((e: unknown) => console.error('Error registrando order_events de pago aprobado:', e))

      sendOrderPaidNotification({ store, order }).catch((e) =>
        console.error('Error enviando email de orden pagada:', e)
      )

      // Automatización Logística Post-Pago (Fase 5): emisión de envío sin demorar la respuesta de MP
      handlePostPaymentShipping(order.id, store).catch((e) =>
        console.error('Error en post-payment shipping automation:', e)
      )
    }

    return finalizeEvent({
      status: rpcResult?.status || 'aprobado',
      httpStatus: 200,
      data: rpcResult,
    })
  }

  if (payment.status === 'rejected' || payment.status === 'cancelled') {
    // Transición atómica condicional: solo si está en pendiente o rechazado
    await supabaseAdmin
      .from('orders')
      .update({
        estado_pago: 'rechazado',
        mp_payment_id: String(paymentId),
        updated_at: nowIso,
      })
      .eq('id', order.id)
      .in('estado_pago', ['pendiente', 'rechazado'])

    return finalizeEvent({ status: 'rechazado_procesado', httpStatus: 200 })
  }

  if (payment.status === 'pending' || payment.status === 'in_process') {
    await supabaseAdmin
      .from('orders')
      .update({
        estado_pago: 'pendiente',
        mp_payment_id: String(paymentId),
        updated_at: nowIso,
      })
      .eq('id', order.id)
      .in('estado_pago', ['pendiente', 'rechazado'])

    return finalizeEvent({ status: 'pendiente_procesado', httpStatus: 200 })
  }

  if (payment.status === 'refunded' || payment.status === 'charged_back') {
    const isMatchingPayment = String(order.mp_payment_id) === String(paymentId)
    const isApprovedOrder = order.estado_pago === 'aprobado'

    if (isMatchingPayment && isApprovedOrder) {
      const targetState = payment.status === 'refunded' ? 'reembolsado' : 'contracargo'
      const refundNote = `Pago ${payment.status === 'refunded' ? 'reembolsado' : 'con contracargo'} en Mercado Pago el ${nowIso}. TODO: El comerciante debe determinar si reponer el stock manualmente.`

      await supabaseAdmin
        .from('orders')
        .update({
          estado_pago: targetState,
          observaciones_admin: order.observaciones_admin ? `${order.observaciones_admin}\n${refundNote}` : refundNote,
          updated_at: nowIso,
        })
        .eq('id', order.id)

      await notifyPlatformAlert({
        type: payment.status === 'refunded' ? 'reembolsado' : 'contracargo',
        store,
        order,
        details: `El pago ${paymentId} del pedido ${order.id} fue ${payment.status === 'refunded' ? 'reembolsado' : 'objeto de un contracargo'}.`,
        paymentId,
      })

      return finalizeEvent({ status: `${targetState}_procesado`, httpStatus: 200 })
    }

    return finalizeEvent({ status: 'refund_ignored_not_matching_or_not_approved', httpStatus: 200 })
  }

  return finalizeEvent({ status: `ignored_status_${payment.status}`, httpStatus: 200 })
}
