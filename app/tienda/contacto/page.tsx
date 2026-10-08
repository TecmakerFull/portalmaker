// =============================================================================
// PORTALMAKER — Página Pública de Contacto & Ubicación
// =============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import StoreHeader from '@/app/tienda/store-header'
import ContactoClient from './contacto-client'

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

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] transition-colors duration-200">
      {/* Header */}
      <StoreHeader
        store={store}
        tenantQuery={tenantQuery}
        hasSobreNosotros={hasSobreNosotros}
      />

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <ContactoClient store={store} tenantQuery={tenantQuery} />
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-black/10 dark:border-white/10 py-8 text-center text-xs opacity-60 space-y-2">
        <div className="flex items-center justify-center gap-4 text-xs font-semibold">
          <Link href={`/tienda${tenantQuery}`} className="hover:underline">
            Catálogo
          </Link>
          {hasSobreNosotros && (
            <>
              <span>•</span>
              <Link href={`/tienda/sobre-nosotros${tenantQuery}`} className="hover:underline">
                Sobre Nosotros
              </Link>
            </>
          )}
          <span>•</span>
          <Link href={`/tienda/contacto${tenantQuery}`} className="hover:underline">
            Contacto & Ubicación
          </Link>
        </div>
        <p>© {new Date().getFullYear()} {store.nombre} — Desarrollado sobre Portalmaker</p>
      </footer>
    </div>
  )
}
