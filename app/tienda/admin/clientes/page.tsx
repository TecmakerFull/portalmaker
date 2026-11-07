// =============================================================================
// PORTALMAKER — Panel de Administración: Clientes & CRM
// Muestra los usuarios registrados/logueados en la tienda, su historial de compras,
// reseñas y permite seleccionarlos como colaboradores.
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ClientesManager from './clientes-manager'
import LockedFeatureCard from '../components/locked-feature-card'
import { isFeatureAllowed, getStoreEffectiveLimit } from '@/lib/plans'
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

  const daTurnos = (store.tipo_negocio ?? 'productos') !== 'productos'

  // El CRM completo depende del plan, pero en tiendas con turnos la lista de clientes
  // se habilita siempre: ahí cada cliente nuevo ocupa un lugar del tope del plan.
  if (!isFeatureAllowed(store, 'crm_clientes') && !daTurnos) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <LockedFeatureCard
          featureKey="crm_clientes"
          storePlan={store.plan}
          tenantQuery={tenantQuery}
        />
      </div>
    )
  }

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

  // Turnos futuros activos por cliente: se avisa antes de borrar a alguien que tiene uno
  const turnosPorEmail: Record<string, number> = {}
  if (daTurnos) {
    const { data: turnos } = await supabase
      .from('bookings')
      .select('cliente_email')
      .eq('store_id', store.id)
      .in('estado', ['pendiente', 'confirmado'])
      .gte('starts_at', new Date().toISOString())
    for (const t of turnos ?? []) {
      const e = String(t.cliente_email || '').toLowerCase()
      if (e) turnosPorEmail[e] = (turnosPorEmail[e] ?? 0) + 1
    }
  }

  return (
    <ClientesManager
      store={store}
      initialCustomers={(customers as StoreCustomer[]) ?? []}
      initialOrders={orders ?? []}
      initialReviews={(reviews as ProductReview[]) ?? []}
      initialCollaborators={(collaborators as StoreCollaborator[]) ?? []}
      tenantQuery={tenantQuery}
      limiteClientes={daTurnos ? getStoreEffectiveLimit(store, 'limite_clientes') : null}
      turnosPorEmail={turnosPorEmail}
      puedeColaboradores={isFeatureAllowed(store, 'colaboradores')}
    />
  )
}
