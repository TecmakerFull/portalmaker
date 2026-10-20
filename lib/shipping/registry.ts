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
import type { ShippingZone } from '@/types/database'

/**
 * Obtiene las instancias de CarrierProvider activos configurados para una tienda dada.
 */
export async function getActiveStoreShippingProviders(
  storeId: string
): Promise<CarrierProvider[]> {
  const supabase = createSupabaseAdminClient()
  const providers: CarrierProvider[] = []

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
  if (activeTypes.has('manual') || !dbProviders || dbProviders.length === 0) {
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
  if (dbProviders && dbProviders.length > 0) {
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
