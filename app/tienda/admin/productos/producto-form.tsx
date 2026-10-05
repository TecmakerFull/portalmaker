// =============================================================================
// PORTALMAKER — Formulario de Producto (Crear / Editar) con Supabase Storage
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Product, Category, Store } from '@/types/database'
import { Upload, X, Loader2, ArrowLeft, Plus, Check, AlertCircle } from 'lucide-react'

interface ProductoFormProps {
  store: Store
  initialProduct?: Product | null
  categories: Category[]
  tenantQuery: string
}

export default function ProductoForm({
  store,
  initialProduct,
  categories,
  tenantQuery,
}: ProductoFormProps) {
  const router = useRouter()
  const isEditing = !!initialProduct

  // Estados del Formulario
  const [nombre, setNombre] = useState(initialProduct?.nombre ?? '')
  const [slug, setSlug] = useState(initialProduct?.slug ?? '')
  const [descripcion, setDescripcion] = useState(initialProduct?.descripcion ?? '')
  const [precioBase, setPrecioBase] = useState(initialProduct?.precio_base?.toString() ?? '')
  const [categoryId, setCategoryId] = useState(initialProduct?.category_id ?? '')
  const [gestionaStock, setGestionaStock] = useState(initialProduct?.gestiona_stock ?? false)
  const [stock, setStock] = useState(initialProduct?.stock?.toString() ?? '10')
  const [sku, setSku] = useState(initialProduct?.sku ?? '')
  const [tiempoFabricacion, setTiempoFabricacion] = useState(initialProduct?.tiempo_fabricacion_estimado ?? '')
  const [destacado, setDestacado] = useState(initialProduct?.destacado ?? false)

  // Imágenes
  const [imagenes, setImagenes] = useState<string[]>(initialProduct?.imagenes ?? [])
  const [uploadingImage, setUploadingImage] = useState(false)

  // Categoría rápida
  const [showNuevaCategoria, setShowNuevaCategoria] = useState(false)
  const [nuevaCatNombre, setNuevaCatNombre] = useState('')
  const [loadingCat, setLoadingCat] = useState(false)
  const [categoryList, setCategoryList] = useState<Category[]>(categories)

  // Estados generales
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const supabase = createSupabaseBrowserClient()

  // Generación automática de slug
  const handleNombreChange = (val: string) => {
    setNombre(val)
    if (!isEditing) {
      const genSlug = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setSlug(genSlug)
    }
  }

  // Subida de foto a Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImage(true)
    setErrorMsg(null)

    try {
      const bucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'portalmaker-media'
      const newUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileExt = file.name.split('.').pop()
        const cleanExt = fileExt ? `.${fileExt}` : '.jpg'
        const filePath = `tiendas/${store.id}/productos/${Date.now()}-${Math.random().toString(36).substring(7)}${cleanExt}`

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, { cacheControl: '3600', upsert: true })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath)

        newUrls.push(publicUrl)
      }

      setImagenes((prev) => [...prev, ...newUrls])
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al subir la imagen. Verifica que el bucket de storage esté configurado.')
    } finally {
      setUploadingImage(false)
      // Reset input
      e.target.value = ''
    }
  }

  // Eliminar imagen de la lista
  const handleRemoveImage = (index: number) => {
    setImagenes((prev) => prev.filter((_, i) => i !== index))
  }

  // Crear categoría rápida
  const handleCrearCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevaCatNombre.trim()) return

    setLoadingCat(true)
    try {
      const catSlug = nuevaCatNombre.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')

      const { data, error } = await supabase
        .from('categories')
        .insert({
          store_id: store.id,
          nombre: nuevaCatNombre.trim(),
          slug: catSlug,
          orden: categoryList.length + 1,
        })
        .select()
        .single()

      if (error) throw error

      setCategoryList((prev) => [...prev, data as Category])
      setCategoryId(data.id)
      setNuevaCatNombre('')
      setShowNuevaCategoria(false)
    } catch (err: any) {
      alert(err?.message || 'Error al crear la categoría')
    } finally {
      setLoadingCat(false)
    }
  }

  // Guardar producto
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    try {
      const parsedPrecio = parseFloat(precioBase)
      if (isNaN(parsedPrecio) || parsedPrecio < 0) {
        throw new Error('El precio debe ser un número válido mayor o igual a 0.')
      }

      const payload = {
        store_id: store.id,
        nombre: nombre.trim(),
        slug: slug.trim().toLowerCase(),
        descripcion: descripcion.trim() || null,
        precio_base: parsedPrecio,
        category_id: categoryId ? categoryId : null,
        gestiona_stock: gestionaStock,
        stock: gestionaStock ? parseInt(stock) || 0 : null,
        sku: sku.trim() || null,
        tiempo_fabricacion_estimado: tiempoFabricacion.trim() || null,
        destacado: destacado,
        imagenes: imagenes,
        activo: true,
        visible: true,
      }

      if (isEditing && initialProduct) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', initialProduct.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('products')
          .insert(payload)

        if (error) throw error
      }

      router.push(`/tienda/admin/productos${tenantQuery}`)
      router.refresh()
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar el producto.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/tienda/admin/productos${tenantQuery}`}
          className="p-2 rounded-xl hover:bg-black/5 text-black/60 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black/90">
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </h1>
          <p className="text-xs text-black/50">
            {isEditing ? 'Modifica los datos y fotos del producto.' : 'Carga las fotos y detalles para publicar en tu tienda.'}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sección: Fotos del Producto */}
        <div className="bg-white rounded-2xl border border-black/10 p-5 sm:p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-black/90">Fotos del Producto</h2>
            <p className="text-xs text-black/50 mt-0.5">
              Sube fotos claras. La primera imagen será la foto principal del catálogo.
            </p>
          </div>

          {/* Grilla de imágenes cargadas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {imagenes.map((url, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-xl overflow-hidden border border-black/15 bg-black/5 group"
              >
                <img
                  src={url}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {index === 0 && (
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-[#6B8F71] text-white text-[10px] font-semibold">
                    Principal
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white hover:bg-red-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Botón para subir fotos */}
            <label className="aspect-square rounded-xl border-2 border-dashed border-black/20 hover:border-[#6B8F71] bg-black/[0.02] hover:bg-[#6B8F71]/5 cursor-pointer flex flex-col items-center justify-center p-4 text-center transition-all">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="hidden"
              />
              {uploadingImage ? (
                <div className="flex flex-col items-center gap-1.5 text-[#6B8F71]">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs font-medium">Subiendo...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-black/60">
                  <Upload className="w-6 h-6 text-[#6B8F71]" />
                  <span className="text-xs font-semibold text-black/80">Subir fotos</span>
                  <span className="text-[10px] text-black/40">JPG, PNG, WEBP</span>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Sección: Información Básica */}
        <div className="bg-white rounded-2xl border border-black/10 p-5 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-black/90">Información General</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-black/70 mb-1.5">
                Nombre del Producto *
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => handleNombreChange(e.target.value)}
                placeholder="Ej: Lámpara Luna Impresión 3D 15cm"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6B8F71]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-black/70 mb-1.5">
                Precio Base (ARS) *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-sm text-black/50 font-semibold">$</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={precioBase}
                  onChange={(e) => setPrecioBase(e.target.value)}
                  placeholder="15000"
                  className="w-full min-h-[44px] pl-8 pr-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6B8F71]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-black/70">
                  Categoría
                </label>
                <button
                  type="button"
                  onClick={() => setShowNuevaCategoria(!showNuevaCategoria)}
                  className="text-xs text-[#6B8F71] font-semibold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nueva</span>
                </button>
              </div>

              {showNuevaCategoria ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nuevaCatNombre}
                    onChange={(e) => setNuevaCatNombre(e.target.value)}
                    placeholder="Nombre categoría"
                    className="flex-1 min-h-[44px] px-3 py-2 text-xs rounded-xl border border-black/15 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleCrearCategoria}
                    disabled={loadingCat}
                    className="min-h-[44px] px-3 bg-[#6B8F71] text-white rounded-xl text-xs font-semibold hover:bg-[#58775d]"
                  >
                    {loadingCat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar'}
                  </button>
                </div>
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6B8F71]"
                >
                  <option value="">Sin categoría</option>
                  {categoryList.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-black/70 mb-1.5">
                Descripción del Producto
              </label>
              <textarea
                rows={4}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalla materiales, dimensiones, colores disponibles o cuidados..."
                className="w-full p-3.5 rounded-xl border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6B8F71]"
              />
            </div>
          </div>
        </div>

        {/* Sección: Stock y Modalidad */}
        <div className="bg-white rounded-2xl border border-black/10 p-5 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-black/90">Modalidad de Venta & Stock</h2>

          <div className="flex items-center justify-between p-4 rounded-xl border border-black/10 bg-black/[0.02]">
            <div>
              <p className="text-sm font-semibold text-black/90">Gestionar Stock</p>
              <p className="text-xs text-black/50">
                {gestionaStock
                  ? 'Tienes unidades limitadas. Al llegar a 0 se indicará sin stock.'
                  : 'Modo vitrina / bajo pedido. Los clientes consultarán disponibilidad.'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={gestionaStock}
              onChange={(e) => setGestionaStock(e.target.checked)}
              className="w-5 h-5 accent-[#6B8F71] rounded cursor-pointer"
            />
          </div>

          {gestionaStock && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-black/70 mb-1.5">
                  Cantidad en Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6B8F71]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-black/70 mb-1.5">
                  SKU / Código Interno (opcional)
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Ej: LAMP-LUNA-15"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6B8F71]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-black/70 mb-1.5">
              Tiempo estimado de fabricación (si es a pedido)
            </label>
            <input
              type="text"
              value={tiempoFabricacion}
              onChange={(e) => setTiempoFabricacion(e.target.value)}
              placeholder="Ej: 2 a 4 días hábiles"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6B8F71]"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-black/10 bg-black/[0.02]">
            <div>
              <p className="text-sm font-semibold text-black/90">Producto Destacado</p>
              <p className="text-xs text-black/50">
                Aparecerá en los primeros lugares de la grilla de tu tienda pública.
              </p>
            </div>
            <input
              type="checkbox"
              checked={destacado}
              onChange={(e) => setDestacado(e.target.checked)}
              className="w-5 h-5 accent-[#6B8F71] rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={`/tienda/admin/productos${tenantQuery}`}
            className="min-h-[44px] px-5 py-2.5 rounded-xl border border-black/15 text-sm font-medium hover:bg-black/5 transition-all text-black/80 flex items-center justify-center"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#6B8F71] text-white text-sm font-semibold hover:bg-[#58775d] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'Guardar Cambios' : 'Publicar Producto'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
