// =============================================================================
// PORTALMAKER — Panel: Servicios (tiendas que dan turnos)
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getEffectiveStoreConfig } from '@/lib/config/store-config'
import ServiciosManager from './servicios-manager'
import type { Service } from '@/types/database'

export default async function AdminServiciosPage() {
  const tenant = await getTenantStore()
  if (!tenant) notFound()

  const { store, context } = tenant
  // Las páginas se ejecutan en paralelo con el layout: se revalida el permiso acá.
  if (!(await isStoreAdmin(store))) notFound()

  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  // RLS: el dueño y sus colaboradores ven todos los servicios, incluso los ocultos.
  const supabase = await createSupabaseServerClient()
  const [{ data: services }, storeConfig] = await Promise.all([
    supabase
      .from('services')
      .select('*')
      .eq('store_id', store.id)
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true }),
    getEffectiveStoreConfig(store.id),
  ])

  return (
    <div className="w-full space-y-6">
      <ServiciosManager
        store={store}
        initialServices={(services as Service[]) ?? []}
        tenantQuery={tenantQuery}
        maxActiveServices={storeConfig.max_active_products}
      />
    </div>
  )
}
