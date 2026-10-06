// =============================================================================
// PORTALMAKER — Panel de Categorías y Subcategorías de la Tienda
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import CategoriasManager from './categorias-manager'

export default async function AdminCategoriasPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const supabase = await createSupabaseServerClient()

  // Obtener todas las categorías de la tienda ordenadas
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', store.id)
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <CategoriasManager
        store={store}
        initialCategories={categories ?? []}
        tenantQuery={tenantQuery}
      />
    </div>
  )
}
