// =============================================================================
// PORTALMAKER — Crear Nuevo Producto
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ProductoForm from '../producto-form'

export default async function NuevoProductoPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const supabase = await createSupabaseServerClient()

  // Cargar categorías existentes
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', store.id)
    .order('orden', { ascending: true })

  return (
    <ProductoForm
      store={store}
      categories={categories ?? []}
      tenantQuery={tenantQuery}
    />
  )
}
