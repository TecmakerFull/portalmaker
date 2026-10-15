// =============================================================================
// PORTALMAKER — Panel de Administración: Clientes & CRM
// Muestra los usuarios registrados/logueados en la tienda, su historial de compras,
// reseñas y permite seleccionarlos como colaboradores.
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ClientesManager from './clientes-manager'
import type { StoreCustomer, StoreCollaborator, ProductReview } from '@/types/database'

export default async function ClientesAdminPage() {
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

  // 1. Clientes registrados
  const { data: customers } = await supabase
    .from('store_customers')
    .select('*')
    .eq('store_id', store.id)
    .order('ultimo_login', { ascending: false })

  // 2. Pedidos de la tienda para calcular métricas e historial
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  // 3. Reseñas dejadas por clientes
  const { data: reviews } = await supabase
    .from('product_reviews')
    .select('*')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  // 4. Colaboradores actuales para saber quién tiene rol de equipo
  const { data: collaborators } = await supabase
    .from('store_collaborators')
    .select('*')
    .eq('store_id', store.id)

  return (
    <ClientesManager
      store={store}
      initialCustomers={(customers as StoreCustomer[]) ?? []}
      initialOrders={orders ?? []}
      initialReviews={(reviews as ProductReview[]) ?? []}
      initialCollaborators={(collaborators as StoreCollaborator[]) ?? []}
      tenantQuery={tenantQuery}
    />
  )
}
