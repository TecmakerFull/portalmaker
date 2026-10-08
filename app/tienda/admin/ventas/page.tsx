// =============================================================================
// PORTALMAKER — Panel de Administración: Gestión de Ventas & Pedidos
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import VentasManager from './ventas-manager'

export default async function VentasAdminPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const isAdmin = await isStoreAdmin(store)

  if (!isAdmin) {
    notFound()
  }

  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''
  const supabase = await createSupabaseServerClient()

  // Obtener pedidos de la tienda
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <VentasManager
        store={store}
        initialOrders={orders ?? []}
        tenantQuery={tenantQuery}
      />
    </div>
  )
}
