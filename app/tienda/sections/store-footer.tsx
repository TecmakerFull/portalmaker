// =============================================================================
// PORTALMAKER — Footer de la tienda (parte de servidor)
//
// Lee la configuración del pie de página (Diseño → Pie de página) y resuelve
// qué medios de pago mostrar. Mantiene la misma firma que el footer anterior
// para que ninguna página tenga que cambiar cómo lo usa.
// =============================================================================

import type { Store } from '@/types/database'
import { getStoreExtraSections } from '@/lib/store-extra-sections'
import { resolveMediosPago } from '@/lib/trust-icons'
import StoreFooterClient from './store-footer-client'

export default async function StoreFooter({ store, tenantQuery }: { store: Store; tenantQuery: string }) {
  const { footer } = await getStoreExtraSections(store)
  const mediosPago =
    footer.enabled && footer.settings.mostrar_medios_pago
      ? resolveMediosPago(footer.settings.medios_pago, store)
      : []

  return <StoreFooterClient store={store} tenantQuery={tenantQuery} mediosPago={mediosPago} />
}
