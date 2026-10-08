// =============================================================================
// PORTALMAKER — Panel de Productos del Admin de Tienda
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ProductosTable from './productos-table'

export default async function AdminProductosPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const supabase = await createSupabaseServerClient()

  // 1. Obtener productos de la tienda con variantes y categoría
  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(nombre), variants:product_variants(*)')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  // 2. Obtener categorías de la tienda para filtros y edición rápida
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', store.id)
    .order('orden', { ascending: true })

  const productList = products ?? []
  const categoryList = categories ?? []

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <ProductosTable
        store={store}
        initialProducts={productList}
        categories={categoryList}
        tenantQuery={tenantQuery}
      />
    </div>
  )
}

