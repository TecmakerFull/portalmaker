import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ThemeToggle from '../../theme-toggle'
import ProductDetailView from './product-detail-view'
import { ArrowLeft } from 'lucide-react'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ProductoDetallePage({ params }: PageProps) {
  const { slug } = await params
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const supabase = await createSupabaseServerClient()

  // Buscar producto
  const { data: product } = await supabase
    .from('products')
    .select('*, category:categories(nombre)')
    .eq('store_id', store.id)
    .eq('slug', slug)
    .eq('visible', true)
    .single()

  if (!product) {
    notFound()
  }

  // Buscar variantes activas del producto
  const { data: variants } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', product.id)
    .eq('activo', true)
    .order('orden', { ascending: true })

  // Buscar detalles adicionales (dimensiones, etc.)
  const { data: details } = await supabase
    .from('product_details')
    .select('*')
    .eq('product_id', product.id)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-black/10 dark:border-white/10 sticky top-0 bg-[var(--color-fondo)]/90 backdrop-blur-md z-30 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <Link
            href={`/tienda${tenantQuery}`}
            className="text-2xl sm:text-3xl font-extrabold tracking-tight font-[var(--font-heading)] text-[var(--color-primario)]"
          >
            {store.nombre}
          </Link>

          <div className="flex items-center gap-3">
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

      {/* Detalle del Producto */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <ProductDetailView
          product={product}
          store={store}
          variants={variants ?? []}
          details={details}
        />
      </main>
    </div>
  )
}
