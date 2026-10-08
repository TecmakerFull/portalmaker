// =============================================================================
// PORTALMAKER — Página de Checkout / Confirmación de Pedido
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore } from '@/lib/tenant'
import ThemeToggle from '@/app/tienda/theme-toggle'
import CheckoutForm from './checkout-form'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export default async function TiendaCheckoutPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-black/10 dark:border-white/10 sticky top-0 bg-[var(--color-fondo)]/90 backdrop-blur-md z-30 transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <Link href={`/tienda${tenantQuery}`} className="flex items-center gap-3">
            {store.logo_url && (
              <img
                src={store.logo_url}
                alt={store.nombre}
                className="h-10 sm:h-12 w-auto max-w-[140px] object-contain rounded-lg"
              />
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-[var(--font-heading)] text-[var(--color-primario)]">
                {store.nombre}
              </h1>
              <p className="text-xs opacity-70">Finalizar compra / reserva</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href={`/tienda${tenantQuery}`}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-black/15 dark:border-white/15 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a la tienda</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Formulario Principal de Checkout */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <CheckoutForm store={store} tenantQuery={tenantQuery} />
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-black/10 dark:border-white/10 py-8 text-center text-xs opacity-60">
        <p>© {new Date().getFullYear()} {store.nombre} — Desarrollado sobre Portalmaker</p>
      </footer>
    </div>
  )
}
