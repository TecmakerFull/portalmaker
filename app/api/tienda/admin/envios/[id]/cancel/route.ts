// =============================================================================
// PORTALMAKER — Cancelación Manual de Envío (Panel Admin)
// Endpoint: POST /api/tienda/admin/envios/[id]/cancel
// =============================================================================

import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { isStoreAdmin } from '@/lib/tenant'
import { getStoreShippingProvider } from '@/lib/shipping/registry'

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

    // 1. Obtener envío y tienda
    const { data: shipment, error: shipErr } = await supabaseAdmin
      .from('shipments')
      .select('*, stores(*)')
      .eq('id', shipmentId)
      .maybeSingle()

    if (shipErr || !shipment || !shipment.stores) {
      return NextResponse.json({ error: 'Envío no encontrado' }, { status: 404 })
    }

    const store = shipment.stores

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

    // 3. Validar que no esté en tránsito o entregado
    if (['despachado', 'en_camino', 'entregado'].includes(shipment.estado)) {
      return NextResponse.json(
        { error: `No se puede cancelar un paquete que ya se encuentra '${shipment.estado}'.` },
        { status: 400 }
      )
    }

    if (shipment.estado === 'cancelado') {
      return NextResponse.json({ message: 'El envío ya fue cancelado previamente.' }, { status: 200 })
    }

    // 4. Si tiene ID en el carrier y el carrier soporta cancelación, notificar
    if (shipment.provider_shipment_id && shipment.provider !== 'manual') {
      const carrier = await getStoreShippingProvider(store.id, shipment.provider)
      if (carrier && carrier.cancelShipment) {
        try {
          await carrier.cancelShipment(shipment.provider_shipment_id)
        } catch (cErr: any) {
          console.warn('Advertencia al cancelar en carrier externo:', cErr)
        }
      }
    }

    // 5. Marcar como cancelado
    await supabaseAdmin
      .from('shipments')
      .update({
        estado: 'cancelado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipment.id)

    await supabaseAdmin.from('shipment_events').insert({
      shipment_id: shipment.id,
      store_id: store.id,
      estado: 'cancelado',
      descripcion: 'Envío cancelado manualmente por el administrador de la tienda.',
      source: 'manual',
    })

    await supabaseAdmin.from('order_events').insert({
      order_id: shipment.order_id,
      store_id: store.id,
      tipo: 'envio',
      de: shipment.estado,
      a: 'cancelado',
      actor: user.email || 'admin',
    })

    return NextResponse.json({
      success: true,
      message: 'Envío cancelado correctamente.',
    })
  } catch (err: any) {
    console.error('Error cancelando envío:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
