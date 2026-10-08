// =============================================================================
// PORTALMAKER — Vista Interactiva de Producto con Variantes, Stock y Carrito
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Product, Store, ProductVariant, ProductDetails } from '@/types/database'
import ProductGallery from './product-gallery'
import { useCart } from '@/lib/cart-context'
import { renderMarkdown } from '@/lib/markdown'
import {
  MessageSquare,
  Clock,
  Box,
  Layers,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import WhatsAppIcon from '../../sections/whatsapp-icon'

interface ProductDetailViewProps {
  product: Product & { category?: { nombre: string } | null }
  store: Store
  variants: ProductVariant[]
  details?: ProductDetails | null
}

export default function ProductDetailView({
  product,
  store,
  variants = [],
}: ProductDetailViewProps) {
  const router = useRouter()
  const { addItem, openCart } = useCart()

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    variants.length > 0 ? variants[0] : null
  )
  const [quantity, setQuantity] = useState(1)
  const [addedSuccess, setAddedSuccess] = useState(false)
  const [cartFeedback, setCartFeedback] = useState<string | null>(null)

  // Combinar imágenes del producto con imágenes de variantes para que todas estén accesibles en la galería
  const rawImages = product.imagenes && product.imagenes.length > 0 ? product.imagenes : []
  const variantImages = variants
    .map((v) => v.imagen_url)
    .filter((url): url is string => Boolean(url))

  // Lista única preservando orden
  const allImages = Array.from(new Set([...rawImages, ...variantImages]))

  // Manejar cambio de imagen desde la galería (ej: click en miniatura o flecha)
  const handleGalleryImageChange = (imageUrl: string) => {
    // Si la imagen seleccionada corresponde a una variante específica, sincronizamos la variante seleccionada
    const matchingVariant = variants.find((v) => v.imagen_url === imageUrl)
    if (matchingVariant && matchingVariant.id !== selectedVariant?.id) {
      setSelectedVariant(matchingVariant)
    }
  }

  // Cálculo del precio activo (incluyendo variación de precio de la variante si aplica)
  const additionalPrice = selectedVariant?.precio_adicional ?? 0
  const currentBasePrice = product.precio_base + additionalPrice
  const currentOfferPrice =
    product.precio_oferta !== null && product.precio_oferta !== undefined
      ? product.precio_oferta + additionalPrice
      : null

  const effectivePrice =
    product.oferta_activa && currentOfferPrice ? currentOfferPrice : currentBasePrice

  // Stock activo
  const hasVariantStock = selectedVariant && selectedVariant.stock !== null
  const currentStock = hasVariantStock ? selectedVariant.stock : product.stock
  const hasStock = !product.gestiona_stock || (currentStock ?? 0) > 0
  const isReserva = !product.gestiona_stock || (currentStock ?? 0) <= 0

  // Stepper de Cantidad
  const handleIncrement = () => {
    if (product.gestiona_stock && currentStock !== null && currentStock > 0) {
      if (quantity < currentStock) {
        setQuantity((q) => q + 1)
      }
    } else {
      setQuantity((q) => q + 1)
    }
  }

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1)
    }
  }

  // Agregar al Carrito
  const handleAddToCart = (andOpenCart: boolean = false) => {
    const itemToAdd = {
      productId: product.id,
      productSlug: product.slug,
      productName: product.nombre,
      imagenUrl: selectedVariant?.imagen_url || (rawImages.length > 0 ? rawImages[0] : null),
      variantId: selectedVariant?.id || null,
      variantName: selectedVariant?.nombre || null,
      unitPrice: effectivePrice,
      originalPrice: product.oferta_activa ? currentBasePrice : null,
      gestionaStock: product.gestiona_stock,
      stockDisponible: currentStock,
      isReserva: isReserva,
    }

    const res = addItem(itemToAdd, quantity)

    if (res.success) {
      setAddedSuccess(true)
      setCartFeedback('Producto agregado al carrito')
      setTimeout(() => {
        setAddedSuccess(false)
        setCartFeedback(null)
      }, 3000)

      if (andOpenCart) {
        openCart()
      }
    } else {
      setCartFeedback(res.message || 'No se pudo agregar más cantidad.')
    }
  }

  // Comprar / Reservar Ahora (Agrega y va directo a checkout)
  const handleBuyNow = () => {
    handleAddToCart(false)
    const tenantQuery = store.slug ? `?tenant=${store.slug}` : ''
    router.push(`/tienda/checkout${tenantQuery}`)
  }

  // Generar URL de WhatsApp con la variante y cantidad seleccionada
  const cleanPhone = store.whatsapp_numero ? store.whatsapp_numero.replace(/[^0-9]/g, '') : null
  const displayPriceText =
    product.precio_base === 0 && !product.gestiona_stock
      ? 'A consultar'
      : `$${effectivePrice.toLocaleString('es-AR')}`

  const variantText = selectedVariant ? ` (Opción: ${selectedVariant.nombre})` : ''
  const quantityText = quantity > 1 ? ` [Cantidad: ${quantity}]` : ''
  const whatsappMsg = `Hola ${store.nombre}! Me interesa el producto "${product.nombre}"${variantText}${quantityText} (${displayPriceText}). ¿Podrían darme más información?`
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}`
    : null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
      {/* Columna Izquierda: Galería Interactiva con Sincronización Bidireccional */}
      <div>
        <ProductGallery
          images={allImages}
          productName={product.nombre}
          selectedImageOverride={selectedVariant?.imagen_url}
          onImageChange={handleGalleryImageChange}
        />
      </div>

      {/* Columna Derecha: Información, Selección de Variantes, Stock y Compra */}
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

        {/* Precio */}
        <div className="flex items-baseline gap-3">
          {product.precio_base === 0 && !product.gestiona_stock ? (
            <span className="text-2xl sm:text-3xl font-bold text-[var(--color-primario)]">
              Precio a consultar
            </span>
          ) : product.oferta_activa && currentOfferPrice ? (
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-extrabold text-[var(--color-primario)]">
                ${currentOfferPrice.toLocaleString('es-AR')}
              </span>
              <span className="text-lg sm:text-xl line-through opacity-50">
                ${currentBasePrice.toLocaleString('es-AR')}
              </span>
            </div>
          ) : (
            <span className="text-3xl sm:text-4xl font-extrabold text-[var(--color-primario)]">
              ${currentBasePrice.toLocaleString('es-AR')}
            </span>
          )}
        </div>

        {/* Selector de Variantes / Atributos */}
        {variants.length > 0 && (
          <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider opacity-75 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[var(--color-primario)]" />
                <span>Opciones disponibles:</span>
              </label>
              {selectedVariant && (
                <span className="text-xs font-semibold text-[var(--color-primario)]">
                  {selectedVariant.nombre}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5">
              {variants.map((v) => {
                const isSelected = selectedVariant?.id === v.id
                const diff = v.precio_adicional || 0

                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedVariant(v)
                      setQuantity(1)
                    }}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--color-primario)] bg-[var(--color-primario)]/10 text-[var(--color-texto)] ring-2 ring-[var(--color-primario)]/30 shadow-xs scale-98'
                        : 'border-black/15 dark:border-white/15 hover:border-black/30 dark:hover:border-white/30 bg-black/[0.02] dark:bg-white/[0.02] opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* Miniatura si la variante tiene foto */}
                    {v.imagen_url && (
                      <span className="w-6 h-6 rounded-lg overflow-hidden shrink-0 border border-black/10 dark:border-white/10">
                        <img src={v.imagen_url} alt="" className="w-full h-full object-cover" />
                      </span>
                    )}

                    <span>{v.nombre}</span>

                    {/* Indicador de diferencia de precio */}
                    {diff !== 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          diff > 0
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                        }`}
                      >
                        {diff > 0
                          ? `+$${diff.toLocaleString('es-AR')}`
                          : `-$${Math.abs(diff).toLocaleString('es-AR')}`}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Selector de Cantidad y Botones de Carrito / Compra */}
        <div className="pt-3 border-t border-black/10 dark:border-white/10 space-y-3.5">
          {/* Fila con Stepper de Cantidad */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold uppercase tracking-wider opacity-70">Cantidad:</span>
            <div className="flex items-center border border-black/15 dark:border-white/15 rounded-xl bg-black/[0.03] dark:bg-white/[0.04]">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={quantity <= 1}
                className="w-10 h-10 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-40"
                title="Disminuir cantidad"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center font-bold text-sm select-none">{quantity}</span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={
                  product.gestiona_stock && currentStock !== null && currentStock > 0
                    ? quantity >= currentStock
                    : false
                }
                className="w-10 h-10 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-40"
                title="Aumentar cantidad"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {product.gestiona_stock && (
              <span className="text-xs opacity-60">
                {(currentStock ?? 0) > 0 ? `${currentStock} disponibles` : 'Bajo pedido'}
              </span>
            )}
          </div>

          {/* Feedback de Carrito */}
          {cartFeedback && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
              <Check className="w-4 h-4 shrink-0" />
              <span>{cartFeedback}</span>
            </div>
          )}

          {/* Botones Principales de Compra / Carrito */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Botón Agregar al Carrito */}
            <button
              type="button"
              onClick={() => handleAddToCart(false)}
              className={`min-h-[50px] w-full px-5 py-3 rounded-2xl border-2 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-xs ${
                addedSuccess
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-[var(--color-primario)] text-[var(--color-primario)] hover:bg-[var(--color-primario)]/10'
              }`}
            >
              {addedSuccess ? (
                <>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Producto agregado</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span>Agregar al carrito</span>
                </>
              )}
            </button>

            {/* Botón Comprar / Reservar Ahora */}
            <button
              type="button"
              onClick={handleBuyNow}
              className="min-h-[50px] w-full px-5 py-3 rounded-2xl bg-[var(--color-primario)] text-white font-bold text-xs sm:text-sm hover:opacity-90 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-md"
            >
              <span>{isReserva ? 'Reservar Ahora' : 'Comprar Ahora'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Consulta rápida por WhatsApp */}
          {whatsappUrl && (
            <div className="pt-1">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold transition-all border border-emerald-500/20"
              >
                <WhatsAppIcon className="w-4 h-4 shrink-0" />
                <span>¿Dudas? Consultar directamente por WhatsApp</span>
              </a>
            </div>
          )}
        </div>

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
                  {(currentStock ?? 0) > 0 ? `${currentStock} unidades` : 'Bajo pedido'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Descripción con formato enriquecido */}
        {product.descripcion && (
          <div className="pt-5 border-t border-black/10 dark:border-white/10 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider opacity-60">
              Descripción del Producto
            </h3>
            <div className="space-y-2 text-[var(--color-texto)] font-[var(--font-body)]">
              {renderMarkdown(product.descripcion)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
