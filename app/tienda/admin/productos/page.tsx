// =============================================================================
// PORTALMAKER — Panel de Productos del Admin de Tienda
// =============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Plus, Package, Edit, ExternalLink, ImageIcon } from 'lucide-react'
import EliminarProductoButton from './eliminar-producto-btn'

export default async function AdminProductosPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const supabase = await createSupabaseServerClient()

  // Obtener productos de la tienda ordenados por fecha
  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(nombre)')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  const productList = products ?? []

  return (
    <div className="space-y-6">
      {/* Header de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black/90">
            Productos
          </h1>
          <p className="text-sm text-black/60 mt-1">
            Gestiona el catálogo de productos disponibles en tu tienda.
          </p>
        </div>

        <Link
          href={`/tienda/admin/productos/nuevo${tenantQuery}`}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#6B8F71] text-white text-sm font-semibold hover:bg-[#58775d] transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Producto</span>
        </Link>
      </div>

      {/* Listado de Productos */}
      {productList.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {productList.map((product) => {
            const firstImage = product.imagenes && product.imagenes.length > 0 ? product.imagenes[0] : null

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-black/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Foto del producto */}
                  <div className="relative aspect-square w-full bg-black/5 flex items-center justify-center overflow-hidden">
                    {firstImage ? (
                      <img
                        src={firstImage}
                        alt={product.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-black/30 flex flex-col items-center gap-1">
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-xs">Sin imagen</span>
                      </div>
                    )}

                    {/* Badge de categoría */}
                    {product.category && (
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-medium">
                        {product.category.nombre}
                      </span>
                    )}
                  </div>

                  {/* Datos del producto */}
                  <div className="p-4">
                    <h3 className="font-bold text-base text-black/90 line-clamp-1 mb-1">
                      {product.nombre}
                    </h3>
                    <p className="text-lg font-bold text-[#6B8F71]">
                      ${product.precio_base.toLocaleString('es-AR')}
                    </p>

                    <div className="mt-2.5 flex items-center gap-2 text-xs text-black/60">
                      {product.gestiona_stock ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-medium ${
                          (product.stock ?? 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          Stock: {product.stock ?? 0}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">
                          Modo Vitrina / Consulta
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="p-4 pt-0 border-t border-black/5 flex items-center justify-between gap-2 mt-2">
                  <Link
                    href={`/tienda/admin/productos/${product.id}${tenantQuery}`}
                    className="flex-1 min-h-[38px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/15 text-xs font-medium hover:bg-black/5 transition-all text-black/80"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </Link>

                  <EliminarProductoButton productId={product.id} />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Estado vacío */
        <div className="bg-white rounded-2xl border border-black/10 p-10 sm:p-14 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#6B8F71]/10 text-[#6B8F71] mx-auto flex items-center justify-center mb-4">
            <Package className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-black mb-1">Tu catálogo está vacío</h2>
          <p className="text-sm text-black/60 mb-6">
            Comienza a subir tus productos con fotos, descripciones y precios para mostrarlos en tu tienda.
          </p>
          <Link
            href={`/tienda/admin/productos/nuevo${tenantQuery}`}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#6B8F71] text-white text-sm font-semibold hover:bg-[#58775d] transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Crear mi primer producto</span>
          </Link>
        </div>
      )}
    </div>
  )
}
