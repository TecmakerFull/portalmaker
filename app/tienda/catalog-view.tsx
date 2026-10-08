// =============================================================================
// PORTALMAKER — Vista Interactiva de Catálogo (Buscador, Filtros por Categoría, Grilla Responsive 2 Col en Mobile)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Product, Category, Store } from '@/types/database'
import { useCart } from '@/lib/cart-context'
import {
  Search,
  X,
  Package,
  ImageIcon,
  MessageSquare,
  ArrowRight,
  Filter,
  Sparkles,
  ShoppingBag,
  Check,
} from 'lucide-react'
import WhatsAppIcon from './sections/whatsapp-icon'

interface CatalogViewProps {
  products: (Product & { category?: { nombre: string } | null })[]
  categories: Category[]
  store: Store
  tenantQuery: string
}

export default function CatalogView({
  products = [],
  categories = [],
  store,
  tenantQuery,
}: CatalogViewProps) {
  const { addItem } = useCart()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'todos'>('todos')
  const [addedProductId, setAddedProductId] = useState<string | null>(null)
  const [cartNotification, setCartNotification] = useState<string | null>(null)

  // Teléfono limpio para WhatsApp
  const cleanPhone = store.whatsapp_numero ? store.whatsapp_numero.replace(/[^0-9]/g, '') : null

  // Agregar directamente al carrito desde la tarjeta del catálogo
  const handleAddToCart = (product: Product & { category?: { nombre: string } | null }, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const firstImage = product.imagenes && product.imagenes.length > 0 ? product.imagenes[0] : null
    const effectivePrice = product.oferta_activa && product.precio_oferta ? product.precio_oferta : product.precio_base

    const res = addItem(
      {
        productId: product.id,
        productSlug: product.slug,
        productName: product.nombre,
        imagenUrl: firstImage,
        variantId: null,
        variantName: null,
        unitPrice: effectivePrice,
        originalPrice: product.oferta_activa ? product.precio_base : null,
        gestionaStock: product.gestiona_stock,
        stockDisponible: product.stock,
        isReserva: !product.gestiona_stock || (product.stock ?? 0) <= 0,
      },
      1
    )

    if (res.success) {
      setAddedProductId(product.id)
      setCartNotification(`¡${product.nombre} agregado al carrito!`)
      setTimeout(() => {
        setAddedProductId(null)
        setCartNotification(null)
      }, 2000)
    }
  }

  // Filtrado reactivo por palabras sueltas (nombre, descripción, categoría) + categoría activa
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const terms = query.split(/\s+/).filter(Boolean)

    return products.filter((product) => {
      // 1. Filtro por categoría seleccionada
      if (selectedCategoryId !== 'todos') {
        if (product.category_id !== selectedCategoryId) {
          return false
        }
      }

      // 2. Filtro por texto / palabras sueltas
      if (terms.length > 0) {
        const searchableText = `${product.nombre} ${product.descripcion || ''} ${
          product.category?.nombre || ''
        }`.toLowerCase()

        // Cada término buscado debe estar presente en el texto
        const matchesAllTerms = terms.every((term) => searchableText.includes(term))
        if (!matchesAllTerms) {
          return false
        }
      }

      return true
    })
  }, [products, searchQuery, selectedCategoryId])

  // Limpiar todos los filtros
  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedCategoryId('todos')
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Barra de Búsqueda y Filtros de Categorías */}
      <div className="space-y-3">
        {/* Encabezado */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-[var(--font-heading)]">
            Catálogo de Productos
          </h2>
          <p className="text-xs sm:text-sm opacity-70 mt-0.5">
            {filteredProducts.length}{' '}
            {filteredProducts.length === 1 ? 'producto disponible' : 'productos disponibles'}
            {(searchQuery || selectedCategoryId !== 'todos') && (
              <span className="ml-1 opacity-80">(filtrado de {products.length})</span>
            )}
          </p>
        </div>

        {/* Fila alineada: Pills de Categorías a la izquierda + Buscador a la derecha */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Pastillas / Pills de Categorías (alineadas a la izquierda) */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-1 min-w-0">
            {/* Pill: Todos */}
            <button
              type="button"
              onClick={() => setSelectedCategoryId('todos')}
              className={`text-xs px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                selectedCategoryId === 'todos'
                  ? 'bg-[var(--color-primario)] text-white font-semibold shadow-xs'
                  : 'border border-black/15 dark:border-white/15 opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 bg-black/[0.02] dark:bg-white/[0.02] font-medium'
              }`}
            >
              Todos
            </button>

            {/* Pills de cada Categoría */}
            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`text-xs px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                    isSelected
                      ? 'bg-[var(--color-primario)] text-white font-semibold shadow-xs'
                      : 'border border-black/15 dark:border-white/15 opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 bg-black/[0.02] dark:bg-white/[0.02] font-medium'
                  }`}
                >
                  {cat.nombre}
                </button>
              )
            })}
          </div>

          {/* Campo de Búsqueda alineado a la derecha en la misma fila */}
          <div className="relative w-full sm:w-72 md:w-80 shrink-0">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none opacity-50">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o descripción..."
              className="w-full min-h-[38px] pl-9 pr-9 py-1.5 rounded-2xl border border-black/15 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.04] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)] focus:border-transparent transition-all placeholder:opacity-50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute inset-y-0 right-2 flex items-center px-1.5 opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grilla de Productos (2 Columnas en Mobile, 3 en Tablet, 4 en Desktop) */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {filteredProducts.map((product) => {
            const firstImage =
              product.imagenes && product.imagenes.length > 0 ? product.imagenes[0] : null

            const hasPrice = typeof product.precio_base === 'number' && product.precio_base > 0
            const isOutOfStock = product.gestiona_stock && (product.stock ?? 0) <= 0
            const isAdded = addedProductId === product.id

            // Mensaje de WhatsApp personalizado por producto
            const productWaUrl = cleanPhone
              ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                  hasPrice
                    ? `Hola! Me interesa consultar por el producto: "${product.nombre}" ($${product.precio_base.toLocaleString(
                        'es-AR'
                      )})`
                    : `Hola! Me interesa consultar el precio y disponibilidad de: "${product.nombre}"`
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
                      <div className="w-full h-full flex flex-col items-center justify-center opacity-40 gap-1">
                        <ImageIcon className="w-7 h-7 sm:w-10 sm:h-10" />
                        <span className="text-[10px] sm:text-xs">Sin imagen</span>
                      </div>
                    )}

                    {/* Badge Destacado */}
                    {product.destacado && (
                      <span className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 px-2 py-0.5 rounded-md bg-[var(--color-primario)] text-white text-[10px] sm:text-[11px] font-bold shadow-sm">
                        Destacado
                      </span>
                    )}
                  </Link>

                  {/* Información del producto */}
                  <div className="p-3 sm:p-4 space-y-1 sm:space-y-1.5">
                    {product.category && (
                      <span className="text-[10px] sm:text-[11px] font-semibold opacity-60 uppercase tracking-wider block truncate">
                        {product.category.nombre}
                      </span>
                    )}

                    <Link
                      href={`/tienda/productos/${product.slug}${tenantQuery}`}
                      className="block font-bold text-xs sm:text-base hover:text-[var(--color-primario)] transition-colors line-clamp-2 leading-snug"
                    >
                      {product.nombre}
                    </Link>

                    <div className="pt-0.5 sm:pt-1 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5">
                      {hasPrice ? (
                        <span className="text-base sm:text-xl font-extrabold text-[var(--color-primario)]">
                          ${product.precio_base.toLocaleString('es-AR')}
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm font-semibold opacity-70 italic">
                          A consultar
                        </span>
                      )}

                      {product.gestiona_stock && (
                        <span className="text-[10px] sm:text-[11px] opacity-60">
                          {(product.stock ?? 0) > 0 ? `${product.stock} disp.` : 'A pedido'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botón de Acción según si tiene precio o no */}
                <div className="p-2.5 sm:p-4 pt-0">
                  {hasPrice && !isOutOfStock ? (
                    <button
                      type="button"
                      onClick={(e) => handleAddToCart(product, e)}
                      className={`min-h-[40px] w-full flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-white text-[11px] sm:text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98 ${
                        isAdded
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-[var(--color-primario)] hover:opacity-90'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>¡Agregado!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Agregar</span>
                        </>
                      )}
                    </button>
                  ) : productWaUrl ? (
                    <a
                      href={productWaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[40px] w-full flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl bg-[var(--color-primario)] text-white text-[11px] sm:text-xs font-bold hover:opacity-90 active:scale-98 transition-all shadow-xs"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {isOutOfStock ? 'Consultar stock' : 'Consultar'}
                      </span>
                    </a>
                  ) : (
                    <Link
                      href={`/tienda/productos/${product.slug}${tenantQuery}`}
                      className="min-h-[40px] w-full flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl border border-black/15 dark:border-white/15 text-[11px] sm:text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                    >
                      <span>Consultar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Estado Vacío de Resultados de Búsqueda o Filtros */
        <div className="text-center py-12 sm:py-20 border border-dashed border-black/15 dark:border-white/15 rounded-3xl p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-primario)]/10 text-[var(--color-primario)] flex items-center justify-center mx-auto">
            <Package className="w-6 h-6 opacity-80" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold">No se encontraron productos</h3>
            <p className="text-xs sm:text-sm opacity-60 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedCategoryId !== 'todos'
                ? 'No encontramos coincidencias con los filtros aplicados. Intenta con otra palabra o categoría.'
                : 'Esta tienda está preparando sus productos para publicar muy pronto.'}
            </p>
          </div>

          {(searchQuery || selectedCategoryId !== 'todos') && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[var(--color-primario)] text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>Mostrar todos los productos</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
