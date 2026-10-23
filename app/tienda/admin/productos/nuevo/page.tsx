import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ProductoForm from '../producto-form'
import { getPlanConfig } from '@/lib/plans'
import { Package, Sparkles, ArrowLeft, ArrowUpRight } from 'lucide-react'

export default async function NuevoProductoPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const supabase = await createSupabaseServerClient()

  const planConfig = getPlanConfig(store.plan)
  const limiteEfectivo = store.limite_productos ?? planConfig.limiteProductos

  // Verificar cantidad actual de productos de la tienda
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', store.id)

  const productosActuales = count || 0

  if (productosActuales >= limiteEfectivo) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-amber-500/[0.04] p-6 sm:p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/20 text-[#CA8A04] dark:text-[#FACC15] flex items-center justify-center mx-auto">
            <Package className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Límite de Catálogo Alcanzado
            </h2>
            <p className="text-sm opacity-70 max-w-lg mx-auto">
              Tu tienda actualmente tiene <strong className="text-zinc-900 dark:text-zinc-100">{productosActuales} productos</strong> cargados de un máximo de <strong className="text-zinc-900 dark:text-zinc-100">{limiteEfectivo} permitidos</strong> en tu plan actual (<span className="capitalize">{planConfig.nombre}</span>).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900/80 border border-amber-400/30 text-xs sm:text-sm text-left max-w-md mx-auto space-y-1.5">
            <div className="flex justify-between items-center font-medium">
              <span>Cupo consumido:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {productosActuales} / {limiteEfectivo} (100%)
              </span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full w-full rounded-full" />
            </div>
            <p className="text-[11px] opacity-60 pt-1">
              Para agregar más productos podés actualizar tu suscripción o eliminar piezas en desuso.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={`/tienda/admin/productos${tenantQuery}`}
              className="min-h-[44px] w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ver mis productos</span>
            </Link>

            <Link
              href={`/tienda/admin/suscripcion${tenantQuery}`}
              className="min-h-[44px] w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] hover:bg-[#FACC15]/90 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Mejorar mi Plan</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Cargar categorías existentes
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', store.id)
    .order('orden', { ascending: true })

  return (
    <ProductoForm
      store={store}
      categories={categories ?? []}
      tenantQuery={tenantQuery}
    />
  )
}
