// =============================================================================
// PORTALMAKER — Gestor y Moderador de Reseñas de Productos (Client Component)
// El dueño de la tienda puede ver todas las reseñas recibidas y ocultar las que desee.
// =============================================================================

'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Store, ProductReview } from '@/types/database'
import {
  Star,
  Eye,
  EyeOff,
  Trash2,
  Search,
  MessageSquare,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle,
  Package,
} from 'lucide-react'

interface ReviewWithProduct extends ProductReview {
  product?: {
    id: string
    nombre: string
    slug: string
    imagenes?: string[]
  } | null
}

interface ResenasManagerProps {
  store: Store
  initialReviews: ReviewWithProduct[]
  tenantQuery: string
}

export default function ResenasManager({
  store,
  initialReviews,
  tenantQuery,
}: ResenasManagerProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [reviews, setReviews] = useState<ReviewWithProduct[]>(initialReviews)
  const [search, setSearch] = useState('')
  const [filterRating, setFilterRating] = useState<number | 'all'>('all')
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'visible' | 'hidden'>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Helper para URL de producto con tenant
  const withTenant = (path: string) => {
    if (!tenantQuery) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}${tenantQuery.replace('?', '')}`
  }

  // Métricas
  const totalReviews = reviews.length
  const visibleReviews = reviews.filter((r) => r.visible).length
  const hiddenReviews = reviews.filter((r) => !r.visible).length
  const avgRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : '0.0'

  // Filtrado
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const q = search.trim().toLowerCase()
      const matchesSearch =
        !q ||
        r.user_name.toLowerCase().includes(q) ||
        r.user_email.toLowerCase().includes(q) ||
        r.comentario.toLowerCase().includes(q) ||
        (r.product?.nombre && r.product.nombre.toLowerCase().includes(q))

      const matchesRating = filterRating === 'all' || r.rating === filterRating
      const matchesVisibility =
        filterVisibility === 'all' ||
        (filterVisibility === 'visible' && r.visible) ||
        (filterVisibility === 'hidden' && !r.visible)

      return matchesSearch && matchesRating && matchesVisibility
    })
  }, [reviews, search, filterRating, filterVisibility])

  // Alternar visibilidad de la reseña (Mostrar / Ocultar en la tienda pública)
  const handleToggleVisibility = async (review: ReviewWithProduct) => {
    setUpdatingId(review.id)
    const newStatus = !review.visible

    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({ visible: newStatus })
        .eq('id', review.id)
        .eq('store_id', store.id)

      if (error) throw error

      setReviews(
        reviews.map((r) => (r.id === review.id ? { ...r, visible: newStatus } : r))
      )
      router.refresh()
    } catch (err: any) {
      console.error('Error al cambiar visibilidad de reseña:', err)
      alert(err.message || 'No se pudo actualizar la reseña.')
    } finally {
      setUpdatingId(null)
    }
  }

  // Eliminar reseña permanentemente
  const handleDeleteReview = async (id: string) => {
    if (!confirm('¿Deseas eliminar permanentemente esta reseña?')) return

    try {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', id)
        .eq('store_id', store.id)

      if (error) throw error

      setReviews(reviews.filter((r) => r.id !== id))
      router.refresh()
    } catch (err: any) {
      console.error('Error al eliminar reseña:', err)
      alert(err.message || 'No se pudo eliminar la reseña.')
    }
  }

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Cabecera */}
      <div>
        <div className="flex items-center gap-2 text-[var(--color-primario)] mb-1">
          <Star className="w-5 h-5 fill-[var(--color-primario)]" />
          <span className="eyebrow text-[var(--color-primario)]">MODERACIÓN DE CONTENIDO</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold font-[var(--font-heading)] text-[var(--color-texto)]">
          Reseñas & Opiniones de Clientes
        </h1>
        <p className="mt-1 text-xs sm:text-sm opacity-70 text-[var(--color-texto)]">
          Cualquier usuario registrado en tu tienda puede calificar productos. Puedes ocultar cualquier reseña no deseada con un solo clic.
        </p>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs">
          <p className="text-[11px] font-medium opacity-60">Total de Reseñas</p>
          <p className="text-2xl font-bold mt-1 text-[var(--color-texto)]">{totalReviews}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs">
          <p className="text-[11px] font-medium opacity-60">Calificación Promedio</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-[var(--color-texto)]">{avgRating}</span>
            <div className="flex gap-0.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs">
          <p className="text-[11px] font-medium opacity-60">Visibles en Tienda</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{visibleReviews}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs">
          <p className="text-[11px] font-medium opacity-60">Ocultas por Admin</p>
          <p className="text-2xl font-bold mt-1 text-rose-500">{hiddenReviews}</p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por producto, cliente o palabra clave..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Filtro por Estrellas */}
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="h-11 px-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
          >
            <option value="all">Todas las estrellas</option>
            <option value="5">5 Estrellas</option>
            <option value="4">4 Estrellas</option>
            <option value="3">3 Estrellas</option>
            <option value="2">2 Estrellas</option>
            <option value="1">1 Estrella</option>
          </select>

          {/* Filtro por Visibilidad */}
          <select
            value={filterVisibility}
            onChange={(e) => setFilterVisibility(e.target.value as any)}
            className="h-11 px-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
          >
            <option value="all">Todas las reseñas</option>
            <option value="visible">Solo Visibles</option>
            <option value="hidden">Solo Ocultas</option>
          </select>
        </div>
      </div>

      {/* Lista de Reseñas */}
      <div className="space-y-3">
        {filteredReviews.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-xs opacity-60 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto opacity-30" />
            <p className="font-semibold text-sm">No hay reseñas con los filtros seleccionados</p>
            <p>Cuando los clientes dejen valoraciones en tus productos, aparecerán listadas aquí.</p>
          </div>
        ) : (
          filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-xs ${
                rev.visible
                  ? 'bg-[var(--color-superficie)] border-[var(--color-borde)]'
                  : 'bg-rose-500/[0.03] border-rose-500/20 opacity-80'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Información de la reseña */}
                <div className="space-y-2 flex-1">
                  {/* Producto de referencia */}
                  <div className="flex items-center gap-2.5 text-xs font-semibold">
                    {rev.product?.imagenes?.[0] ? (
                      <img
                        src={rev.product.imagenes[0]}
                        alt={rev.product.nombre}
                        className="w-7 h-7 rounded-lg object-cover border border-[var(--color-borde)] shrink-0"
                      />
                    ) : (
                      <Package className="w-3.5 h-3.5 text-[var(--color-primario)] shrink-0" />
                    )}
                    {rev.product ? (
                      <Link
                        href={withTenant(`/tienda/productos/${rev.product.slug}`)}
                        target="_blank"
                        className="text-[var(--color-primario)] hover:underline flex items-center gap-1"
                      >
                        <span>{rev.product.nombre}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                    ) : (
                      <span className="opacity-70">Producto de catálogo</span>
                    )}
                  </div>

                  {/* Estrellas y Usuario */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-xs text-[var(--color-texto)]">{rev.rating}/5</span>
                    <span className="text-xs opacity-50">·</span>
                    <span className="text-xs font-semibold text-[var(--color-texto)]">{rev.user_name}</span>
                    <span className="text-xs opacity-60 font-mono">({rev.user_email})</span>
                    <span className="text-xs opacity-50">·</span>
                    <span className="text-[11px] opacity-60">
                      {new Date(rev.created_at).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Comentario del cliente */}
                  <p className="text-xs sm:text-sm text-[var(--color-texto)] leading-relaxed pt-1">
                    &ldquo;{rev.comentario}&rdquo;
                  </p>
                </div>

                {/* Acciones de Moderación */}
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--color-borde)]">
                  {/* Botón Ocultar / Mostrar */}
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(rev)}
                    disabled={updatingId === rev.id}
                    title={rev.visible ? 'Ocultar esta reseña de la tienda pública' : 'Volver visible en la tienda pública'}
                    className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      rev.visible
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                    }`}
                  >
                    {updatingId === rev.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : rev.visible ? (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>Visible</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4" />
                        <span>Oculta</span>
                      </>
                    )}
                  </button>

                  {/* Botón Eliminar */}
                  <button
                    type="button"
                    onClick={() => handleDeleteReview(rev.id)}
                    title="Eliminar reseña permanentemente"
                    aria-label="Eliminar reseña"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
