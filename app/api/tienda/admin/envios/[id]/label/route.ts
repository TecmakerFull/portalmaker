// =============================================================================
// PORTALMAKER — Descarga Segura de Etiquetas de Envío (Bucket Privado)
// Endpoint: GET /api/tienda/admin/envios/[id]/label
// Autenticación: Requiere sesión de Store Admin o Superadmin.
// Entrega URL firmada de corta vida (15 min) para evitar exponer el storage.
// =============================================================================

import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { isStoreAdmin } from '@/lib/tenant'
import { getStoreShippingProvider } from '@/lib/shipping/registry'

export const maxDuration = 30

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shipmentId } = await props.params

    if (!shipmentId) {
      return NextResponse.json({ error: 'ID de envío requerido' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // 1. Obtener datos del shipment y de la tienda
    const { data: shipment, error: shipErr } = await supabaseAdmin
      .from('shipments')
      .select('*, stores(*)')
      .eq('id', shipmentId)
      .maybeSingle()

    if (shipErr || !shipment || !shipment.stores) {
      return NextResponse.json({ error: 'Envío no encontrado' }, { status: 404 })
    }

    // 2. Verificar que el usuario tenga permisos de administración sobre la tienda
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const hasAccess = await isStoreAdmin(shipment.stores)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Acceso denegado a este envío' }, { status: 403 })
    }

    // 3. Si ya existe un archivo en el bucket privado, generar URL firmada
    if (shipment.label_path) {
      const { data: signedData, error: signErr } = await supabaseAdmin.storage
        .from('shipping-labels')
        .createSignedUrl(shipment.label_path, 900) // 15 minutos

      if (!signErr && signedData?.signedUrl) {
        return NextResponse.redirect(signedData.signedUrl)
      }
    }

    // 4. Si aún no está guardado, intentar recuperarlo del carrier bajo demanda
    if (shipment.provider_shipment_id && shipment.provider !== 'manual') {
      const carrier = await getStoreShippingProvider(shipment.store_id, shipment.provider)

      if (carrier && carrier.getLabel) {
        try {
          const labelRes = await carrier.getLabel(shipment.provider_shipment_id)
          let pdfBuffer: ArrayBuffer | null = labelRes.pdf || null

          if (!pdfBuffer && labelRes.url) {
            const downloadRes = await fetch(labelRes.url)
            if (downloadRes.ok) {
              pdfBuffer = await downloadRes.arrayBuffer()
            }
          }

          if (pdfBuffer) {
            const filePath = `${shipment.store_id}/${shipment.id}.pdf`
            const { error: uploadErr } = await supabaseAdmin.storage
              .from('shipping-labels')
              .upload(filePath, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: true,
              })

            if (!uploadErr) {
              await supabaseAdmin
                .from('shipments')
                .update({
                  label_path: filePath,
                  estado: shipment.estado === 'creado' ? 'etiquetado' : shipment.estado,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', shipment.id)

              const { data: newSigned } = await supabaseAdmin.storage
                .from('shipping-labels')
                .createSignedUrl(filePath, 900)

              if (newSigned?.signedUrl) {
                return NextResponse.redirect(newSigned.signedUrl)
              }
            }
          }
        } catch (fetchErr) {
          console.error('Error recuperando etiqueta del carrier:', fetchErr)
        }
      }
    }

    return NextResponse.json(
      { error: 'La etiqueta no está disponible para este tipo de envío o aún no fue emitida por el transportista.' },
      { status: 404 }
    )
  } catch (err: any) {
    console.error('Error procesando descarga de etiqueta:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
