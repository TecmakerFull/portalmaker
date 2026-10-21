// =============================================================================
// PORTALMAKER — Panel de Administración: Contacto, Ubicación y Redes
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import type { Store } from '@/types/database'
import ContactoForm from './contacto-form'

export default async function ContactoAdminPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const isAdmin = await isStoreAdmin(store)

  if (!isAdmin) {
    notFound()
  }

  // Traer la tienda con createSupabaseAdminClient para asegurar que todas las columnas
  // (incluidas origen_calle, origen_altura, origen_localidad, origen_provincia, origen_codigo_postal)
  // estén disponibles aunque getTenantStore haya resuelto por la vista pública.
  const supabase = createSupabaseAdminClient()
  const { data: fullStore } = await supabase
    .from('stores')
    .select('*')
    .eq('id', store.id)
    .maybeSingle()

  const storeEfectiva = (fullStore as Store) || store
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  return (
    <div className="w-full space-y-6">
      <ContactoForm store={storeEfectiva} tenantQuery={tenantQuery} />
    </div>
  )
}
