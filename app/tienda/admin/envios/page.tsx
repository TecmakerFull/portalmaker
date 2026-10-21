// =============================================================================
// PORTALMAKER — Panel de Administración: Métodos y Opciones de Envío (Fase 3)
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import type { Store } from '@/types/database'
import EnviosForm from './envios-form'

export default async function EnviosAdminPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const isAdmin = await isStoreAdmin(store)

  if (!isAdmin) {
    notFound()
  }

  // Traer la tienda con createSupabaseAdminClient para asegurar columnas logísticas completas
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
      <EnviosForm store={storeEfectiva} tenantQuery={tenantQuery} />
    </div>
  )
}
