// =============================================================================
// PORTALMAKER — Página Legal (Términos, Privacidad, Cookies)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import StorefrontHeaderFlow from '../sections/storefront-header-flow'
import StoreFooter from '../sections/store-footer'
import LegalClient from './legal-client'
import { getStoreSections } from '@/lib/store-sections'

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function TiendaLegalPage({ searchParams }: PageProps) {
  const { tab } = await searchParams
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const supabase = await createSupabaseServerClient()

  const resolvedSections = await getStoreSections(
    supabase,
    store.id,
    store,
    true
  )

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] transition-colors duration-200 flex flex-col justify-between">
      <div>
        <StorefrontHeaderFlow
          store={store}
          resolvedSections={resolvedSections}
          tenantQuery={tenantQuery}
        />

        <main className="wrap py-12 sm:py-20">
          <LegalClient store={store} initialTab={tab || 'terms'} />
        </main>
      </div>

      <StoreFooter store={store} tenantQuery={tenantQuery} />
    </div>
  )
}
