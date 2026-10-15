// =============================================================================
// PORTALMAKER — Panel de Administración: Gestión de Colaboradores de Tienda
// Permite al dueño invitar socios o ayudantes con permisos para gestionar la tienda.
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ColaboradoresManager from './colaboradores-manager'
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
