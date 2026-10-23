// =============================================================================
// PORTALMAKER — Panel de Administración: Gestión de Colaboradores de Tienda
// Permite al dueño invitar socios o ayudantes con permisos para gestionar la tienda.
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ColaboradoresManager from './colaboradores-manager'
import LockedFeatureCard from '../components/locked-feature-card'
import { isFeatureAllowed } from '@/lib/plans'
import type { StoreCollaborator } from '@/types/database'

export default async function ColaboradoresAdminPage() {
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

  // Verificar si la tienda tiene habilitado el módulo de colaboradores según su plan
  if (!isFeatureAllowed(store, 'colaboradores')) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <LockedFeatureCard
          featureKey="colaboradores"
          storePlan={store.plan}
          tenantQuery={tenantQuery}
        />
      </div>
    )
  }

  const supabase = await createSupabaseServerClient()

  // Consultar lista de colaboradores de la tienda
  const { data: collaborators } = await supabase
    .from('store_collaborators')
    .select('*')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  return (
    <ColaboradoresManager
      store={store}
      initialCollaborators={(collaborators as StoreCollaborator[]) ?? []}
      tenantQuery={tenantQuery}
    />
  )
}
