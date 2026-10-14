// =============================================================================
// PORTALMAKER — Página Pública de Contacto & Ubicación
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import StorefrontHeaderFlow from '@/app/tienda/sections/storefront-header-flow'
import ContactoClient from './contacto-client'
import StoreFooter from '@/app/tienda/sections/store-footer'
import { getStoreSections } from '@/lib/store-sections'

export default async function TiendaContactoPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const supabase = await createSupabaseServerClient()

  // Verificar si la página "Sobre Nosotros" está activa
  const { data: sobreNosotrosPage } = await supabase
    .from('store_pages')
    .select('id, visible')
    .eq('store_id', store.id)
    .eq('slug', 'sobre-nosotros')
    .eq('visible', true)
    .maybeSingle()

  const hasSobreNosotros = !!sobreNosotrosPage

  // Obtener secciones modulares de Storefront (Top Bar, Header, Navbar)
  const resolvedSections = await getStoreSections(
    supabase,
    store.id,
    store,
    hasSobreNosotros
  )

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] transition-colors duration-200 flex flex-col justify-between">
      <div>
        {/* Cabecera y Navegación Modular (Top Bar -> Header -> Navbar) */}
        <StorefrontHeaderFlow
          store={store}
          resolvedSections={resolvedSections}
          tenantQuery={tenantQuery}
        />

        {/* Main Content */}
        <main className="wrap py-10 sm:py-16">
          <ContactoClient store={store} tenantQuery={tenantQuery} />
        </main>
      </div>

      {/* Footer */}
      <StoreFooter store={store} tenantQuery={tenantQuery} />
    </div>
  )
}
