// =============================================================================
// PORTALMAKER — Vista Interactiva de Catálogo (Estilo TiendaDemo)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import type { Product, Category, Store } from '@/types/database'
import ProductCard from './product-card'
import { Search, X, ArrowRight } from 'lucide-react'

interface CatalogViewProps {
  products: (Product & { category?: { nombre: string } | null })[]
  categories: Category[]
  store: Store
  tenantQuery: string
  initialQuery?: string
  initialCategory?: string
  initialOffer?: boolean
  showAllHeader?: boolean
}

// Helper para normalizar texto eliminando tildes y diacríticos (ej: "impresión" -> "impresion")
function normalizeSearchText(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export default function CatalogView({
  products = [],
  categories = [],
  store,
  tenantQuery,
  initialQuery = '',
  initialCategory = 'Todos',
  initialOffer = false,
  showAllHeader = false,
}: CatalogViewProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory)
  const [onlyOffers, setOnlyOffers] = useState(initialOffer)

  // Sincronizar estado cuando cambian los props (ej: submit desde el header o navegación)
  useEffect(() => {
    setSearchQuery(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    setSelectedCategory(initialCategory)
  }, [initialCategory])

  useEffect(() => {
    setOnlyOffers(initialOffer)
  }, [initialOffer])

  // Si se ingresó con un término de búsqueda, scrollear suavemente al catálogo
  useEffect(() => {
    if (initialQuery) {
      const el = document.getElementById('catalogo')
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 150)
      }
    }
  }, [initialQuery])

  // Filtrado reactivo por categoría, búsqueda insensible a tildes y ofertas
  const filteredProducts = useMemo(() => {
    const qNorm = normalizeSearchText(searchQuery)
    const terms = qNorm.split(/\s+/).filter(Boolean)

    return products.filter((product) => {
      // 1. Filtro por categoría seleccionada
      if (selectedCategory !== 'Todos') {
        const matchesCategory =
          product.category?.nombre?.toLowerCase() === selectedCategory.toLowerCase() ||
          product.category_id === selectedCategory
        if (!matchesCategory) return false
      }

      // 2. Filtro solo ofertas
      if (onlyOffers) {
        if (!product.oferta_activa || !product.precio_oferta) return false
      }

      // 3. Filtro por palabras de búsqueda (insensible a mayúsculas y acentos)
      if (terms.length > 0) {
        const searchable = normalizeSearchText(
          `${product.nombre} ${product.descripcion || ''} ${product.sku || ''} ${
            product.category?.nombre || ''
          }`
        )
        const matchesAll = terms.every((t) => searchable.includes(t))
        if (!matchesAll) return false
      }

      return true
    })
  }, [products, searchQuery, selectedCategory, onlyOffers])

  // Limpiar filtros y actualizar la URL sin recargar
  const handleReset = () => {
    setSearchQuery('')
    setSelectedCategory('Todos')
    setOnlyOffers(false)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('q')
      url.searchParams.delete('categoria')
      url.searchParams.delete('oferta')
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash)
    }
  }

  // URL con tenant
  const withTenant = (path: string) => {
    if (!tenantQuery) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}${tenantQuery.replace('?', '')}`
  }

  const isSearching = searchQuery.trim().length > 0

  return (
    <section className="space-y-6 sm:space-y-8">
      {/* Encabezado de Sección con retroalimentación clara de búsqueda */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div>
          <p className="eyebrow text-muted-foreground opacity-60">
            {isSearching
              ? 'BÚSQUEDA EN CATÁLOGO'
              : showAllHeader
              ? 'CATÁLOGO COMPLETO'
              : 'CURADOS PARA TI'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-medium font-[var(--font-heading)] mt-1.5 text-[var(--color-texto)]">
            {isSearching
              ? `Resultados para "${searchQuery.trim()}"`
              : showAllHeader
              ? 'Nuestra colección'
              : 'Tus próximos favoritos'}
          </h2>
          <p className="mt-2 text-xs sm:text-sm opacity-70 text-[var(--color-texto)]">
            {isSearching
              ? `Mostrando ${filteredProducts.length} ${
                  filteredProducts.length === 1 ? 'producto encontrado' : 'productos encontrados'
                }.`
              : 'Diseño, calidad y esos detalles que marcan la diferencia.'}
          </p>
        </div>

        {isSearching ? (
          <button
            type="button"
            onClick={handleReset}
            className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[var(--color-primario-legible)] hover:opacity-80 transition-opacity cursor-pointer"
          >
            <span>Ver toda la colección</span>
            <X className="w-4 h-4" />
          </button>
        ) : !showAllHeader ? (
          <Link
            href={withTenant('/tienda')}
            className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[var(--color-texto)] hover:text-[var(--color-primario)] transition-colors cursor-pointer"
          >
            <span className="hidden sm:inline">Ver todos los productos</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : null}
      </div>

      {/* Pills de Categorías y Buscador Rápido */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Pills desplazables horizontalmente */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedCategory('Todos')}
              className={`category-link text-xs transition-all ${
                selectedCategory === 'Todos'
                  ? 'bg-[var(--color-primario)] text-[var(--color-primario-texto)] shadow-xs font-semibold'
                  : 'border border-black/15 dark:border-white/15 bg-[var(--color-superficie)] opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              Todos
            </button>

            {categories.map((cat) => {
              const isActive = selectedCategory === cat.nombre || selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.nombre)}
                  className={`category-link text-xs transition-all ${
                    isActive
                      ? 'bg-[var(--color-primario)] text-[var(--color-primario-texto)] shadow-xs font-semibold'
                      : 'border border-black/15 dark:border-white/15 bg-[var(--color-superficie)] opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {cat.nombre}
                </button>
              )
            })}
          </div>

          {/* Campo de búsqueda rápida */}
          <div className="relative w-full sm:w-64 md:w-72 shrink-0">
            <Search className="w-3.5 h-3.5 absolute inset-y-0 left-3 my-auto opacity-50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar colección..."
              className="w-full h-9 pl-8 pr-8 rounded-full border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03] text-xs outline-none focus:border-[var(--color-primario)] focus:ring-1 focus:ring-[var(--color-primario)] transition-all text-[var(--color-texto)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute inset-y-0 right-2.5 my-auto h-5 w-5 flex items-center justify-center opacity-60 hover:opacity-100 cursor-pointer text-[var(--color-texto)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grilla de Productos */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4 pt-2">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              store={store}
              tenantQuery={tenantQuery}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-black/15 dark:border-white/15 rounded-2xl bg-black/[0.01] dark:bg-white/[0.02]">
          <Search className="mx-auto mb-3 w-8 h-8 opacity-40 text-[var(--color-primario)]" />
          <h3 className="text-base sm:text-lg font-medium text-[var(--color-texto)]">
            {isSearching
              ? `No encontramos productos para "${searchQuery.trim()}"`
              : 'No encontramos productos en esta categoría'}
          </h3>
          <p className="mt-1 text-xs opacity-60 max-w-sm mx-auto">
            Prueba con otra palabra clave o selecciona otra categoría.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-5 min-h-[40px] px-4 py-2 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-xs font-semibold cursor-pointer shadow-xs hover:opacity-95"
          >
            Ver toda la colección
          </button>
        </div>
      )}
    </section>
  )
}
