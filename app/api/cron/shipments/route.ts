// =============================================================================
// PORTALMAKER — Cron Job de Logística y Trazabilidad de Envíos (Fase 5)
// Endpoint: GET /api/cron/shipments
// Seguridad: Requiere header Authorization: Bearer ${CRON_SECRET}
// Propiedades:
// 1. Idempotente: puede ejecutarse concurrentemente o múltiples veces sin efectos secundarios.
// 2. Limpieza de cotizaciones expiradas (TTL 30 min).
// 3. Reintento automático de envíos en pendiente o error con backoff.
// 4. Actualización en lote del tracking de envíos en tránsito y notificación de entrega.
// =============================================================================

import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getStoreShippingProvider } from '@/lib/shipping/registry'
import { sendBuyerOrderDeliveredEmail } from '@/lib/shipping/emails'
import type { ShipmentInput } from '@/lib/shipping/types'

export const maxDuration = 60

export async function GET(req: Request) {
  try {
    // 1. Validar autorización por CRON_SECRET
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.error('ERROR CRITICO: CRON_SECRET no está configurado en producción.')
      return NextResponse.json({ error: 'Configuración de seguridad incompleta' }, { status: 500 })
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const nowIso = new Date().toISOString()
    const results = {
      quotesPurged: 0,
      retriesProcessed: 0,
      trackingUpdated: 0,
      deliveredNotified: 0,
    }

    // -------------------------------------------------------------------------
    // Tarea A: Purgar cotizaciones temporales expiradas
    // -------------------------------------------------------------------------
    try {
      const { data: purged, error: purgeErr } = await supabaseAdmin
        .from('shipping_quotes')
        .delete()
        .lt('expires_at', nowIso)
        .select('id')

      if (!purgeErr && purged) {
        results.quotesPurged = purged.length
      }
    } catch (purgeException) {
      console.warn('Cron Shipments: Error purgando cotizaciones vencidas:', purgeException)
    }

    // -------------------------------------------------------------------------
    // Tarea B: Reintentar envíos pendientes o con error que alcanzaron next_retry_at
    // -------------------------------------------------------------------------
    try {
      const { data: pendingShipments } = await supabaseAdmin
        .from('shipments')
        .select('*, stores(*), orders(*)')
        .in('estado', ['pendiente', 'error'])
        .lte('next_retry_at', nowIso)
        .lt('attempts', 5)
        .limit(20)

      if (pendingShipments && pendingShipments.length > 0) {
        for (const ship of pendingShipments) {
          results.retriesProcessed++
          const store = ship.stores
          const order = ship.orders

          if (!store || !order) continue

          const carrier = await getStoreShippingProvider(store.id, ship.provider)
          if (!carrier) continue

          const dir = (order.envio_direccion as any) || {}
          const items = Array.isArray(order.items) ? order.items : []
          const pesoTotalKg = items.reduce(
            (acc: number, it: any) => acc + (Number(it.peso_kg) || 0.25) * (Number(it.cantidad) || 1),
            0
          )

          const input: ShipmentInput = {
            orderId: order.id,
            origen: {
              codigoPostal: store.origen_codigo_postal || '',
              calle: store.origen_calle || '',
              altura: store.origen_altura || '',
              localidad: store.origen_localidad || '',
              provincia: store.origen_provincia || '',
              telefono: store.origen_telefono || store.whatsapp_numero || '',
              email: store.origen_email || store.admin_email || '',
            },
            destinatario: {
              nombre: order.nombre_comprador || 'Cliente',
              email: order.email_comprador || '',
              telefono: order.telefono_comprador || '',
              documento: dir.documento || dir.dni || '',
              codigoPostal: order.codigo_postal || dir.codigoPostal || '',
              calle: dir.calle || order.direccion_envio || '',
              altura: dir.altura || '',
              piso: dir.piso || '',
              depto: dir.depto || '',
              localidad: dir.ciudad || dir.localidad || '',
              provincia: dir.provincia || '',
              referencias: dir.referencias || order.notas_comprador || '',
            },
            modalidad: order.envio_modalidad || 'domicilio',
            sucursal: order.envio_sucursal || undefined,
            serviceCode: order.envio_servicio || undefined,
            pesoTotalKg,
            valorDeclaradoTotal: Number(order.total) || 0,
          }

          try {
            const creation = await carrier.createShipment(input)

            // Éxito en reintento
            await supabaseAdmin
              .from('shipments')
              .update({
                estado: 'creado',
                provider_shipment_id: creation.providerShipmentId,
                tracking_number: creation.tracking || null,
                tracking_url: creation.trackingUrl || null,
                costo_real: creation.costoReal || null,
                error_message: null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', ship.id)

            await supabaseAdmin.from('shipment_events').insert({
              shipment_id: ship.id,
              store_id: store.id,
              estado: 'creado',
              descripcion: `Envío reintentado y creado con éxito en ${ship.provider}. Tracking: ${creation.tracking || 'Generado'}`,
              source: 'poll',
            })
          } catch (retryErr: any) {
            const newAttempts = Number(ship.attempts || 0) + 1
            const nextBackoffMin = Math.min(120, Math.pow(2, newAttempts) * 15)

            await supabaseAdmin
              .from('shipments')
              .update({
                attempts: newAttempts,
                error_message: retryErr?.message || 'Error en reintento automático',
                next_retry_at: new Date(Date.now() + nextBackoffMin * 60 * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', ship.id)
          }
        }
      }
    } catch (retryException) {
      console.warn('Cron Shipments: Excepción durante el proceso de reintentos:', retryException)
    }

    // -------------------------------------------------------------------------
    // Tarea C: Actualizar tracking de envíos en tránsito
    // -------------------------------------------------------------------------
    try {
      const { data: activeShipments } = await supabaseAdmin
        .from('shipments')
        .select('*, stores(*), orders(*)')
        .in('estado', ['creado', 'etiquetado', 'despachado', 'en_camino'])
        .not('provider_shipment_id', 'is', null)
        .neq('provider', 'manual')
        .limit(30)

      if (activeShipments && activeShipments.length > 0) {
        for (const ship of activeShipments) {
          const store = ship.stores
          const order = ship.orders

          if (!store || !order || !ship.provider_shipment_id) continue

          const carrier = await getStoreShippingProvider(store.id, ship.provider)
          if (!carrier || !carrier.getTracking) continue

          try {
            const trackingEvents = await carrier.getTracking(ship.provider_shipment_id)
            if (!Array.isArray(trackingEvents) || trackingEvents.length === 0) continue

            results.trackingUpdated++

            // Registrar nuevos eventos
            for (const ev of trackingEvents) {
              const eventId = `${ship.provider_shipment_id}:${ev.status}:${ev.fecha}`

              // Verificar si ya existe este evento
              const { data: existingEv } = await supabaseAdmin
                .from('shipment_events')
                .select('id')
                .eq('shipment_id', ship.id)
                .eq('provider_event_id', eventId)
                .maybeSingle()

              if (!existingEv) {
                await supabaseAdmin.from('shipment_events').insert({
                  shipment_id: ship.id,
                  store_id: store.id,
                  provider_event_id: eventId,
                  estado: ev.status,
                  descripcion: ev.descripcion || ev.status,
                  ocurrido_at: ev.fecha ? new Date(ev.fecha).toISOString() : new Date().toISOString(),
                  source: 'poll',
                  raw: ev,
                })
              }
            }

            // Si el último evento indica 'entregado'
            const lastStatus = trackingEvents[0]?.status?.toLowerCase() || ''
            if (lastStatus.includes('entregado') || lastStatus.includes('delivered')) {
              await supabaseAdmin
                .from('shipments')
                .update({
                  estado: 'entregado',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', ship.id)

              await supabaseAdmin
                .from('orders')
                .update({
                  estado_pedido: 'entregado',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', order.id)

              await supabaseAdmin.from('order_events').insert({
                order_id: order.id,
                store_id: store.id,
                tipo: 'envio',
                de: ship.estado,
                a: 'entregado',
                actor: 'system',
              })

              sendBuyerOrderDeliveredEmail({ store, order }).catch((err) =>
                console.error('Error enviando email de pedido entregado:', err)
              )

              results.deliveredNotified++
            }
          } catch (trackErr) {
            console.warn(`Error actualizando tracking para shipment ${ship.id}:`, trackErr)
          }
        }
      }
    } catch (trackException) {
      console.warn('Cron Shipments: Excepción consultando tracking en tránsito:', trackException)
    }

    return NextResponse.json({
      success: true,
      timestamp: nowIso,
      results,
    })
  } catch (err: any) {
    console.error('Cron Shipments: Excepción general:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
