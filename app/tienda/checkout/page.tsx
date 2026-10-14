// =============================================================================
// PORTALMAKER — Página de Checkout / Confirmación de Pedido (Estilo TiendaDemo)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore } from '@/lib/tenant'
import ThemeToggle from '@/app/tienda/theme-toggle'
import CheckoutForm from './checkout-form'
import StoreFooter from '../sections/store-footer'
import { ArrowLeft, LockKeyhole } from 'lucide-react'

export default async function TiendaCheckoutPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] transition-colors duration-200 flex flex-col justify-between">
      <div>
        {/* Header Minimalista de Checkout */}
        <header className="border-b border-black/10 dark:border-white/10 sticky top-0 bg-[var(--color-fondo)]/95 backdrop-blur-md z-30 transition-colors duration-200">
          <div className="wrap h-18 sm:h-20 flex items-center justify-between gap-4">
            <Link href={`/tienda${tenantQuery}`} className="flex items-center gap-3">
              {store.logo_url && (
                <img
                  src={store.logo_url}
                  alt={store.nombre}
                  className="h-9 sm:h-11 w-auto max-w-[140px] object-contain rounded-lg"
                />
              )}
              <div>
                <span className="brand text-[var(--color-primario)] text-xl sm:text-2xl font-bold">
                  {store.nombre}
                  <span className="text-[var(--color-texto)]">.</span>
                </span>
                <span className="block text-[10px] opacity-60 font-medium">Finalizar compra / reserva</span>
              </div>
            </Link>

            <div className="flex items-center gap-2 sm:gap-4">
              <ThemeToggle />
              <Link
                href={`/tienda${tenantQuery}`}
                className="min-h-[40px] px-3.5 py-2 rounded-xl border border-black/15 dark:border-white/15 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Seguir comprando</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Formulario Principal de Checkout */}
        <main className="wrap py-8 sm:py-12">
          <CheckoutForm store={store} tenantQuery={tenantQuery} />
        </main>
      </div>

      {/* Footer */}
      <StoreFooter store={store} tenantQuery={tenantQuery} />
    </div>
  )
}
