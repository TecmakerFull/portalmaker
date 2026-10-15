// =============================================================================
// PORTALMAKER — Panel de Administración: Gestión de Suscriptores y Campañas
// Muestra la lista de correos del Newsletter y permite enviar campañas publicitarias.
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import SuscriptoresManager from './suscriptores-manager'
import type { NewsletterSubscriber } from '@/types/database'

export default async function SuscriptoresAdminPage() {
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

  // Consultar lista de suscriptores al newsletter
  const { data: subscribers } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  return (
    <SuscriptoresManager
      store={store}
      initialSubscribers={(subscribers as NewsletterSubscriber[]) ?? []}
      tenantQuery={tenantQuery}
    />
  )
}
