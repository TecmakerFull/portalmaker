// =============================================================================
// PORTALMAKER — Ficha / Detalle de Producto en la Tienda Pública
// =============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ThemeToggle from '../../theme-toggle'
import { ArrowLeft, MessageSquare, Clock, Box, ImageIcon } from 'lucide-react'

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

  const cleanPhone = store.whatsapp_numero ? store.whatsapp_numero.replace(/[^0-9]/g, '') : null
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Hola ${store.nombre}! Me interesa el producto "${product.nombre}" ($${product.precio_base.toLocaleString('es-AR')}). ¿Podrían darme más información?`
      )}`
    : null

  const imagenes = product.imagenes && product.imagenes.length > 0 ? product.imagenes : []

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

      {/* Detalle */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Columna Izquierda: Galería de Fotos */}
          <div className="space-y-4">
            <div className="aspect-square w-full rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center justify-center">
              {imagenes.length > 0 ? (
                <img
                  src={imagenes[0]}
                  alt={product.nombre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 opacity-40">
                  <ImageIcon className="w-12 h-12" />
                  <span className="text-xs">Sin fotos disponibles</span>
                </div>
              )}
            </div>

            {/* Miniaturas si hay más de 1 imagen */}
            {imagenes.length > 1 && (
              <div className="grid grid-cols-4 gap-2.5">
                {imagenes.map((url: string, i: number) => (
                  <div
                    key={i}
                    className="aspect-square rounded-xl overflow-hidden border border-black/15 dark:border-white/15 bg-black/5"
                  >
                    <img src={url} alt={`Vista ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Columna Derecha: Información y Compra */}
          <div className="space-y-6">
            <div>
              {product.category && (
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primario)] block mb-1">
                  {product.category.nombre}
                </span>
              )}
              <h1 className="text-2xl sm:text-4xl font-extrabold font-[var(--font-heading)] leading-tight">
                {product.nombre}
              </h1>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-extrabold text-[var(--color-primario)]">
                ${product.precio_base.toLocaleString('es-AR')}
              </span>
            </div>

            {/* Botón WhatsApp Principal */}
            {whatsappUrl && (
              <div className="pt-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[52px] w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[var(--color-primario)] text-white text-base font-bold hover:opacity-90 active:scale-98 transition-all shadow-md"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>
                    {product.gestiona_stock && (product.stock ?? 0) <= 0
                      ? 'Consultar Disponibilidad por WhatsApp'
                      : 'Comprar / Consultar por WhatsApp'}
                  </span>
                </a>
              </div>
            )}

            {/* Características rápidas */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {product.tiempo_fabricacion_estimado && (
                <div className="p-3.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[var(--color-primario)] shrink-0" />
                  <div className="text-xs">
                    <span className="opacity-60 block">Fabricación</span>
                    <span className="font-semibold">{product.tiempo_fabricacion_estimado}</span>
                  </div>
                </div>
              )}

              {product.gestiona_stock && (
                <div className="p-3.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex items-center gap-2.5">
                  <Box className="w-4 h-4 text-[var(--color-primario)] shrink-0" />
                  <div className="text-xs">
                    <span className="opacity-60 block">Stock disponible</span>
                    <span className="font-semibold">
                      {(product.stock ?? 0) > 0 ? `${product.stock} unidades` : 'Bajo pedido'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Descripción */}
            {product.descripcion && (
              <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider opacity-70">
                  Descripción del Producto
                </h3>
                <p className="text-sm leading-relaxed opacity-85 whitespace-pre-line">
                  {product.descripcion}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
