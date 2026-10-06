// =============================================================================
// PORTALMAKER — Tabla Interactiva de Gestión de Productos
// Permite edición rápida in-line (precios, stock, visibilidad, destacado)
// y edición profunda mediante modal completo al hacer clic en la imagen.
// =============================================================================

'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Product, Category, Store, ProductDetails, ProductVariant } from '@/types/database'
import ProductoForm from './producto-form'
import {
  Search,
  Plus,
  Package,
  Star,
  Eye,
  EyeOff,
  ExternalLink,
  Edit,
  Trash2,
  ImageIcon,
  Loader2,
  Check,
  Filter,
  X,
  Layers,
  ArrowUpDown,
} from 'lucide-react'

interface ProductWithCategory extends Product {
  category?: {
    nombre: string
  } | null
}

interface ProductosTableProps {
  store: Store
  initialProducts: ProductWithCategory[]
  categories: Category[]
  tenantQuery: string
}

export default function ProductosTable({
  store,
  initialProducts,
  categories,
  tenantQuery,
}: ProductosTableProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [isPending, startTransition] = useTransition()

  const [products, setProducts] = useState<ProductWithCategory[]>(initialProducts)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'visible' | 'hidden'>('all')

  // Estado del Modal de Edición Completo
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingDetails, setEditingDetails] = useState<ProductDetails | null>(null)
  const [editingVariants, setEditingVariants] = useState<ProductVariant[]>([])
  const [loadingModalData, setLoadingModalData] = useState(false)

  // Estado de feedback de guardado rápido por producto: { [productId_field]: boolean }
  const [savingField, setSavingField] = useState<{ [key: string]: boolean }>({})
  const [savedFeedback, setSavedFeedback] = useState<{ [key: string]: boolean }>({})

  // Estado para eliminar producto
  const [productToDelete, setProductToDelete] = useState<ProductWithCategory | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Abrir Modal de Edición Completo
  const handleOpenEditModal = async (product: ProductWithCategory) => {
    setEditingProduct(product)
    setIsModalOpen(true)
    setLoadingModalData(true)

    try {
      // 1. Obtener detalles extendidos (peso, dimensiones)
      const { data: details } = await supabase
        .from('product_details')
        .select('*')
        .eq('product_id', product.id)
        .maybeSingle()

      // 2. Obtener variantes
      const { data: variants } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', product.id)
        .order('orden', { ascending: true })

      setEditingDetails(details ?? null)
      setEditingVariants(variants ?? [])
    } catch (err) {
      console.error('Error al cargar datos adicionales del producto:', err)
    } finally {
      setLoadingModalData(false)
    }
  }

  // Abrir Modal para Crear Nuevo Producto
  const handleOpenCreateModal = () => {
    setEditingProduct(null)
    setEditingDetails(null)
    setEditingVariants([])
    setIsModalOpen(true)
  }

  // Cerrar Modal y Refrescar
  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingProduct(null)
    setEditingDetails(null)
    setEditingVariants([])
  }

  const handleModalSuccess = async () => {
    setIsModalOpen(false)
    setEditingProduct(null)
    // Refrescar productos desde Supabase
    const { data: refreshedProds } = await supabase
      .from('products')
      .select('*, category:categories(nombre)')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })

    if (refreshedProds) {
      setProducts(refreshedProds as ProductWithCategory[])
    }
    startTransition(() => {
      router.refresh()
    })
  }

  // Actualización Rápida Inline (Precio, Stock, Visible, Destacado, Categoría, Gestiona Stock)
  const handleQuickUpdate = async (
    productId: string,
    field: 'precio_base' | 'stock' | 'visible' | 'destacado' | 'category_id' | 'gestiona_stock',
    value: any
  ) => {
    const key = `${productId}_${field}`
    setSavingField((prev) => ({ ...prev, [key]: true }))

    try {
      // Optimistic update
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p
          if (field === 'category_id') {
            const cat = categories.find((c) => c.id === value)
            return { ...p, category_id: value, category: cat ? { nombre: cat.nombre } : null }
          }
          return { ...p, [field]: value }
        })
      )

      const { error } = await supabase
        .from('products')
        .update({ [field]: value })
        .eq('id', productId)

      if (error) throw error

      setSavedFeedback((prev) => ({ ...prev, [key]: true }))
      setTimeout(() => {
        setSavedFeedback((prev) => ({ ...prev, [key]: false }))
      }, 2000)
    } catch (err) {
      console.error(`Error actualizando ${field}:`, err)
      // Revertir recargando los datos
      const { data: fallbackProds } = await supabase
        .from('products')
        .select('*, category:categories(nombre)')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
      if (fallbackProds) {
        setProducts(fallbackProds as ProductWithCategory[])
      }
    } finally {
      setSavingField((prev) => ({ ...prev, [key]: false }))
    }
  }

  // Eliminar Producto
  const handleConfirmDelete = async () => {
    if (!productToDelete) return
    setDeleting(true)

    try {
      const { error } = await supabase.from('products').delete().eq('id', productToDelete.id)
      if (error) throw error

      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id))
      setProductToDelete(null)
      startTransition(() => {
        router.refresh()
      })
    } catch (err) {
      console.error('Error al eliminar producto:', err)
    } finally {
      setDeleting(false)
    }
  }

  // Filtrado de productos en memoria
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory =
      !selectedCategoryFilter || product.category_id === selectedCategoryFilter

    const matchesStatus =
      selectedStatusFilter === 'all'
        ? true
        : selectedStatusFilter === 'visible'
        ? product.visible
        : !product.visible

    return matchesSearch && matchesCategory && matchesStatus
  })

  const visibleCount = products.filter((p) => p.visible).length

  return (
    <div className="space-y-6">
      {/* Barra de Estadísticas y Botón Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-[var(--font-heading)]">
              Productos
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/20">
              {products.length} {products.length === 1 ? 'producto' : 'productos'}
            </span>
          </div>
          <p className="text-sm opacity-70 mt-1">
            Gestiona precios, stock y visibilidad al instante, o haz clic en cualquier foto para editar todos sus detalles.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          style={{ color: '#1F2937' }}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-bold hover:bg-[#eab308] active:scale-98 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-[#1F2937]" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-[var(--color-superficie)] rounded-2xl border border-[var(--color-borde)] p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Input Buscador */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o código SKU..."
              className="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por Categoría */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 cursor-pointer transition-all"
            >
              <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1">
                Todas las categorías
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1">
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Estado */}
          <div className="sm:col-span-3">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 cursor-pointer transition-all"
            >
              <option value="all" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1">
                Todos los estados ({products.length})
              </option>
              <option value="visible" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1">
                Solo visibles ({visibleCount})
              </option>
              <option value="hidden" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1">
                Solo ocultos ({products.length - visibleCount})
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Productos / Vista Desktop & Mobile */}
      {filteredProducts.length > 0 ? (
        <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] shadow-xs overflow-hidden">
          {/* VISTA TABLA (Pantallas Medianas y Grandes) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-borde)] bg-[var(--color-fondo)]/40 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold">
                  <th className="py-3.5 px-4 w-16 text-center">Foto</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Producto</th>
                  <th className="py-3.5 px-4 min-w-[140px]">Categoría</th>
                  <th className="py-3.5 px-4 w-36">Precio (ARS)</th>
                  <th className="py-3.5 px-4 w-28">Stock</th>
                  <th className="py-3.5 px-4 w-28 text-center">En Tienda</th>
                  <th className="py-3.5 px-4 w-20 text-center">Destacado</th>
                  <th className="py-3.5 px-4 w-28 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-borde)]">
                {filteredProducts.map((product) => {
                  const firstImage = product.imagenes && product.imagenes.length > 0 ? product.imagenes[0] : null
                  const priceSaving = savingField[`${product.id}_precio_base`]
                  const priceSaved = savedFeedback[`${product.id}_precio_base`]
                  const stockSaving = savingField[`${product.id}_stock`]
                  const stockSaved = savedFeedback[`${product.id}_stock`]

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                    >
                      {/* Foto con Click para abrir Modal */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(product)}
                          title="Hacer clic para editar fotos y detalles completos"
                          className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black/5 dark:bg-white/5 group-hover:border-amber-400 transition-all cursor-pointer inline-flex items-center justify-center shrink-0 shadow-2xs"
                        >
                          {firstImage ? (
                            <img
                              src={firstImage}
                              alt={product.nombre}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 opacity-40 text-slate-400" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Edit className="w-4 h-4 text-white" />
                          </div>
                        </button>
                      </td>

                      {/* Nombre y SKU */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(product)}
                          className="text-left font-semibold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors line-clamp-1 cursor-pointer"
                        >
                          {product.nombre}
                        </button>
                        <div className="flex items-center gap-2 mt-0.5 text-xs opacity-60">
                          {product.sku ? (
                            <span className="font-mono">SKU: {product.sku}</span>
                          ) : (
                            <span>Sin SKU</span>
                          )}
                          {product.imagenes && product.imagenes.length > 1 && (
                            <span className="text-[10px] bg-black/5 dark:bg-white/10 px-1.5 py-0.2 rounded font-medium">
                              {product.imagenes.length} fotos
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Categoría Rápida */}
                      <td className="py-3 px-4">
                        <select
                          value={product.category_id || ''}
                          onChange={(e) =>
                            handleQuickUpdate(product.id, 'category_id', e.target.value || null)
                          }
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer max-w-[130px] truncate"
                        >
                          <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                            Sin categoría
                          </option>
                          {categories.map((cat) => (
                            <option
                              key={cat.id}
                              value={cat.id}
                              className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            >
                              {cat.nombre}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Precio Editable In-Line */}
                      <td className="py-3 px-4">
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-xs opacity-50 font-bold">$</span>
                          <input
                            type="number"
                            step="any"
                            defaultValue={product.precio_base}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value) || 0
                              if (val !== product.precio_base) {
                                handleQuickUpdate(product.id, 'precio_base', val)
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur()
                              }
                            }}
                            className="w-full pl-6 pr-6 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all"
                          />
                          {priceSaving && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 absolute right-2" />
                          )}
                          {priceSaved && (
                            <Check className="w-3.5 h-3.5 text-emerald-500 absolute right-2" />
                          )}
                        </div>
                      </td>

                      {/* Stock Editable In-Line */}
                      <td className="py-3 px-4">
                        {product.gestiona_stock ? (
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              min="0"
                              defaultValue={product.stock ?? 0}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value) || 0
                                if (val !== product.stock) {
                                  handleQuickUpdate(product.id, 'stock', val)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur()
                                }
                              }}
                              className={`w-full px-2.5 pr-6 py-1.5 text-xs font-bold rounded-lg border transition-all focus:outline-none focus:border-amber-400 ${
                                (product.stock ?? 0) > 0
                                  ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                                  : 'border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                              }`}
                            />
                            {stockSaving && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 absolute right-2" />
                            )}
                            {stockSaved && (
                              <Check className="w-3.5 h-3.5 text-emerald-500 absolute right-2" />
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleQuickUpdate(product.id, 'gestiona_stock', true)}
                            title="Haz clic para activar control de stock"
                            className="text-[11px] font-medium px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-400/20 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                          >
                            Bajo pedido
                          </button>
                        )}
                      </td>

                      {/* Visible Switch */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleQuickUpdate(product.id, 'visible', !product.visible)}
                          title={product.visible ? 'Producto visible (Clic para pausar)' : 'Producto pausado (Clic para mostrar)'}
                          className={`min-h-[32px] px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                            product.visible
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {product.visible ? (
                            <>
                              <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Activo</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                              <span>Oculto</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Destacado Star */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleQuickUpdate(product.id, 'destacado', !product.destacado)}
                          title={product.destacado ? 'Quitar de destacados' : 'Marcar como producto destacado en portada'}
                          className={`p-2 rounded-xl transition-all cursor-pointer ${
                            product.destacado
                              ? 'text-amber-500 hover:text-amber-600 bg-amber-400/15'
                              : 'text-slate-300 dark:text-slate-600 hover:text-amber-400 hover:bg-black/5 dark:hover:bg-white/5'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${product.destacado ? 'fill-amber-400' : ''}`} />
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(product)}
                            title="Editar todos los detalles"
                            className="p-2 rounded-xl hover:bg-amber-400/15 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <Link
                            href={`/tienda/productos/${product.slug}${tenantQuery}`}
                            target="_blank"
                            title="Ver en tienda pública"
                            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => setProductToDelete(product)}
                            title="Eliminar producto"
                            className="p-2 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* VISTA MOBILE (Tarjetas Compactas Táctiles) */}
          <div className="md:hidden divide-y divide-[var(--color-borde)]">
            {filteredProducts.map((product) => {
              const firstImage = product.imagenes && product.imagenes.length > 0 ? product.imagenes[0] : null

              return (
                <div key={product.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {/* Foto clickeable */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(product)}
                      className="relative w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black/5 dark:bg-white/5 shrink-0"
                    >
                      {firstImage ? (
                        <img
                          src={firstImage}
                          alt={product.nombre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-40">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 p-1 bg-black/60 rounded-tl-lg text-white">
                        <Edit className="w-3 h-3" />
                      </div>
                    </button>

                    {/* Información Principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(product)}
                          className="text-left font-semibold text-sm line-clamp-1 text-slate-900 dark:text-white"
                        >
                          {product.nombre}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickUpdate(product.id, 'destacado', !product.destacado)}
                          className="p-1 text-slate-300 dark:text-slate-600"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              product.destacado ? 'text-amber-400 fill-amber-400' : ''
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-base font-black text-amber-600 dark:text-amber-400">
                          ${product.precio_base.toLocaleString('es-AR')}
                        </span>
                        {product.category && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 opacity-75">
                            {product.category.nombre}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones Rápidas Mobile (Touch Target >= 44px) */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-borde)]/60">
                    <button
                      type="button"
                      onClick={() => handleQuickUpdate(product.id, 'visible', !product.visible)}
                      className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
                        product.visible
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {product.visible ? (
                        <>
                          <Eye className="w-4 h-4" />
                          <span>Visible en tienda</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4" />
                          <span>Pausado</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(product)}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--color-borde)] text-xs font-semibold flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setProductToDelete(product)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[var(--color-borde)] text-red-600 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Estado Vacío */
        <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-10 sm:p-14 text-center max-w-lg mx-auto shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/20 text-amber-600 mx-auto flex items-center justify-center">
            <Package className="w-7 h-7" />
          </div>
          {searchTerm || selectedCategoryFilter || selectedStatusFilter !== 'all' ? (
            <div>
              <h2 className="text-lg font-bold mb-1 font-[var(--font-heading)]">No se encontraron productos</h2>
              <p className="text-xs opacity-70 mb-4">
                Prueba ajustando los términos de búsqueda o los filtros aplicados.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategoryFilter('')
                  setSelectedStatusFilter('all')
                }}
                className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold mb-1 font-[var(--font-heading)]">Tu catálogo está vacío</h2>
              <p className="text-sm opacity-70 mb-6">
                Comienza a subir tus productos con fotos, descripciones y precios para mostrarlos en tu tienda.
              </p>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                style={{ color: '#1F2937' }}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-bold hover:bg-[#eab308] transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#1F2937]" />
                <span>Crear mi primer producto</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL COMPLETO DE EDICIÓN / CREACIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-8 shadow-2xl space-y-6 my-auto">
            {loadingModalData ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-amber-600 dark:text-amber-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-sm font-medium">Cargando datos completos del producto...</span>
              </div>
            ) : (
              <ProductoForm
                store={store}
                initialProduct={editingProduct}
                initialDetails={editingDetails}
                initialVariants={editingVariants}
                categories={categories}
                tenantQuery={tenantQuery}
                isModal={true}
                onClose={handleModalClose}
                onSuccess={handleModalSuccess}
              />
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold font-[var(--font-heading)] text-slate-900 dark:text-white">
                ¿Eliminar producto?
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                ¿Estás seguro de que deseas eliminar <strong>"{productToDelete.nombre}"</strong>? Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-borde)]">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setProductToDelete(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-sm font-semibold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
