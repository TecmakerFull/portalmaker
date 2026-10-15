// =============================================================================
// PORTALMAKER — Panel de Administración: Gestión y Moderación de Reseñas
// Permite al admin revisar las opiniones de los clientes y ocultar las no deseadas.
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ResenasManager from './resenas-manager'
import type { ProductReview } from '@/types/database'

export default async function ResenasAdminPage() {
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

  // 1. Obtener todas las reseñas de la tienda con datos del producto
  const { data: reviews } = await supabase
    .from('product_reviews')
    .select(`
      *,
      product:products (id, nombre, slug, fotos)
    `)
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  return (
    <ResenasManager
      store={store}
      initialReviews={(reviews as any[]) ?? []}
      tenantQuery={tenantQuery}
    />
  )
}
