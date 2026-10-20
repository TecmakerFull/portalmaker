// =============================================================================
// PORTALMAKER — Webhook Oficial de Eventos de Logística Zipnova (Fase 5)
// Endpoint: POST /api/webhooks/zipnova
// Manejo idempotente de cambios de estado, trazabilidad y notificación de entrega.
// =============================================================================

import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { sendBuyerOrderDeliveredEmail } from '@/lib/shipping/emails'

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const secretParam = searchParams.get('secret') || req.headers.get('x-webhook-secret')
    const configuredSecret = process.env.ZIPNOVA_WEBHOOK_SECRET

    // 1. Validar autenticidad del webhook
    if (configuredSecret) {
      if (secretParam !== configuredSecret) {
        return NextResponse.json({ error: 'Firma o secreto inválido' }, { status: 401 })
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.warn('ZIPNOVA_WEBHOOK_SECRET no configurado en producción.')
    }

    const payload = await req.json().catch(() => null)
    if (!payload) {
      return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 })
    }

    // Estructura habitual de Zipnova:
    // { event_id: '...', shipment_id: '...', status: 'in_transit' | 'delivered' | ..., date: '...', description: '...' }
    const eventId = String(payload.event_id || payload.id || '')
    const providerShipmentId = String(payload.shipment_id || payload.provider_shipment_id || payload.data?.id || '')
    const rawStatus = String(payload.status || payload.data?.status || '').toLowerCase()
    const description = payload.description || payload.message || payload.status || 'Actualización de logística'
    const ocurridoAt = payload.date || payload.created_at || new Date().toISOString()

    if (!providerShipmentId) {
      return NextResponse.json({ error: 'shipment_id requerido' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // 2. Localizar el shipment asociado
    const { data: shipment, error: shipErr } = await supabaseAdmin
      .from('shipments')
      .select('*, stores(*), orders(*)')
      .eq('provider_shipment_id', providerShipmentId)
      .maybeSingle()

    if (shipErr || !shipment) {
      console.warn(`Webhook Zipnova: No se encontró shipment con provider_shipment_id ${providerShipmentId}`)
      return NextResponse.json({ status: 'shipment_not_found' }, { status: 200 })
    }

    // 3. Garantía de Idempotencia: Verificar si el evento ya fue procesado
    const uniqueEventId = eventId || `${providerShipmentId}:${rawStatus}:${ocurridoAt}`
    const { data: existingEvent } = await supabaseAdmin
      .from('shipment_events')
      .select('id')
      .eq('shipment_id', shipment.id)
      .eq('provider_event_id', uniqueEventId)
      .maybeSingle()

    if (existingEvent) {
      return NextResponse.json({ status: 'already_processed', eventId: uniqueEventId }, { status: 200 })
    }

    // 4. Mapear estado al enum del schema:
    // ('pendiente','creando','creado','etiquetado','despachado','en_camino','entregado','incidencia','cancelado','error')
    let mappedState = shipment.estado
    if (rawStatus.includes('delivered') || rawStatus.includes('entregado')) {
      mappedState = 'entregado'
    } else if (rawStatus.includes('transit') || rawStatus.includes('camino') || rawStatus.includes('despachado')) {
      mappedState = 'en_camino'
    } else if (rawStatus.includes('label') || rawStatus.includes('etiquetado')) {
      mappedState = 'etiquetado'
    } else if (rawStatus.includes('cancel')) {
      mappedState = 'cancelado'
    } else if (rawStatus.includes('issue') || rawStatus.includes('incident') || rawStatus.includes('fallido')) {
      mappedState = 'incidencia'
    }

    // 5. Actualizar el envío
    await supabaseAdmin
      .from('shipments')
      .update({
        estado: mappedState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipment.id)

    // 6. Registrar en shipment_events
    await supabaseAdmin.from('shipment_events').insert({
      shipment_id: shipment.id,
      store_id: shipment.store_id,
      provider_event_id: uniqueEventId,
      estado: mappedState,
      descripcion: description,
      ocurrido_at: new Date(ocurridoAt).toISOString(),
      source: 'webhook',
      raw: payload,
    })

    // 7. Si cambió a entregado, actualizar la orden y notificar al comprador
    if (mappedState === 'entregado' && shipment.estado !== 'entregado') {
      if (shipment.orders) {
        await supabaseAdmin
          .from('orders')
          .update({
            estado_pedido: 'entregado',
            updated_at: new Date().toISOString(),
          })
          .eq('id', shipment.orders.id)

        await supabaseAdmin.from('order_events').insert({
          order_id: shipment.orders.id,
          store_id: shipment.store_id,
          tipo: 'envio',
          de: shipment.estado,
          a: 'entregado',
          actor: 'webhook',
        })

        if (shipment.stores) {
          sendBuyerOrderDeliveredEmail({
            store: shipment.stores,
            order: shipment.orders,
          }).catch((err) => console.error('Error enviando email de pedido entregado vía webhook:', err))
        }
      }
    }

    return NextResponse.json({
      success: true,
      status: mappedState,
      eventId: uniqueEventId,
    })
  } catch (err: any) {
    console.error('Webhook Zipnova: Excepción no controlada:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
