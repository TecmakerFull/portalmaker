// =============================================================================
// PORTALMAKER — Vista Interactiva de Favoritos (Client Component)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import Link from 'next/link'
import type { Product, Store } from '@/types/database'
import { useCart } from '@/lib/cart-context'
import ProductCard from '../product-card'
import { Heart, ArrowRight } from 'lucide-react'

interface FavoritosClientProps {
  products: (Product & { category?: { nombre: string } | null })[]
  store: Store
  tenantQuery: string
}

export default function FavoritosClient({
  products,
  store,
  tenantQuery,
}: FavoritosClientProps) {
  const { favorites } = useCart()

  const withTenant = (path: string) => {
    if (!tenantQuery) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}${tenantQuery.replace('?', '')}`
  }

  const favoriteProducts = products.filter((p) => favorites.includes(p.id))

  return (
    <div className="space-y-8 min-h-[400px]">
      <div>
        <p className="eyebrow text-[var(--color-primario)]">TU SELECCIÓN PERSONAL</p>
        <h1 className="text-3xl sm:text-4xl font-medium font-[var(--font-heading)] mt-2 text-[var(--color-texto)]">
          Tus favoritos
        </h1>
        <p className="mt-2 text-xs sm:text-sm opacity-70 text-[var(--color-texto)]">
          Guarda las piezas que te inspiran y encuéntralas rápidamente cuando estés listo para encargar.
        </p>
      </div>

      {favoriteProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4 pt-2">
          {favoriteProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              store={store}
              tenantQuery={tenantQuery}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-black/15 dark:border-white/15 rounded-2xl bg-black/[0.01] dark:bg-white/[0.02]">
          <Heart className="mx-auto mb-4 w-10 h-10 text-[var(--color-primario)] opacity-50" />
          <h2 className="text-base sm:text-lg font-medium text-[var(--color-texto)]">
            El comienzo de una buena colección.
          </h2>
          <p className="mt-1.5 text-xs opacity-60 max-w-sm mx-auto">
            Todavía no has guardado ningún producto. Pulsa el corazón en cualquier pieza del catálogo.
          </p>
          <Link
            href={withTenant('/tienda')}
            className="mt-6 min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--color-primario)] text-white text-xs font-semibold inline-flex items-center gap-2 shadow-xs hover:opacity-95 cursor-pointer"
          >
            <span>Encuentra tus favoritos</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
