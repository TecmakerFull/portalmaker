// =============================================================================
// PORTALMAKER — Panel de Administración: Gestión y Moderación de Reseñas
// Permite al admin revisar las opiniones de los clientes y ocultar las no deseadas.
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ResenasManager from './resenas-manager'
import LockedFeatureCard from '../components/locked-feature-card'
import { isFeatureAllowed } from '@/lib/plans'
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

  // Verificar si la tienda tiene habilitadas las reseñas según su plan
  if (!isFeatureAllowed(store, 'resenas')) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <LockedFeatureCard
          featureKey="resenas"
          storePlan={store.plan}
          tenantQuery={tenantQuery}
        />
      </div>
    )
  }

  const supabase = await createSupabaseServerClient()

  // 1. Obtener todas las reseñas de la tienda con datos del producto
  const { data: reviews, error } = await supabase
    .from('product_reviews')
    .select(`
      *,
      product:products (id, nombre, slug, imagenes)
    `)
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error al cargar reseñas en admin de tienda:', error)
  }

  return (
    <ResenasManager
      store={store}
      initialReviews={(reviews as any[]) ?? []}
      tenantQuery={tenantQuery}
    />
  )
}
