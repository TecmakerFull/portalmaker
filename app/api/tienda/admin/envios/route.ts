// =============================================================================
// PORTALMAKER — Route Handler: Configuración de Envíos (Fase 3)
// POST: Guarda y cifra credenciales de carriers (Zipnova, etc.) y parámetros generales.
// GET: Retorna estado de configuración (sin exponer credenciales sensibles).
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { encryptCarrierCredentials } from '@/lib/shipping/crypto'
import { ZipnovaShippingProvider } from '@/lib/shipping/zipnova'

export async function GET(_req: NextRequest) {
  const tenant = await getTenantStore()
  if (!tenant) {
    return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
  }

  const { store } = tenant
  const isAdmin = await isStoreAdmin(store)
  if (!isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = createSupabaseAdminClient()

  // Consultar proveedores configurados
  const { data: providers } = await supabase
    .from('store_shipping_providers')
    .select('provider, activo, status, last_verified_at, created_at')
    .eq('store_id', store.id)

  const zipnova = providers?.find((p) => p.provider === 'zipnova')
  const manual = providers?.find((p) => p.provider === 'manual')

  return NextResponse.json({
    storeSettings: {
      envios_activo: store.envios_activo ?? false,
      envio_gratis_desde: store.envio_gratis_desde ?? null,
      envio_markup_porcentaje: store.envio_markup_porcentaje ?? 0,
      envio_tarifa_fallback: store.envio_tarifa_fallback ?? null,
      envio_retiro_local_activo: store.envio_retiro_local_activo ?? true,
      envio_comision_incluye_envio: store.envio_comision_incluye_envio ?? false,
      origen_completo: Boolean(
        store.origen_calle &&
          store.origen_altura &&
          store.origen_localidad &&
          store.origen_provincia &&
          store.origen_codigo_postal
      ),
    },
    providers: {
      zipnova: {
        activo: zipnova?.activo ?? false,
        configurado: Boolean(zipnova),
        status: zipnova?.status ?? 'sin_verificar',
        last_verified_at: zipnova?.last_verified_at ?? null,
      },
      manual: {
        activo: manual?.activo ?? true,
        status: 'ok',
      },
    },
  })
}

export async function POST(req: NextRequest) {
  const tenant = await getTenantStore()
  if (!tenant) {
    return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
  }

  const { store } = tenant
  const isAdmin = await isStoreAdmin(store)
  if (!isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { action } = body

    const supabase = createSupabaseAdminClient()

    // 1. Guardar y verificar credenciales de Zipnova
    if (action === 'save_zipnova') {
      const { apiKey, secretKey, accountId, activo } = body

      if (!apiKey || !secretKey) {
        return NextResponse.json(
          { error: 'API Key y Secret Key son obligatorios' },
          { status: 400 }
        )
      }

      // Probar credenciales contra la API
      const provider = new ZipnovaShippingProvider({
        apiKey,
        secretKey,
        accountId,
      })

      const verifyResult = await provider.verifyCredentials()
      const newStatus = verifyResult.ok ? 'ok' : 'credenciales_invalidas'

      // Cifrar con AES-256-GCM
      const rawCredentialsJson = JSON.stringify({
        apiKey: apiKey.trim(),
        secretKey: secretKey.trim(),
        accountId: accountId?.trim() || '',
      })
      const credentialsEnc = encryptCarrierCredentials(rawCredentialsJson)

      const { error: upsertError } = await supabase
        .from('store_shipping_providers')
        .upsert(
          {
            store_id: store.id,
            provider: 'zipnova',
            activo: activo ?? true,
            credentials_enc: credentialsEnc,
            status: newStatus,
            last_verified_at: verifyResult.ok ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'store_id, provider' }
        )

      if (upsertError) throw upsertError

      return NextResponse.json({
        ok: verifyResult.ok,
        status: newStatus,
        error: verifyResult.error,
      })
    }

    // 2. Probar credenciales existentes de Zipnova
    if (action === 'verify_zipnova') {
      const { data: record } = await supabase
        .from('store_shipping_providers')
        .select('*')
        .eq('store_id', store.id)
        .eq('provider', 'zipnova')
        .single()

      if (!record || !record.credentials_enc) {
        return NextResponse.json(
          { error: 'No hay credenciales registradas para Zipnova' },
          { status: 400 }
        )
      }

      // Descifrar y validar
      const { decryptCarrierCredentials } = await import('@/lib/shipping/crypto')
      const creds = JSON.parse(decryptCarrierCredentials(record.credentials_enc))

      const provider = new ZipnovaShippingProvider(creds)
      const verifyResult = await provider.verifyCredentials()
      const newStatus = verifyResult.ok ? 'ok' : 'credenciales_invalidas'

      await supabase
        .from('store_shipping_providers')
        .update({
          status: newStatus,
          last_verified_at: verifyResult.ok ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.id)

      return NextResponse.json({
        ok: verifyResult.ok,
        status: newStatus,
        error: verifyResult.error,
      })
    }

    // 3. Toggle de proveedor manual
    if (action === 'toggle_manual') {
      const { activo } = body
      const { error } = await supabase
        .from('store_shipping_providers')
        .upsert(
          {
            store_id: store.id,
            provider: 'manual',
            activo: Boolean(activo),
            status: 'ok',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'store_id, provider' }
        )

      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // 4. Actualizar parámetros globales de envío de la tienda
    if (action === 'update_settings') {
      const {
        envio_gratis_desde,
        envio_markup_porcentaje,
        envio_tarifa_fallback,
        envio_retiro_local_activo,
        envio_comision_incluye_envio,
      } = body

      const { error } = await supabase
        .from('stores')
        .update({
          envio_gratis_desde: envio_gratis_desde !== '' && envio_gratis_desde !== null ? Number(envio_gratis_desde) : null,
          envio_markup_porcentaje: Number(envio_markup_porcentaje) || 0,
          envio_tarifa_fallback: envio_tarifa_fallback !== '' && envio_tarifa_fallback !== null ? Number(envio_tarifa_fallback) : null,
          envio_retiro_local_activo: Boolean(envio_retiro_local_activo),
          envio_comision_incluye_envio: Boolean(envio_comision_incluye_envio),
          updated_at: new Date().toISOString(),
        })
        .eq('id', store.id)

      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
  } catch (err: unknown) {
    console.error('Error en api/tienda/admin/envios:', err)
    return NextResponse.json(
      { error: (err as Error)?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
