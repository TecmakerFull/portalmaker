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

  // Obtener productos de la tienda con variantes para creación de venta manual
  const { data: products } = await supabase
    .from('products')
    .select('id, nombre, precio_base, precio_oferta, oferta_activa, stock, gestiona_stock, variants:product_variants(id, nombre, precio_adicional, stock, activo)')
    .eq('store_id', store.id)
    .order('nombre', { ascending: true })

  // Obtener clientes registrados de la tienda para asignación rápida
  const { data: customers } = await supabase
    .from('store_customers')
    .select('id, nombre, email, telefono')
    .eq('store_id', store.id)
    .order('nombre', { ascending: true })

  return (
    <div className="space-y-6">
      <VentasManager
        store={store}
        initialOrders={orders ?? []}
        initialProducts={products ?? []}
        initialCustomers={customers ?? []}
        tenantQuery={tenantQuery}
      />
    </div>
  )
}
