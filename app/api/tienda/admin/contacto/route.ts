// =============================================================================
// PORTALMAKER — Route Handler: Configuración de Contacto, Horarios y Ubicación
// Permite guardar cada sección de forma independiente y segura con el cliente admin.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import {
  isValidCodigoPostal,
  normalizeCodigoPostal,
  formatCuit,
  isValidCuit,
} from '@/lib/shipping-validators'
import { serializeHorarioPayload, type HorariosConfig } from '@/lib/horarios'

async function resolveStoreFromReq(req: NextRequest): Promise<any | null> {
  const tenant = await getTenantStore()
  if (tenant?.store) return tenant.store

  const tenantSlug = req.nextUrl.searchParams.get('tenant')
  if (tenantSlug) {
    const supabase = createSupabaseAdminClient()
    const { data: store } = await supabase
      .from('stores')
      .select('*')
      .eq('slug', tenantSlug)
      .maybeSingle()
    if (store) return store
  }

  return null
}

export async function POST(req: NextRequest) {
  const store = await resolveStoreFromReq(req)
  if (!store) {
    return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
  }

  const isAdmin = await isStoreAdmin(store)
  if (!isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { section } = body
    const supabase = createSupabaseAdminClient()

    let updateFields: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (section === 'canales') {
      const { whatsapp, emailContacto } = body
      updateFields = {
        ...updateFields,
        whatsapp_numero: whatsapp?.trim() || null,
        email_contacto: emailContacto?.trim() || null,
      }
    } else if (section === 'horarios') {
      const { horariosConfig } = body as { horariosConfig: HorariosConfig }
      if (!horariosConfig) {
        return NextResponse.json({ error: 'Configuración de horarios requerida' }, { status: 400 })
      }

      const { payloadCompleto } = serializeHorarioPayload(horariosConfig)
      updateFields = {
        ...updateFields,
        horario_atencion: payloadCompleto,
      }

      // Intentar actualizar también columnas dedicadas
      try {
        const { error: fullErr } = await supabase
          .from('stores')
          .update({
            ...updateFields,
            mostrar_horarios: horariosConfig.mostrar,
            horarios_semanales: horariosConfig.dias,
          })
          .eq('id', store.id)

        if (!fullErr) {
          return NextResponse.json({ ok: true, message: 'Horarios guardados correctamente' })
        }
      } catch {
        // Continuar con fallback sin columnas dedicadas
      }
    } else if (section === 'ubicacion') {
      const {
        calle,
        altura,
        pisoDepto,
        localidad,
        provincia,
        codigoPostal,
        cuit,
        razonSocial,
        googleMapsEmbedUrl,
      } = body

      if (codigoPostal?.trim() && !isValidCodigoPostal(codigoPostal)) {
        return NextResponse.json(
          { error: 'Código postal inválido. Usá 4 dígitos o CPA.' },
          { status: 400 }
        )
      }

      if (cuit?.trim() && !isValidCuit(cuit)) {
        return NextResponse.json(
          { error: 'CUIT inválido. Revisá los 11 dígitos verificadores.' },
          { status: 400 }
        )
      }

      const partesDireccion = [
        [calle?.trim(), altura?.trim(), pisoDepto?.trim()].filter(Boolean).join(' '),
        localidad?.trim(),
        provincia?.trim(),
      ].filter(Boolean)

      const direccionPublicaGenerada =
        partesDireccion.length > 0 ? partesDireccion.join(', ') : null

      updateFields = {
        ...updateFields,
        direccion: direccionPublicaGenerada || store.direccion || null,
        google_maps_embed_url: googleMapsEmbedUrl?.trim() || null,
        origen_calle: calle?.trim() || null,
        origen_altura: altura?.trim() || null,
        origen_piso_depto: pisoDepto?.trim() || null,
        origen_localidad: localidad?.trim() || null,
        origen_provincia: provincia || null,
        origen_codigo_postal: codigoPostal?.trim() ? normalizeCodigoPostal(codigoPostal) : null,
        origen_cuit: cuit?.trim() ? formatCuit(cuit) : null,
        origen_razon_social: razonSocial?.trim() || null,
      }
    } else if (section === 'redes') {
      const { instagramUrl, facebookUrl, tiktokUrl } = body
      updateFields = {
        ...updateFields,
        instagram_url: instagramUrl?.trim() || null,
        facebook_url: facebookUrl?.trim() || null,
        tiktok_url: tiktokUrl?.trim() || null,
      }
    } else {
      return NextResponse.json({ error: 'Sección no reconocida' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('stores')
      .update(updateFields)
      .eq('id', store.id)

    if (updateError) {
      console.error('Error al actualizar stores:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: 'Datos guardados correctamente' })
  } catch (err: unknown) {
    console.error('Error en POST /api/tienda/admin/contacto:', err)
    return NextResponse.json(
      { error: (err as Error)?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
