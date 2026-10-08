// =============================================================================
// PORTALMAKER — Tabla Interactiva de Gestión de Productos y Variantes
// Permite control total de stock, relevamiento de precios y visibilidad
// tanto a nivel producto como en árbol de variantes expandibles in-line.
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
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  PlusCircle,
  AlertCircle,
  Lock,
  Sparkles,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'
import WhatsAppIcon from '@/app/tienda/sections/whatsapp-icon'

export interface ProductWithRelations extends Product {
  category?: {
    nombre: string
  } | null
  variants?: ProductVariant[]
}

interface ProductosTableProps {
  store: Store
  initialProducts: ProductWithRelations[]
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

  const [products, setProducts] = useState<ProductWithRelations[]>(initialProducts)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'visible' | 'hidden'>('all')

  // Control de expansión de variantes en el árbol
  const [expandedProducts, setExpandedProducts] = useState<{ [productId: string]: boolean }>({})

  const toggleExpand = (productId: string) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }))
  }

  // Estado del Modal de Edición Completo
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingDetails, setEditingDetails] = useState<ProductDetails | null>(null)
  const [editingVariants, setEditingVariants] = useState<ProductVariant[]>([])
  const [loadingModalData, setLoadingModalData] = useState(false)

  // Límite de productos configurado por plan
  const productLimit = store.limite_productos ?? 50
  const isLimitReached = products.length >= productLimit

  // Estado de feedback de guardado rápido: { [key]: boolean }
  const [savingField, setSavingField] = useState<{ [key: string]: boolean }>({})
  const [savedFeedback, setSavedFeedback] = useState<{ [key: string]: boolean }>({})

  // Estado para eliminar producto
  const [productToDelete, setProductToDelete] = useState<ProductWithRelations | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Estado para eliminar variante
  const [variantToDelete, setVariantToDelete] = useState<{ variant: ProductVariant; product: ProductWithRelations } | null>(null)
  const [deletingVariant, setDeletingVariant] = useState(false)

  // Abrir Modal de Edición Completo
  const handleOpenEditModal = async (product: ProductWithRelations) => {
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

      // 2. Obtener variantes actualizadas
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
    if (isLimitReached) {
      setIsLimitModalOpen(true)
      return
    }
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
    // Refrescar productos con variantes desde Supabase
    const { data: refreshedProds } = await supabase
      .from('products')
      .select('*, category:categories(nombre), variants:product_variants(*)')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })

    if (refreshedProds) {
      setProducts(refreshedProds as ProductWithRelations[])
    }
    startTransition(() => {
      router.refresh()
    })
  }

  // Actualización Rápida Inline de Producto Padre
  const handleQuickUpdate = async (
    productId: string,
    field: 'precio_base' | 'stock' | 'visible' | 'destacado' | 'category_id' | 'gestiona_stock',
    value: any
  ) => {
    const key = `${productId}_${field}`
    setSavingField((prev) => ({ ...prev, [key]: true }))

    try {
      // Actualización optimista
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
        .select('*, category:categories(nombre), variants:product_variants(*)')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
      if (fallbackProds) {
        setProducts(fallbackProds as ProductWithRelations[])
      }
    } finally {
      setSavingField((prev) => ({ ...prev, [key]: false }))
    }
  }

  // Actualización Rápida Inline de Variante Hija
  const handleVariantQuickUpdate = async (
    variantId: string,
    productId: string,
    field: 'stock' | 'precio_adicional' | 'activo' | 'nombre',
    value: any
  ) => {
    const key = `var_${variantId}_${field}`
    setSavingField((prev) => ({ ...prev, [key]: true }))

    try {
      // Actualización optimista local
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p
          const updatedVariants = (p.variants || []).map((v) => {
            if (v.id !== variantId) return v
            return { ...v, [field]: value }
          })
          return { ...p, variants: updatedVariants }
        })
      )

      const { error } = await supabase
        .from('product_variants')
        .update({ [field]: value })
        .eq('id', variantId)

      if (error) throw error

      setSavedFeedback((prev) => ({ ...prev, [key]: true }))
      setTimeout(() => {
        setSavedFeedback((prev) => ({ ...prev, [key]: false }))
      }, 2000)
    } catch (err) {
      console.error(`Error actualizando variante ${field}:`, err)
      // Revertir en caso de error
      const { data: refreshed } = await supabase
        .from('products')
        .select('*, category:categories(nombre), variants:product_variants(*)')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
      if (refreshed) {
        setProducts(refreshed as ProductWithRelations[])
      }
    } finally {
      setSavingField((prev) => ({ ...prev, [key]: false }))
    }
  }

  // Agregar Variante Rápida al Producto
  const handleQuickAddVariant = async (productId: string) => {
    try {
      const product = products.find((p) => p.id === productId)
      const existingCount = product?.variants?.length || 0
      const newVariantName = `Nueva Variante #${existingCount + 1}`

      const { data: newVar, error } = await supabase
        .from('product_variants')
        .insert({
          product_id: productId,
          nombre: newVariantName,
          precio_adicional: 0,
          stock: 0,
          activo: true,
          orden: existingCount,
        })
        .select()
        .single()

      if (error) throw error

      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p
          return { ...p, variants: [...(p.variants || []), newVar as ProductVariant] }
        })
      )

      // Auto-expandir el árbol de este producto
      setExpandedProducts((prev) => ({ ...prev, [productId]: true }))
    } catch (err) {
      console.error('Error al crear variante rápida:', err)
    }
  }

  // Confirmar Eliminación de Producto
  const handleConfirmDeleteProduct = async () => {
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

  // Confirmar Eliminación de Variante
  const handleConfirmDeleteVariant = async () => {
    if (!variantToDelete) return
    setDeletingVariant(true)

    try {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', variantToDelete.variant.id)

      if (error) throw error

      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== variantToDelete.product.id) return p
          return {
            ...p,
            variants: (p.variants || []).filter((v) => v.id !== variantToDelete.variant.id),
          }
        })
      )
      setVariantToDelete(null)
    } catch (err) {
      console.error('Error al eliminar variante:', err)
    } finally {
      setDeletingVariant(false)
    }
  }

  // Filtrado de productos en memoria
  const filteredProducts = products.filter((product) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesProduct =
      product.nombre.toLowerCase().includes(searchLower) ||
      (product.sku && product.sku.toLowerCase().includes(searchLower))

    // También buscar si coincide con el nombre de alguna variante
    const matchesVariants = (product.variants || []).some((v) =>
      v.nombre.toLowerCase().includes(searchLower)
    )

    const matchesCategory =
      !selectedCategoryFilter || product.category_id === selectedCategoryFilter

    const matchesStatus =
      selectedStatusFilter === 'all'
        ? true
        : selectedStatusFilter === 'visible'
        ? product.visible
        : !product.visible

    return (matchesProduct || matchesVariants) && matchesCategory && matchesStatus
  })

  const visibleCount = products.filter((p) => p.visible).length

  // Contar total de variantes globales
  const totalVariantsCount = products.reduce((acc, p) => acc + (p.variants?.length || 0), 0)

  // Metadatos de plan y cupo
  const planLabel =
    store.plan === 'starter'
      ? 'Plan Starter'
      : store.plan === 'enterprise'
      ? 'Plan Enterprise'
      : store.plan === 'bonificado'
      ? 'Plan Bonificado'
      : 'Plan Maker Pro'

  const usagePercent = Math.min(100, Math.round((products.length / productLimit) * 100))
  const isNearLimit = usagePercent >= 80 && !isLimitReached

  const superadminWaMsg = encodeURIComponent(
    `Hola Portalmaker! Me comunico desde mi tienda "${store.nombre}" (${store.slug}). Quisiera solicitar una ampliación del límite de productos o cambiar de plan. Actualmente tengo ${products.length}/${productLimit} productos cargados.`
  )
  const superadminWaUrl = `https://wa.me/5491136450073?text=${superadminWaMsg}`

  return (
    <div className="space-y-6">
      {/* Barra de Estadísticas y Botón Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-[var(--font-heading)]">
              Productos
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400/15 text-amber-700 dark:text-amber-400 border border-amber-400/20">
              {products.length} {products.length === 1 ? 'producto' : 'productos'}
            </span>
            {totalVariantsCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                {totalVariantsCount} variantes
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm opacity-70 mt-1">
            Control de stock, precios y visibilidad en tiempo real. Gestiona productos y variantes en árbol.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          style={{ color: '#1F2937' }}
          className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold active:scale-98 transition-all shadow-xs cursor-pointer self-start sm:self-auto ${
            isLimitReached
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
              : 'bg-[#FACC15] text-[#1F2937] hover:bg-[#eab308]'
          }`}
        >
          {isLimitReached ? (
            <Lock className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4 text-[#1F2937]" />
          )}
          <span>{isLimitReached ? 'Límite Alcanzado (+)' : 'Nuevo Producto'}</span>
        </button>
      </div>

      {/* TARJETA DE CAPACIDAD Y BARRA DE PROGRESO */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isLimitReached
          ? 'bg-red-50/70 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'
          : isNearLimit
          ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
          : 'bg-[var(--color-superficie)] border-[var(--color-borde)] shadow-2xs'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-amber-500" />
              <span>Capacidad del Catálogo</span>
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-black/5 dark:bg-white/10 text-slate-800 dark:text-slate-200">
              {planLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className={isLimitReached ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-700 dark:text-slate-300'}>
              {products.length} de {productLimit} productos ({usagePercent}%)
            </span>
          </div>
        </div>

        {/* Barra de progreso interactiva */}
        <div className="w-full h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isLimitReached
                ? 'bg-red-500'
                : usagePercent >= 80
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>

        {/* Mensaje de estado & Botón de solicitar ampliación */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-1 text-xs">
          <div>
            {isLimitReached ? (
              <p className="text-red-700 dark:text-red-300 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Has alcanzado el límite máximo de {productLimit} productos de tu plan actual.</span>
              </p>
            ) : isNearLimit ? (
              <p className="text-amber-700 dark:text-amber-300 font-medium">
                Te quedan {productLimit - products.length} productos disponibles para publicar.
              </p>
            ) : (
              <p className="opacity-70">
                Dispones de {productLimit - products.length} productos más en tu plan actual.
              </p>
            )}
          </div>

          <a
            href={superadminWaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 hover:underline hover:text-emerald-800 dark:hover:text-emerald-300 shrink-0 cursor-pointer"
          >
            <WhatsAppIcon className="w-3.5 h-3.5" />
            <span>{isLimitReached ? 'Solicitar Ampliación de Plan' : 'Ampliar cupo / Subir plan'}</span>
          </a>
        </div>
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
              placeholder="Buscar por nombre, SKU o nombre de variante..."
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

      {/* Tabla de Productos con Árbol de Variantes / Vista Desktop & Mobile */}
      {filteredProducts.length > 0 ? (
        <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] shadow-xs overflow-hidden">
          {/* VISTA TABLA (Desktop & Tablets grandes) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-borde)] bg-[var(--color-fondo)]/40 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold">
                  <th className="py-3.5 px-4 w-16 text-center">Foto</th>
                  <th className="py-3.5 px-4 min-w-[220px]">Producto / Variante</th>
                  <th className="py-3.5 px-4 min-w-[130px]">Categoría</th>
                  <th className="py-3.5 px-4 w-36">Precio (ARS)</th>
                  <th className="py-3.5 px-4 w-32">Stock</th>
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

                  const hasVariants = product.variants && product.variants.length > 0
                  const isExpanded = expandedProducts[product.id] ?? (Boolean(searchTerm) && hasVariants)
                  const totalVariantStock = (product.variants || []).reduce(
                    (acc, v) => acc + (v.stock ?? 0),
                    0
                  )

                  return (
                    <div key={product.id} className="contents">
                      {/* FILA PRINCIPAL: PRODUCTO PADRE */}
                      <tr className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
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

                        {/* Nombre, SKU y Toggle de Variantes */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(product)}
                              className="text-left font-semibold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors line-clamp-1 cursor-pointer"
                            >
                              {product.nombre}
                            </button>

                            {/* Badge y botón para desplegar variantes */}
                            {hasVariants ? (
                              <button
                                type="button"
                                onClick={() => toggleExpand(product.id)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                                  isExpanded
                                    ? 'bg-amber-400 text-[#1F2937] font-bold'
                                    : 'bg-amber-400/15 text-amber-700 dark:text-amber-300 hover:bg-amber-400/30'
                                }`}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                                <span>{product.variants!.length} var.</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleQuickAddVariant(product.id)}
                                title="Agregar variante a este producto"
                                className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-500 hover:text-amber-600 hover:bg-amber-400/10 transition-all cursor-pointer"
                              >
                                <PlusCircle className="w-3 h-3" />
                                <span>+ Variante</span>
                              </button>
                            )}
                          </div>

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

                        {/* Precio Base Editable In-Line */}
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
                                  ;(e.target as HTMLInputElement).blur()
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

                        {/* Stock Editable In-Line (o Resumen de Variantes) */}
                        <td className="py-3 px-4">
                          {hasVariants ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(product.id)}
                              className="text-left group/stk cursor-pointer"
                              title="El stock se gestiona por variante. Clic para ver desglose."
                            >
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white group-hover/stk:text-amber-600">
                                <span>{totalVariantStock} u. total</span>
                                <ChevronDown className="w-3 h-3 opacity-60" />
                              </div>
                              <span className="text-[10px] text-slate-500 block">
                                en {product.variants!.length} variantes
                              </span>
                            </button>
                          ) : product.gestiona_stock ? (
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
                                    ;(e.target as HTMLInputElement).blur()
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
                              className="text-[11px] font-medium px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-400/20 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer"
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
                              title="Editar todos los detalles y fotos"
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

                      {/* SUB-FILAS DEL ÁRBOL DE VARIANTES */}
                      {hasVariants && isExpanded && (
                        <>
                          {product.variants!.map((variant, varIdx) => {
                            const varPriceSaving = savingField[`var_${variant.id}_precio_adicional`]
                            const varPriceSaved = savedFeedback[`var_${variant.id}_precio_adicional`]
                            const varStockSaving = savingField[`var_${variant.id}_stock`]
                            const varStockSaved = savedFeedback[`var_${variant.id}_stock`]
                            const varNameSaving = savingField[`var_${variant.id}_nombre`]
                            const varNameSaved = savedFeedback[`var_${variant.id}_nombre`]

                            const calculatedTotalPrice = (product.precio_base || 0) + (variant.precio_adicional || 0)
                            const varImage = variant.imagen_url || firstImage

                            return (
                              <tr
                                key={variant.id}
                                className="bg-slate-50/60 dark:bg-slate-900/30 hover:bg-amber-500/5 transition-colors border-l-4 border-l-amber-400"
                              >
                                {/* Foto de la Variante */}
                                <td className="py-2.5 px-4 text-center pl-6">
                                  <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 inline-flex items-center justify-center shrink-0">
                                    {varImage ? (
                                      <img
                                        src={varImage}
                                        alt={variant.nombre}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <ImageIcon className="w-4 h-4 opacity-40 text-slate-400" />
                                    )}
                                  </div>
                                </td>

                                {/* Nombre Editable de Variante + Conector de Árbol */}
                                <td className="py-2.5 px-4">
                                  <div className="flex items-center gap-2">
                                    <CornerDownRight className="w-3.5 h-3.5 text-amber-500 shrink-0 opacity-80" />
                                    <div className="relative flex-1 max-w-xs flex items-center">
                                      <input
                                        type="text"
                                        defaultValue={variant.nombre}
                                        onBlur={(e) => {
                                          const val = e.target.value.trim()
                                          if (val && val !== variant.nombre) {
                                            handleVariantQuickUpdate(variant.id, product.id, 'nombre', val)
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            ;(e.target as HTMLInputElement).blur()
                                          }
                                        }}
                                        className="w-full px-2 py-1 text-xs font-medium rounded-md border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-amber-400 focus:bg-white dark:focus:bg-slate-800 bg-transparent text-slate-900 dark:text-white transition-all"
                                      />
                                      {varNameSaving && (
                                        <Loader2 className="w-3 h-3 animate-spin text-amber-500 absolute right-1.5" />
                                      )}
                                      {varNameSaved && (
                                        <Check className="w-3 h-3 text-emerald-500 absolute right-1.5" />
                                      )}
                                    </div>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-700 dark:text-amber-400 font-medium">
                                      Var #{varIdx + 1}
                                    </span>
                                  </div>
                                </td>

                                {/* Categoría: Heredada */}
                                <td className="py-2.5 px-4 text-xs text-slate-400 italic">
                                  Heredada
                                </td>

                                {/* Precio Final de Variante Editable */}
                                <td className="py-2.5 px-4">
                                  <div className="relative flex items-center">
                                    <span className="absolute left-2.5 text-xs opacity-50 font-bold">$</span>
                                    <input
                                      type="number"
                                      step="any"
                                      defaultValue={calculatedTotalPrice}
                                      onBlur={(e) => {
                                        const newTotal = parseFloat(e.target.value) || 0
                                        const newAdicional = newTotal - (product.precio_base || 0)
                                        if (newAdicional !== variant.precio_adicional) {
                                          handleVariantQuickUpdate(
                                            variant.id,
                                            product.id,
                                            'precio_adicional',
                                            newAdicional
                                          )
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          ;(e.target as HTMLInputElement).blur()
                                        }
                                      }}
                                      className="w-full pl-6 pr-6 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all"
                                    />
                                    {varPriceSaving && (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 absolute right-2" />
                                    )}
                                    {varPriceSaved && (
                                      <Check className="w-3.5 h-3.5 text-emerald-500 absolute right-2" />
                                    )}
                                  </div>
                                  {variant.precio_adicional !== 0 && (
                                    <span className="text-[10px] text-slate-500 block mt-0.5 pl-1">
                                      {variant.precio_adicional > 0 ? `+ $${variant.precio_adicional}` : `- $${Math.abs(variant.precio_adicional)}`} respecto a base
                                    </span>
                                  )}
                                </td>

                                {/* Stock de Variante Editable In-Line */}
                                <td className="py-2.5 px-4">
                                  <div className="relative flex items-center">
                                    <input
                                      type="number"
                                      min="0"
                                      defaultValue={variant.stock ?? 0}
                                      onBlur={(e) => {
                                        const val = parseInt(e.target.value) || 0
                                        if (val !== variant.stock) {
                                          handleVariantQuickUpdate(variant.id, product.id, 'stock', val)
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          ;(e.target as HTMLInputElement).blur()
                                        }
                                      }}
                                      className={`w-full px-2.5 pr-6 py-1 text-xs font-bold rounded-lg border transition-all focus:outline-none focus:border-amber-400 ${
                                        (variant.stock ?? 0) > 0
                                          ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                                          : 'border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                                      }`}
                                    />
                                    {varStockSaving && (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 absolute right-2" />
                                    )}
                                    {varStockSaved && (
                                      <Check className="w-3.5 h-3.5 text-emerald-500 absolute right-2" />
                                    )}
                                  </div>
                                </td>

                                {/* Activo / Oculto de Variante */}
                                <td className="py-2.5 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleVariantQuickUpdate(
                                        variant.id,
                                        product.id,
                                        'activo',
                                        !variant.activo
                                      )
                                    }
                                    title={variant.activo ? 'Variante activa (Clic para pausar)' : 'Variante pausada (Clic para activar)'}
                                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer ${
                                      variant.activo
                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                    }`}
                                  >
                                    {variant.activo ? (
                                      <>
                                        <Eye className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                        <span>Activa</span>
                                      </>
                                    ) : (
                                      <>
                                        <EyeOff className="w-3 h-3 text-slate-400" />
                                        <span>Oculta</span>
                                      </>
                                    )}
                                  </button>
                                </td>

                                {/* Destacado: N/A */}
                                <td className="py-2.5 px-4 text-center text-slate-300 dark:text-slate-700">
                                  —
                                </td>

                                {/* Acciones de Variante */}
                                <td className="py-2.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditModal(product)}
                                      title="Editar variante en el formulario completo"
                                      className="p-1.5 rounded-lg hover:bg-amber-400/15 text-slate-500 hover:text-amber-600 transition-colors cursor-pointer"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setVariantToDelete({ variant, product })}
                                      title="Eliminar esta variante"
                                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}

                          {/* Botón rápido "+ Agregar Variante" al final del árbol */}
                          <tr className="bg-slate-50/40 dark:bg-slate-900/20 border-l-4 border-l-amber-400/40">
                            <td colSpan={8} className="py-2 px-6">
                              <button
                                type="button"
                                onClick={() => handleQuickAddVariant(product.id)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 hover:underline cursor-pointer"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>+ Agregar otra variante a {product.nombre}</span>
                              </button>
                            </td>
                          </tr>
                        </>
                      )}
                    </div>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* VISTA MOBILE (Tarjetas y Árbol Adaptado para Touch >= 44px) */}
          <div className="md:hidden divide-y divide-[var(--color-borde)]">
            {filteredProducts.map((product) => {
              const firstImage = product.imagenes && product.imagenes.length > 0 ? product.imagenes[0] : null
              const hasVariants = product.variants && product.variants.length > 0
              const isExpanded = expandedProducts[product.id] ?? (Boolean(searchTerm) && hasVariants)
              const totalVariantStock = (product.variants || []).reduce(
                (acc, v) => acc + (v.stock ?? 0),
                0
              )

              return (
                <div key={product.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {/* Foto clickeable */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(product)}
                      className="relative w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black/5 dark:bg-white/5 shrink-0 cursor-pointer"
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
                          className="p-2 text-slate-300 dark:text-slate-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              product.destacado ? 'text-amber-400 fill-amber-400' : ''
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                          ${product.precio_base.toLocaleString('es-AR')}
                        </span>
                        {product.category && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 opacity-75">
                            {product.category.nombre}
                          </span>
                        )}
                        {hasVariants && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 font-semibold">
                            {product.variants!.length} var. ({totalVariantStock} u.)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Toggle de Despliegue de Variantes en Mobile */}
                  {hasVariants && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => toggleExpand(product.id)}
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4" />
                          <span>
                            {isExpanded ? 'Ocultar' : 'Ver'} {product.variants!.length} variantes (Stock total: {totalVariantStock} u.)
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      {/* Lista Árbol de Variantes Mobile */}
                      {isExpanded && (
                        <div className="mt-2 space-y-2 pl-3 border-l-2 border-amber-400">
                          {product.variants!.map((variant) => {
                            const calculatedTotalPrice =
                              (product.precio_base || 0) + (variant.precio_adicional || 0)

                            return (
                              <div
                                key={variant.id}
                                className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {variant.nombre}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleVariantQuickUpdate(
                                        variant.id,
                                        product.id,
                                        'activo',
                                        !variant.activo
                                      )
                                    }
                                    className={`px-2 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                                      variant.activo
                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                    }`}
                                  >
                                    {variant.activo ? 'Activa' : 'Oculta'}
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">
                                      Precio ($)
                                    </label>
                                    <input
                                      type="number"
                                      step="any"
                                      defaultValue={calculatedTotalPrice}
                                      onBlur={(e) => {
                                        const newTotal = parseFloat(e.target.value) || 0
                                        const newAdicional = newTotal - (product.precio_base || 0)
                                        if (newAdicional !== variant.precio_adicional) {
                                          handleVariantQuickUpdate(
                                            variant.id,
                                            product.id,
                                            'precio_adicional',
                                            newAdicional
                                          )
                                        }
                                      }}
                                      className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">
                                      Stock
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      defaultValue={variant.stock ?? 0}
                                      onBlur={(e) => {
                                        const val = parseInt(e.target.value) || 0
                                        if (val !== variant.stock) {
                                          handleVariantQuickUpdate(variant.id, product.id, 'stock', val)
                                        }
                                      }}
                                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

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

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE PRODUCTO */}
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
                ¿Estás seguro de que deseas eliminar <strong>"{productToDelete.nombre}"</strong>? Se eliminarán también todas sus variantes y fotos asociadas. Esta acción no se puede deshacer.
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
                onClick={handleConfirmDeleteProduct}
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

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE VARIANTE */}
      {variantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold font-[var(--font-heading)] text-slate-900 dark:text-white">
                ¿Eliminar variante?
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                ¿Estás seguro de que deseas eliminar la variante <strong>"{variantToDelete.variant.nombre}"</strong> del producto <strong>"{variantToDelete.product.nombre}"</strong>?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-borde)]">
              <button
                type="button"
                disabled={deletingVariant}
                onClick={() => setVariantToDelete(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-sm font-semibold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingVariant}
                onClick={handleConfirmDeleteVariant}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {deletingVariant ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar Variante</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AVISO: LÍMITE DE PRODUCTOS ALCANZADO */}
      {isLimitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setIsLimitModalOpen(false)}
                className="p-2 rounded-xl opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold font-[var(--font-heading)] text-slate-900 dark:text-white">
                Límite de Productos Alcanzado
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Tu tienda actualmente está en el <strong>{planLabel}</strong> con un cupo de <strong>{productLimit} productos</strong> ({products.length} ya cargados).
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Para publicar nuevos productos, puedes solicitar una ampliación de tu plan por WhatsApp o eliminar productos que ya no comercialices.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-4 border-t border-[var(--color-borde)]">
              <button
                type="button"
                onClick={() => setIsLimitModalOpen(false)}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-sm font-semibold transition-all cursor-pointer text-center"
              >
                Cerrar
              </button>
              <a
                href={superadminWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#1F2937' }}
                className="w-full sm:flex-1 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] hover:bg-[#eab308] text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm text-center"
              >
                <WhatsAppIcon className="w-4 h-4 text-[#1F2937]" />
                <span>Solicitar Ampliación</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
