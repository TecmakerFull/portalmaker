// =============================================================================
// PORTALMAKER — Automatización Logística Post-Pago (Fase 5)
// Orquesta la creación idempotente del envío, descarga y almacenamiento de
// etiquetas en el bucket privado 'shipping-labels', registro de eventos y emails.
// =============================================================================

import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getStoreShippingProvider } from './registry'
import {
  sendBuyerOrderConfirmationEmail,
  sendBuyerOrderDispatchedEmail,
} from './emails'
import { notifyPlatformAlert } from '@/lib/email-notifications'
import type { Store, Order } from '@/types/database'
import type { ShipmentInput } from './types'

/**
 * Espera pasiva para reintentos en línea
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface PostPaymentShippingResult {
  ok: boolean
  skipped?: boolean
  shipmentId?: string
  status?: string
  error?: string
}

/**
 * Orquesta la creación del envío tras la confirmación de pago de Mercado Pago.
 * Se garantiza idempotencia estricta mediante shipments_one_active_per_order
 * e idempotency_key = 'order:<id>:1'.
 */
export async function handlePostPaymentShipping(
  orderId: string,
  store: Store
): Promise<PostPaymentShippingResult> {
  const supabaseAdmin = createSupabaseAdminClient()

  // 1. Obtener la orden completa con sus datos de envío
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()

  if (orderErr || !order) {
    console.error(`Post-Payment Shipping: No se encontró la orden ${orderId}`, orderErr)
    return { ok: false, error: 'Orden no encontrada' }
  }

  // 2. Manejo de Retiro en Local
  if (order.envio_tipo === 'retiro_local') {
    // Registrar evento en order_events
    await supabaseAdmin.from('order_events').insert({
      order_id: order.id,
      store_id: store.id,
      tipo: 'envio',
      de: null,
      a: 'retiro_local',
      actor: 'system',
    })

    // Despachar email al comprador con instrucciones del retiro
    sendBuyerOrderConfirmationEmail({ store, order }).catch((err) =>
      console.error('Error enviando email de confirmación retiro en local:', err)
    )

    return { ok: true, skipped: true, status: 'retiro_local' }
  }

  // 3. Si no tiene costo de envío ni datos de carrier (pedido sin envío físico)
  const costoEnvio = Number(order.costo_envio) || 0
  const providerName = order.envio_proveedor || (costoEnvio > 0 ? 'manual' : null)

  if (!providerName && costoEnvio <= 0) {
    // No requiere envío físico
    sendBuyerOrderConfirmationEmail({ store, order }).catch((err) =>
      console.error('Error enviando email de confirmación de pedido:', err)
    )
    return { ok: true, skipped: true, status: 'sin_envio' }
  }

  // 4. Garantía de Idempotencia: Verificar si ya existe un envío activo para este pedido
  const { data: existingShipment } = await supabaseAdmin
    .from('shipments')
    .select('id, estado, idempotency_key, tracking_number')
    .eq('order_id', order.id)
    .neq('estado', 'cancelado')
    .maybeSingle()

  if (existingShipment) {
    console.warn(
      `Post-Payment Shipping: Envío ya existente para orden ${order.id} (ID: ${existingShipment.id}, estado: ${existingShipment.estado}). Omitiendo creación duplicada.`
    )
    return { ok: true, shipmentId: existingShipment.id, status: existingShipment.estado }
  }

  const idempotencyKey = `order:${order.id}:1`

  // 5. Crear registro inicial en shipments con estado 'pendiente'
  const { data: newShipment, error: insertErr } = await supabaseAdmin
    .from('shipments')
    .insert({
      order_id: order.id,
      store_id: store.id,
      provider: providerName || 'manual',
      service_code: order.envio_servicio || null,
      modalidad: order.envio_modalidad || 'domicilio',
      sucursal: order.envio_sucursal || null,
      costo_cotizado: costoEnvio,
      estado: 'pendiente',
      idempotency_key: idempotencyKey,
      attempts: 0,
    })
    .select('id')
    .single()

  if (insertErr || !newShipment) {
    console.error(`Post-Payment Shipping: Error creando registro en shipments para orden ${order.id}:`, insertErr)
    return { ok: false, error: insertErr?.message || 'Error al registrar shipment' }
  }

  const shipmentId = newShipment.id

  // 6. Si el proveedor es 'manual' (envío por zonas coordinado por el vendedor)
  if (providerName === 'manual') {
    await supabaseAdmin
      .from('shipments')
      .update({
        estado: 'creado',
        costo_real: costoEnvio,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipmentId)

    await supabaseAdmin.from('shipment_events').insert({
      shipment_id: shipmentId,
      store_id: store.id,
      estado: 'creado',
      descripcion: 'Envío registrado para despacho manual por la tienda.',
      source: 'system',
    })

    await supabaseAdmin.from('order_events').insert({
      order_id: order.id,
      store_id: store.id,
      tipo: 'envio',
      de: 'pendiente',
      a: 'creado',
      actor: 'system',
    })

    sendBuyerOrderConfirmationEmail({ store, order }).catch((err) =>
      console.error('Error enviando email confirmación envío manual:', err)
    )

    return { ok: true, shipmentId, status: 'creado' }
  }

  // 7. Proveedor Integrado (Zipnova u otro carrier)
  const carrier = await getStoreShippingProvider(store.id, providerName)
  if (!carrier) {
    const errorMsg = `Proveedor logístico ${providerName} no configurado o sin credenciales válidas en tienda ${store.id}`
    console.error(errorMsg)

    await supabaseAdmin
      .from('shipments')
      .update({
        estado: 'error',
        error_message: errorMsg,
        attempts: 1,
        next_retry_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipmentId)

    await notifyPlatformAlert({
      type: 'shipping_carrier_error',
      store,
      order,
      details: errorMsg,
    })

    return { ok: false, shipmentId, error: errorMsg }
  }

  // Construir ShipmentInput normalizado
  const dir = (order.envio_direccion as any) || {}
  const items = Array.isArray(order.items) ? order.items : []
  const pesoTotalKg = items.reduce(
    (acc: number, it: any) => acc + (Number(it.peso_kg) || 0.25) * (Number(it.cantidad) || 1),
    0
  )
  const valorDeclaradoTotal = Number(order.total) || 0

  const shipmentInput: ShipmentInput = {
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
    valorDeclaradoTotal,
  }

  // 8. Reintentos lineales en línea (0s, 15s, 60s)
  const retryDelays = [0, 15000, 60000]
  let creationResult: any = null
  let lastError: any = null

  for (let attempt = 0; attempt < retryDelays.length; attempt++) {
    if (retryDelays[attempt] > 0) {
      await sleep(retryDelays[attempt])
    }

    try {
      // Marcar estado 'creando'
      await supabaseAdmin
        .from('shipments')
        .update({
          estado: 'creando',
          attempts: attempt + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shipmentId)

      creationResult = await carrier.createShipment(shipmentInput)
      break // Éxito
    } catch (err: any) {
      lastError = err
      console.warn(
        `Post-Payment Shipping: Intento ${attempt + 1}/${retryDelays.length} fallido para orden ${order.id}:`,
        err?.message || err
      )
    }
  }

  // 9. Si todos los intentos fallaron
  if (!creationResult) {
    const errorMsg = lastError?.message || 'Fallo de emisión en carrier tras 3 intentos'
    const nextRetry = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    await supabaseAdmin
      .from('shipments')
      .update({
        estado: 'error',
        error_message: errorMsg,
        attempts: 3,
        next_retry_at: nextRetry,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipmentId)

    await supabaseAdmin.from('shipment_events').insert({
      shipment_id: shipmentId,
      store_id: store.id,
      estado: 'error',
      descripcion: `Error al emitir envío en ${providerName}: ${errorMsg}`,
      source: 'system',
    })

    await notifyPlatformAlert({
      type: 'shipping_carrier_error',
      store,
      order,
      details: `Fallo al generar envío en ${providerName} para el pedido #${order.id.slice(0, 8)}. Detalle: ${errorMsg}. El cron reintentará a las ${nextRetry}.`,
    })

    return { ok: false, shipmentId, error: errorMsg }
  }

  // 10. Creación exitosa: Guardar etiqueta en el bucket privado si está disponible
  let savedLabelPath: string | null = null

  try {
    if (carrier.getLabel && creationResult.providerShipmentId) {
      const labelRes = await carrier.getLabel(creationResult.providerShipmentId)
      let pdfBuffer: ArrayBuffer | null = labelRes.pdf || null

      if (!pdfBuffer && labelRes.url) {
        // Descargar el PDF desde la URL provista por el carrier
        const downloadRes = await fetch(labelRes.url)
        if (downloadRes.ok) {
          pdfBuffer = await downloadRes.arrayBuffer()
        }
      }

      if (pdfBuffer) {
        const filePath = `${store.id}/${shipmentId}.pdf`
        const { error: uploadErr } = await supabaseAdmin.storage
          .from('shipping-labels')
          .upload(filePath, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true,
          })

        if (!uploadErr) {
          savedLabelPath = filePath
        } else {
          console.error('Error subiendo etiqueta a storage shipping-labels:', uploadErr)
        }
      }
    }
  } catch (labelErr) {
    console.error('Error procesando descarga de etiqueta de envío:', labelErr)
  }

  // 11. Actualizar shipment a 'creado' (o 'etiquetado' si tiene etiqueta guardada)
  const finalState = savedLabelPath ? 'etiquetado' : 'creado'
  await supabaseAdmin
    .from('shipments')
    .update({
      estado: finalState,
      provider_shipment_id: creationResult.providerShipmentId,
      tracking_number: creationResult.tracking || null,
      tracking_url: creationResult.trackingUrl || null,
      costo_real: creationResult.costoReal || null,
      label_path: savedLabelPath,
      raw: {
        id: creationResult.providerShipmentId,
        tracking: creationResult.tracking,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', shipmentId)

  // 12. Registrar eventos de trazabilidad
  await supabaseAdmin.from('shipment_events').insert({
    shipment_id: shipmentId,
    store_id: store.id,
    estado: finalState,
    descripcion: `Envío emitido en ${providerName}. Tracking: ${creationResult.tracking || 'Generado'}`,
    source: 'system',
  })

  await supabaseAdmin.from('order_events').insert({
    order_id: order.id,
    store_id: store.id,
    tipo: 'envio',
    de: 'pendiente',
    a: finalState,
    actor: 'system',
  })

  // 13. Despachar emails
  sendBuyerOrderConfirmationEmail({
    store,
    order,
    trackingNumber: creationResult.tracking,
    trackingUrl: creationResult.trackingUrl,
  }).catch((err) => console.error('Error enviando email confirmación pedido con envío:', err))

  if (creationResult.tracking) {
    sendBuyerOrderDispatchedEmail({
      store,
      order,
      trackingNumber: creationResult.tracking,
      trackingUrl: creationResult.trackingUrl,
      providerName: providerName.toUpperCase(),
    }).catch((err) => console.error('Error enviando email de despacho:', err))
  }

  return { ok: true, shipmentId, status: finalState }
}
