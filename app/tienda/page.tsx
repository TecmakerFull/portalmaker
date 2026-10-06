// =============================================================================
// PORTALMAKER — Tienda Pública (Catálogo de Productos)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ThemeToggle from './theme-toggle'
import { MessageSquare, Package, ImageIcon, ArrowRight } from 'lucide-react'

export default async function TiendaPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const supabase = await createSupabaseServerClient()

  // 1. Obtener categorías
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', store.id)
    .order('orden', { ascending: true })

  // 2. Obtener productos activos (visibles)
  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(nombre)')
    .eq('store_id', store.id)
    .eq('visible', true)
    .order('destacado', { ascending: false })
    .order('created_at', { ascending: false })

  const productList = products ?? []
  const categoryList = categories ?? []

  // Link general de WhatsApp
  const cleanPhone = store.whatsapp_numero ? store.whatsapp_numero.replace(/[^0-9]/g, '') : null
  const generalWhatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola ${store.nombre}! Vengo de ver tu tienda online.`)}`
    : null

  // Si la tienda está apagada (modo mantenimiento / en construcción)
  if (!store.suscripcion_activa) {
    return (
      <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] flex flex-col justify-between transition-colors duration-200">
        <header className="border-b border-black/10 dark:border-white/10 p-4 sm:p-6 flex items-center justify-between max-w-6xl w-full mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold font-[var(--font-heading)] text-[var(--color-primario)]">
            {store.nombre}
          </h1>
          <ThemeToggle />
        </header>

        <main className="max-w-lg mx-auto p-6 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-[var(--color-primario)]/15 text-[var(--color-primario)] flex items-center justify-center mx-auto shadow-xs">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 mb-3 inline-block">
              Tienda en Preparación
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-[var(--font-heading)] mt-1">
              ¡Volvemos muy pronto!
            </h2>
            <p className="text-sm opacity-70 mt-2 leading-relaxed">
              Estamos actualizando el catálogo, nuevos modelos y piezas de taller.
              Si precisás realizar un encargo urgente, podés contactarnos directamente por WhatsApp.
            </p>
          </div>

          {generalWhatsappUrl && (
            <a
              href={generalWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] px-6 py-3 rounded-2xl bg-[var(--color-primario)] text-white text-sm font-bold hover:opacity-90 active:scale-95 transition-all inline-flex items-center justify-center gap-2 shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Contactar por WhatsApp</span>
            </a>
          )}
        </main>

        <footer className="border-t border-black/10 dark:border-white/10 py-6 text-center text-xs opacity-50">
          <p>© {new Date().getFullYear()} {store.nombre} — Desarrollado sobre Portalmaker</p>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] transition-colors duration-200">
      {/* Header Principal de la Tienda */}
      <header className="border-b border-black/10 dark:border-white/10 sticky top-0 bg-[var(--color-fondo)]/90 backdrop-blur-md z-30 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <Link href={`/tienda${tenantQuery}`} className="flex items-center gap-3">
            {store.logo_url && (
              <img
                src={store.logo_url}
                alt={store.nombre}
                className="h-10 sm:h-12 w-auto max-w-[140px] object-contain rounded-lg"
              />
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight font-[var(--font-heading)] text-[var(--color-primario)]">
                {store.nombre}
              </h1>
              {store.slogan && (
                <p className="text-xs sm:text-sm opacity-70 line-clamp-1 mt-0.5">
                  {store.slogan}
                </p>
              )}
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Enlace a Contacto */}
            <Link
              href={`/tienda/contacto${tenantQuery}`}
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
            >
              <span>Contacto</span>
            </Link>

            {/* Toggle Tema */}
            <ThemeToggle />

            {/* Botón WhatsApp */}
            {generalWhatsappUrl && (
              <a
                href={generalWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--color-primario)] text-white text-xs sm:text-sm font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
                <span className="sm:hidden">Consultar</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Encabezado del Catálogo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-[var(--font-heading)]">
              Catálogo de Productos
            </h2>
            <p className="text-xs sm:text-sm opacity-70 mt-0.5">
              {productList.length} {productList.length === 1 ? 'producto disponible' : 'productos disponibles'}
            </p>
          </div>

          {/* Categorías como Filtros / Pastillas */}
          {categoryList.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--color-primario)] text-white whitespace-nowrap">
                Todos
              </span>
              {categoryList.map((cat) => (
                <span
                  key={cat.id}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 opacity-80 whitespace-nowrap"
                >
                  {cat.nombre}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Grilla de Productos */}
        {productList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
            {productList.map((product) => {
              const firstImage = product.imagenes && product.imagenes.length > 0 ? product.imagenes[0] : null

              // Mensaje de WhatsApp personalizado por producto
              const productWaUrl = cleanPhone
                ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                    `Hola! Me interesa consultar por el producto: "${product.nombre}" ($${product.precio_base.toLocaleString('es-AR')})`
                  )}`
                : null

              return (
                <div
                  key={product.id}
                  className="group rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden bg-black/[0.02] dark:bg-white/[0.03] flex flex-col justify-between hover:shadow-lg transition-all duration-200"
                >
                  <div>
                    {/* Imagen con enlace al detalle */}
                    <Link
                      href={`/tienda/productos/${product.slug}${tenantQuery}`}
                      className="block relative aspect-square w-full bg-black/5 dark:bg-white/5 overflow-hidden"
                    >
                      {firstImage ? (
                        <img
                          src={firstImage}
                          alt={product.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center opacity-40 gap-1.5">
                          <ImageIcon className="w-10 h-10" />
                          <span className="text-xs">Sin imagen</span>
                        </div>
                      )}

                      {/* Badge Destacado */}
                      {product.destacado && (
                        <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-md bg-[var(--color-primario)] text-white text-[11px] font-bold shadow-sm">
                          Destacado
                        </span>
                      )}
                    </Link>

                    {/* Información del producto */}
                    <div className="p-4 space-y-1.5">
                      {product.category && (
                        <span className="text-[11px] font-medium opacity-60 uppercase tracking-wider block">
                          {product.category.nombre}
                        </span>
                      )}

                      <Link
                        href={`/tienda/productos/${product.slug}${tenantQuery}`}
                        className="block font-bold text-base hover:text-[var(--color-primario)] transition-colors line-clamp-2"
                      >
                        {product.nombre}
                      </Link>

                      <div className="pt-1 flex items-baseline justify-between">
                        <span className="text-xl font-extrabold text-[var(--color-primario)]">
                          ${product.precio_base.toLocaleString('es-AR')}
                        </span>

                        {product.gestiona_stock && (
                          <span className="text-[11px] opacity-60">
                            {(product.stock ?? 0) > 0 ? `${product.stock} disp.` : 'A pedido'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botón de Acción WhatsApp */}
                  <div className="p-4 pt-0">
                    {productWaUrl ? (
                      <a
                        href={productWaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[44px] w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--color-primario)] text-white text-xs font-bold hover:opacity-90 active:scale-98 transition-all shadow-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>
                          {product.gestiona_stock && (product.stock ?? 0) <= 0
                            ? 'Consultar disponibilidad'
                            : 'Consultar por WhatsApp'}
                        </span>
                      </a>
                    ) : (
                      <Link
                        href={`/tienda/productos/${product.slug}${tenantQuery}`}
                        className="min-h-[44px] w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-black/15 dark:border-white/15 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                      >
                        <span>Ver detalles</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Catálogo Vacío */
          <div className="text-center py-16 sm:py-24 border border-dashed border-black/15 dark:border-white/15 rounded-3xl p-6">
            <Package className="w-12 h-12 text-[var(--color-primario)] mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-bold">Catálogo en preparación</h3>
            <p className="text-xs sm:text-sm opacity-60 mt-1 max-w-sm mx-auto">
              Esta tienda está preparando sus productos para publicar muy pronto.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-black/10 dark:border-white/10 py-8 text-center text-xs opacity-75 space-y-2">
        <div className="flex items-center justify-center gap-4 text-xs font-semibold">
          <Link href={`/tienda${tenantQuery}`} className="hover:underline">
            Catálogo
          </Link>
          <span>•</span>
          <Link href={`/tienda/contacto${tenantQuery}`} className="hover:underline">
            Contacto & Ubicación
          </Link>
        </div>
        <p className="opacity-60">© {new Date().getFullYear()} {store.nombre} — Desarrollado sobre Portalmaker</p>
      </footer>
    </div>
  )
}
