// =============================================================================
// PORTALMAKER — Panel de Administración: Métodos y Opciones de Envío (Fase 3)
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import type { Store } from '@/types/database'
import EnviosForm from './envios-form'
import LockedFeatureCard from '../components/locked-feature-card'
import { isFeatureAllowed } from '@/lib/plans'

export default async function EnviosAdminPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const isAdmin = await isStoreAdmin(store)

  if (!isAdmin) {
    notFound()
  }

  // Traer la tienda con createSupabaseAdminClient para asegurar columnas logísticas completas
  const supabase = createSupabaseAdminClient()
  const { data: fullStore } = await supabase
    .from('stores')
    .select('*')
    .eq('id', store.id)
    .maybeSingle()

  const storeEfectiva = (fullStore as Store) || store
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  // Verificar si la tienda tiene habilitado el módulo de envíos según su plan
  const canEnvios =
    isFeatureAllowed(storeEfectiva, 'envios_zonas_fijas') ||
    isFeatureAllowed(storeEfectiva, 'envios_couriers')

  if (!canEnvios) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <LockedFeatureCard
          featureKey="envios_zonas_fijas"
          storePlan={storeEfectiva.plan}
          tenantQuery={tenantQuery}
        />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <EnviosForm store={storeEfectiva} tenantQuery={tenantQuery} />
    </div>
  )
}
