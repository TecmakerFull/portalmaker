// =============================================================================
// PORTALMAKER — Página de Manual / Guía Paso a Paso para la Tienda
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore } from '@/lib/tenant'
import GuiaView from './guia-view'

export default async function AdminGuiaPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  return <GuiaView store={store} tenantQuery={tenantQuery} />
}
