// =============================================================================
// PORTALMAKER — Panel de Administración: Cobros y Datos de Transferencia
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import type { Store } from '@/types/database'
import PagosForm from './pagos-form'

export default async function PagosAdminPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const isAdmin = await isStoreAdmin(store)

  if (!isAdmin) {
    notFound()
  }

  // Traer la tienda con createSupabaseAdminClient para asegurar que todas las columnas bancarias
  // (transferencia_alias, transferencia_cbu_cvu, transferencia_banco, transferencia_titular,
  // transferencia_cuit, transferencia_instrucciones, checkout_activo)
  // estén disponibles aunque getTenantStore haya resuelto por la vista pública stores_public.
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
      <PagosForm store={storeEfectiva} tenantQuery={tenantQuery} />
    </div>
  )
}
