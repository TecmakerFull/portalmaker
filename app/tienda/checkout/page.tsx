// =============================================================================
// PORTALMAKER — Página de Checkout / Confirmación de Pedido (Estilo TiendaDemo)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
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

  // Verificar si la tienda tiene tarifas de envío a domicilio configuradas y activas
  let tieneTarifasEnvio = false
  if (store.envios_activo) {
    const fallbackVal = Number(store.envio_tarifa_fallback) || 0
    if (fallbackVal > 0) {
      tieneTarifasEnvio = true
    } else {
      const supabaseAdmin = createSupabaseAdminClient()
      const [{ count: zonesCount }, { count: providersCount }] = await Promise.all([
        supabaseAdmin
          .from('shipping_zones')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', store.id)
          .eq('activo', true),
        supabaseAdmin
          .from('store_shipping_providers')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', store.id)
          .eq('activo', true),
      ])
      tieneTarifasEnvio = (zonesCount || 0) > 0 || (providersCount || 0) > 0
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] transition-colors duration-200 flex flex-col justify-between">
      <div>
        {/* Header Minimalista de Checkout */}
        <header
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-fondo) 80%, transparent)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
          className="border-b border-black/10 dark:border-white/10 sticky top-0 z-40 transition-colors duration-200"
        >
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
          <CheckoutForm store={store} tieneTarifasEnvio={tieneTarifasEnvio} tenantQuery={tenantQuery} />
        </main>
      </div>

      {/* Footer */}
      <StoreFooter store={store} tenantQuery={tenantQuery} />
    </div>
  )
}
