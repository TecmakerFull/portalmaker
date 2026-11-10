// =============================================================================
// PORTALMAKER — Registro y fábrica de proveedores de envíos (Fase 2)
// Carga los proveedores activos configurados para una tienda en store_shipping_providers
// descifrando credenciales con el cliente admin de Supabase (service_role).
// =============================================================================

import { createSupabaseAdminClient } from '@/lib/supabase/server'
import type { CarrierProvider, ShippingProviderType } from './types'
import { decryptCarrierCredentials } from './crypto'
import { ManualShippingProvider } from './manual'
import { ZipnovaShippingProvider, type ZipnovaCredentials } from './zipnova'
import { isFeatureAllowed } from '@/lib/plans'
import type { ShippingZone, Store } from '@/types/database'

/**
 * Obtiene las instancias de CarrierProvider activos configurados para una tienda dada,
 * respetando las funcionalidades habilitadas en su plan (envios_zonas_fijas / envios_couriers).
 */
export async function getActiveStoreShippingProviders(
  storeId: string
): Promise<CarrierProvider[]> {
  const supabase = createSupabaseAdminClient()
  const providers: CarrierProvider[] = []

  const { data: storeRow } = await supabase
    .from('stores')
    .select('id, plan, features_override')
    .eq('id', storeId)
    .maybeSingle()

  const canManualZones = storeRow ? isFeatureAllowed(storeRow as Store, 'envios_zonas_fijas') : true
  const canCouriers = storeRow ? isFeatureAllowed(storeRow as Store, 'envios_couriers') : true

  // 1. Obtener registros activos en store_shipping_providers
  const { data: dbProviders } = await supabase
    .from('store_shipping_providers')
    .select('*')
    .eq('store_id', storeId)
    .eq('activo', true)

  const activeTypes = new Set<ShippingProviderType>(
    (dbProviders?.map((p: { provider: string }) => p.provider as ShippingProviderType) ?? [])
  )

  // 2. Si el proveedor manual está activo (o si no hay configuración explícita pero tiene zonas creadas)
  if (canManualZones && (activeTypes.has('manual') || !dbProviders || dbProviders.length === 0)) {
    const { data: zones } = await supabase
      .from('shipping_zones')
      .select('*')
      .eq('store_id', storeId)
      .eq('activo', true)

    if (zones && zones.length > 0) {
      providers.push(new ManualShippingProvider(zones as ShippingZone[]))
    }
  }

  // 3. Proveedores externos (Zipnova, etc.)
  if (canCouriers && dbProviders && dbProviders.length > 0) {
    for (const record of dbProviders) {
      if (!record.activo) continue

      if (record.provider === 'zipnova') {
        let creds: ZipnovaCredentials = {}
        if (record.credentials_enc) {
          try {
            const decryptedJson = decryptCarrierCredentials(record.credentials_enc)
            creds = JSON.parse(decryptedJson)
          } catch (err) {
            console.error('Error al descifrar credenciales de Zipnova para store', storeId, err)
          }
        }
        providers.push(new ZipnovaShippingProvider(creds))
      }
    }
  }

  return providers
}

/**
 * Obtiene una instancia específica de CarrierProvider para una tienda y proveedor dado.
 */
export async function getStoreShippingProvider(
  storeId: string,
  providerName: ShippingProviderType
): Promise<CarrierProvider | null> {
  const supabase = createSupabaseAdminClient()

  if (providerName === 'manual') {
    const { data: zones } = await supabase
      .from('shipping_zones')
      .select('*')
      .eq('store_id', storeId)
      .eq('activo', true)

    if (zones && zones.length > 0) {
      return new ManualShippingProvider(zones as ShippingZone[])
    }
    return null
  }

  const { data: record } = await supabase
    .from('store_shipping_providers')
    .select('*')
    .eq('store_id', storeId)
    .eq('provider', providerName)
    .eq('activo', true)
    .maybeSingle()

  if (!record) return null

  if (record.provider === 'zipnova') {
    let creds: ZipnovaCredentials = {}
    if (record.credentials_enc) {
      try {
        const decryptedJson = decryptCarrierCredentials(record.credentials_enc)
        creds = JSON.parse(decryptedJson)
      } catch (err) {
        console.error('Error al descifrar credenciales de Zipnova para store', storeId, err)
      }
    }
    return new ZipnovaShippingProvider(creds)
  }

  return null
}

