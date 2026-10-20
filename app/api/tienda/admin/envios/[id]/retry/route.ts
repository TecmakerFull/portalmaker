// =============================================================================
// PORTALMAKER — Reintento Manual de Emisión de Envío (Panel Admin)
// Endpoint: POST /api/tienda/admin/envios/[id]/retry
// =============================================================================

import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { isStoreAdmin } from '@/lib/tenant'
import { getStoreShippingProvider } from '@/lib/shipping/registry'
import type { ShipmentInput } from '@/lib/shipping/types'

export const maxDuration = 30

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shipmentId } = await props.params

    if (!shipmentId) {
      return NextResponse.json({ error: 'ID de envío requerido' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // 1. Obtener envío, tienda y pedido
    const { data: shipment, error: shipErr } = await supabaseAdmin
      .from('shipments')
      .select('*, stores(*), orders(*)')
      .eq('id', shipmentId)
      .maybeSingle()

    if (shipErr || !shipment || !shipment.stores || !shipment.orders) {
      return NextResponse.json({ error: 'Envío no encontrado' }, { status: 404 })
    }

    const store = shipment.stores
    const order = shipment.orders

    // 2. Verificar permisos de admin
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const hasAccess = await isStoreAdmin(store)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // 3. Validar estado reintentable
    if (!['error', 'pendiente'].includes(shipment.estado)) {
      return NextResponse.json(
        { error: `El envío se encuentra en estado '${shipment.estado}' y no requiere reintento.` },
        { status: 400 }
      )
    }

    // 4. Instanciar carrier
    const carrier = await getStoreShippingProvider(store.id, shipment.provider)
    if (!carrier) {
      return NextResponse.json(
        { error: `El proveedor ${shipment.provider} no está configurado o verificado en la tienda.` },
        { status: 400 }
      )
    }

    // 5. Preparar datos del envío
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

    // 6. Intentar emisión
    try {
      const creation = await carrier.createShipment(input)

      // Guardar etiqueta si está disponible
      let savedLabelPath: string | null = null
      if (carrier.getLabel && creation.providerShipmentId) {
        try {
          const labelRes = await carrier.getLabel(creation.providerShipmentId)
          let pdfBuffer: ArrayBuffer | null = labelRes.pdf || null
          if (!pdfBuffer && labelRes.url) {
            const downloadRes = await fetch(labelRes.url)
            if (downloadRes.ok) pdfBuffer = await downloadRes.arrayBuffer()
          }
          if (pdfBuffer) {
            const filePath = `${store.id}/${shipment.id}.pdf`
            await supabaseAdmin.storage
              .from('shipping-labels')
              .upload(filePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })
            savedLabelPath = filePath
          }
        } catch (lErr) {
          console.warn('Error recuperando etiqueta en reintento manual:', lErr)
        }
      }

      const finalState = savedLabelPath ? 'etiquetado' : 'creado'

      await supabaseAdmin
        .from('shipments')
        .update({
          estado: finalState,
          provider_shipment_id: creation.providerShipmentId,
          tracking_number: creation.tracking || null,
          tracking_url: creation.trackingUrl || null,
          costo_real: creation.costoReal || null,
          label_path: savedLabelPath || shipment.label_path,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shipment.id)

      await supabaseAdmin.from('shipment_events').insert({
        shipment_id: shipment.id,
        store_id: store.id,
        estado: finalState,
        descripcion: `Envío reintentado manualmente desde el panel y generado con éxito. Tracking: ${creation.tracking || 'Generado'}`,
        source: 'manual',
      })

      await supabaseAdmin.from('order_events').insert({
        order_id: order.id,
        store_id: store.id,
        tipo: 'envio',
        de: shipment.estado,
        a: finalState,
        actor: user.email || 'admin',
      })

      return NextResponse.json({
        success: true,
        estado: finalState,
        tracking: creation.tracking,
      })
    } catch (err: any) {
      await supabaseAdmin
        .from('shipments')
        .update({
          attempts: Number(shipment.attempts || 0) + 1,
          error_message: err?.message || 'Error en reintento manual',
          updated_at: new Date().toISOString(),
        })
        .eq('id', shipment.id)

      return NextResponse.json(
        { error: err?.message || 'El transportista rechazó el reintento del envío.' },
        { status: 502 }
      )
    }
  } catch (err: any) {
    console.error('Error reintentando envío:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
