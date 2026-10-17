// =============================================================================
// PORTALMAKER — Vista Interactiva de Producto (Estilo TiendaDemo / Nöra)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Product, Store, ProductVariant, ProductDetails, ProductReview } from '@/types/database'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import ProductGallery from './product-gallery'
import ProductCard from '../../product-card'
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
  RotateCcw,
  Truck,
  Heart,
  Star,
  Sparkles,
  Loader2,
  User,
  AlertCircle,
  HelpCircle,
  ChevronDown,
} from 'lucide-react'
import WhatsAppIcon from '../../sections/whatsapp-icon'

interface ProductDetailViewProps {
  product: Product & { category?: { nombre: string } | null }
  store: Store
  variants: ProductVariant[]
  details?: ProductDetails | null
  relatedProducts?: (Product & { category?: { nombre: string } | null })[]
  initialReviews?: ProductReview[]
  tenantQuery?: string
}

export default function ProductDetailView({
  product,
  store,
  variants = [],
  details,
  relatedProducts = [],
  initialReviews = [],
  tenantQuery = '',
}: ProductDetailViewProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const { addItem, openCart, favorites, toggleFavorite, isFavorite } = useCart()

  const isFav = isFavorite(product.id)

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    variants.length > 0 ? variants[0] : null
  )
  const [variantImageOverride, setVariantImageOverride] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState<'descripcion' | 'tecnicos' | 'valoraciones' | 'faqs'>('descripcion')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)
  const [addedSuccess, setAddedSuccess] = useState(false)
  const [cartFeedback, setCartFeedback] = useState<string | null>(null)

  // Lista de preguntas frecuentes de la ficha técnica
  const faqsList: { pregunta: string; respuesta: string }[] = Array.isArray(details?.preguntas_frecuentes)
    ? (details.preguntas_frecuentes as { pregunta: string; respuesta: string }[])
    : []

  // Reseñas dinámicas y usuario actual
  const [reviewsList, setReviewsList] = useState<ProductReview[]>(initialReviews)
  const [currentUser, setCurrentUser] = useState<{ email: string; nombre: string } | null>(null)
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewSuccess, setReviewSuccess] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  // Consultar usuario logueado en la tienda al montar
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setCurrentUser({
          email: user.email,
          nombre: user.user_metadata?.nombre || user.email.split('@')[0],
        })
      }
    })
  }, [])

  // Promedio de estrellas
  const totalReviewsCount = reviewsList.length
  const avgRating = totalReviewsCount > 0
    ? (reviewsList.reduce((acc, r) => acc + r.rating, 0) / totalReviewsCount).toFixed(1)
    : null

  // Enviar nueva reseña
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return
    if (!newComment.trim()) return

    setSubmittingReview(true)
    setReviewError(null)

    try {
      const reviewPayload = {
        store_id: store.id,
        product_id: product.id,
        user_email: currentUser.email.toLowerCase(),
        user_name: currentUser.nombre,
        rating: newRating,
        comentario: newComment.trim(),
        visible: true,
      }

      const { data, error } = await supabase
        .from('product_reviews')
        .insert([reviewPayload])
        .select()
        .single()

      if (error) throw error

      setReviewsList([data as ProductReview, ...reviewsList])
      setNewComment('')
      setReviewSuccess(true)
      setTimeout(() => setReviewSuccess(false), 5000)
    } catch (err: any) {
      console.error('Error al enviar reseña:', err)
      setReviewError(err.message || 'No se pudo guardar tu reseña.')
    } finally {
      setSubmittingReview(false)
    }
  }

  // Imágenes combinadas
  const rawImages = product.imagenes && product.imagenes.length > 0 ? product.imagenes : []
  const variantImages = variants
    .map((v) => v.imagen_url)
    .filter((url): url is string => Boolean(url))
  const allImages = Array.from(new Set([...rawImages, ...variantImages]))

  const handleGalleryImageChange = (imageUrl: string) => {
    const matchingVariant = variants.find((v) => v.imagen_url === imageUrl)
    if (matchingVariant && matchingVariant.id !== selectedVariant?.id) {
      setSelectedVariant(matchingVariant)
    }
  }

  // Precios
  const additionalPrice = selectedVariant?.precio_adicional ?? 0
  const currentBasePrice = product.precio_base + additionalPrice
  const currentOfferPrice =
    product.precio_oferta !== null && product.precio_oferta !== undefined
      ? product.precio_oferta + additionalPrice
      : null

  const isOffer = product.oferta_activa && currentOfferPrice !== null && currentOfferPrice < currentBasePrice
  const effectivePrice = isOffer && currentOfferPrice ? currentOfferPrice : currentBasePrice

  const discountPercent = isOffer && currentOfferPrice
    ? Math.round((1 - currentOfferPrice / currentBasePrice) * 100)
    : null

  // Stock
  const hasVariantStock = selectedVariant && selectedVariant.stock !== null
  const currentStock = hasVariantStock ? selectedVariant.stock : product.stock
  const hasStock = !product.gestiona_stock || (currentStock ?? 0) > 0
  const isReserva = !product.gestiona_stock || (currentStock ?? 0) <= 0

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

  const handleAddToCart = (andOpenCart: boolean = false) => {
    const itemToAdd = {
      productId: product.id,
      productSlug: product.slug,
      productName: product.nombre,
      imagenUrl: selectedVariant?.imagen_url || (rawImages.length > 0 ? rawImages[0] : null),
      variantId: selectedVariant?.id || null,
      variantName: selectedVariant?.nombre || null,
      unitPrice: effectivePrice,
      originalPrice: isOffer ? currentBasePrice : null,
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
      }, 2500)

      if (andOpenCart) {
        openCart()
      }
    } else {
      setCartFeedback(res.message || 'No se pudo agregar más cantidad.')
    }
  }

  const handleBuyNow = () => {
    handleAddToCart(false)
    const sep = tenantQuery ? (tenantQuery.startsWith('?') ? `${tenantQuery}` : `?${tenantQuery}`) : ''
    router.push(`/tienda/checkout${sep}`)
  }

  const withTenant = (path: string) => {
    if (!tenantQuery) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}${tenantQuery.replace('?', '')}`
  }

  const formatMoney = (val: number) => {
    return `$${val.toLocaleString('es-AR')}`
  }

  // Link WhatsApp de consulta
  const cleanPhone = store.whatsapp_numero ? store.whatsapp_numero.replace(/[^0-9]/g, '') : null
  const displayPriceText = product.precio_base === 0 && !product.gestiona_stock ? 'A consultar' : formatMoney(effectivePrice)
  const variantText = selectedVariant ? ` (Opción: ${selectedVariant.nombre})` : ''
  const quantityText = quantity > 1 ? ` [Cantidad: ${quantity}]` : ''
  const whatsappMsg = `Hola ${store.nombre}! Me interesa el producto "${product.nombre}"${variantText}${quantityText} (${displayPriceText}). ¿Podrían darme más información?`
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}`
    : null

  // Ficha técnica estructurada
  const specsList = details?.ficha_tecnica || []

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* 1. Migas de Pan (Breadcrumbs) */}
      <nav aria-label="Migas de pan" className="flex items-center gap-2 text-xs opacity-60">
        <Link href={withTenant('/tienda')} className="hover:opacity-100 hover:text-[var(--color-primario)]">
          Inicio
        </Link>
        <span>/</span>
        <Link href={withTenant('/tienda')} className="hover:opacity-100 hover:text-[var(--color-primario)]">
          Tienda
        </Link>
        <span>/</span>
        <span className="opacity-100 font-medium text-[var(--color-texto)] truncate max-w-xs">
          {product.nombre}
        </span>
      </nav>

      {/* 2. Sección Principal: Galería a la izquierda y Datos a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-start">
        {/* Galería de Fotos */}
        <div>
          <ProductGallery
            images={allImages}
            productName={product.nombre}
            selectedImageOverride={variantImageOverride}
            onImageChange={handleGalleryImageChange}
          />
        </div>

        {/* Ficha Informativa y Acciones */}
        <div className="space-y-6">
          <div>
            <span className="eyebrow text-[var(--color-primario)] block">
              {product.category?.nombre || 'Colección'}
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold font-[var(--font-heading)] mt-2 leading-tight text-[var(--color-texto)]">
              {product.nombre}
            </h1>

            {/* Estrellas y Reseñas Dinámicas */}
            <div className="mt-3 flex items-center gap-2 text-xs font-medium">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`w-3.5 h-3.5 ${
                      avgRating && n <= Math.round(Number(avgRating))
                        ? 'fill-[var(--color-primario)] text-[var(--color-primario)]'
                        : 'text-slate-300 dark:text-slate-700'
                    }`}
                  />
                ))}
              </div>
              {avgRating ? (
                <>
                  <span className="font-bold">{avgRating}</span>
                  <span className="opacity-60">
                    · {totalReviewsCount} {totalReviewsCount === 1 ? 'opinión' : 'opiniones'}
                  </span>
                </>
              ) : (
                <span className="opacity-60">Sin opiniones aún</span>
              )}
            </div>
          </div>

          {/* Precios */}
          <div className="flex items-baseline gap-3">
            {product.precio_base === 0 && !product.gestiona_stock ? (
              <span className="text-2xl sm:text-3xl font-semibold text-[var(--color-primario)]">
                Precio a consultar
              </span>
            ) : isOffer && currentOfferPrice ? (
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-semibold text-[var(--color-texto)]">
                  {formatMoney(currentOfferPrice)}
                </span>
                <span className="text-base sm:text-lg line-through opacity-50">
                  {formatMoney(currentBasePrice)}
                </span>
                {discountPercent && (
                  <span className="rounded bg-[var(--color-primario)]/15 px-2 py-0.5 text-xs font-semibold text-[var(--color-primario-legible)]">
                    −{discountPercent}%
                  </span>
                )}
              </div>
            ) : (
              <span className="text-3xl sm:text-4xl font-semibold text-[var(--color-texto)]">
                {formatMoney(currentBasePrice)}
              </span>
            )}
          </div>

          {/* Descripción corta */}
          {product.descripcion && (
            <p className="text-xs sm:text-sm leading-relaxed opacity-75 line-clamp-3 text-[var(--color-texto)]">
              {product.descripcion.replace(/[*#_]/g, '')}
            </p>
          )}

          {/* Variantes si existen */}
          {variants.length > 0 && (
            <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="opacity-70">Opción seleccionada:</span>
                <strong className="text-[var(--color-primario-legible)]">
                  {selectedVariant?.nombre}
                </strong>
              </div>

              <div className="flex flex-wrap gap-2">
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
                        if (v.imagen_url) setVariantImageOverride(v.imagen_url)
                      }}
                      className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[var(--color-primario)] bg-[var(--color-primario)] text-[var(--color-primario-texto)] shadow-xs'
                          : 'border-black/15 dark:border-white/15 bg-[var(--color-superficie)] opacity-80 hover:opacity-100 hover:border-black/30'
                      }`}
                    >
                      <span>{v.nombre}</span>
                      {diff !== 0 && (
                        <span className="ml-1 opacity-80">
                          ({diff > 0 ? `+${formatMoney(diff)}` : `-${formatMoney(Math.abs(diff))}`})
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Estado de Disponibilidad */}
          <p className="flex items-center gap-2 text-xs font-medium text-[var(--color-primario-legible)]">
            <span className="hero-dot" />
            <span>
              {product.gestiona_stock
                ? (currentStock ?? 0) > 0
                  ? `${currentStock} unidades disponibles en taller`
                  : 'Disponible bajo pedido / fabricación'
                : 'Disponible en esta colección'}
            </span>
          </p>

          {/* Stepper de Cantidad + Botón Añadir + Wishlist Heart */}
          <div className="flex items-center gap-3 pt-2">
            {/* Stepper */}
            <div className="flex items-center rounded-xl border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03] overflow-hidden">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={quantity <= 1}
                aria-label="Reducir cantidad"
                className="w-11 h-11 flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer disabled:opacity-30"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-9 text-center font-semibold text-xs select-none">
                {quantity}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={product.gestiona_stock && currentStock !== null && currentStock > 0 ? quantity >= currentStock : false}
                aria-label="Aumentar cantidad"
                className="w-11 h-11 flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer disabled:opacity-30"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Botón Añadir al Carrito */}
            <button
              type="button"
              onClick={() => handleAddToCart(false)}
              className="flex-1 min-h-[44px] h-11 px-4 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-98 transition-all cursor-pointer"
            >
              {addedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Añadido al carrito</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Añadir al carrito</span>
                </>
              )}
            </button>

            {/* Botón Guardar en Favoritos */}
            <button
              type="button"
              onClick={() => toggleFavorite(product.id)}
              aria-label={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              className="w-11 h-11 rounded-xl border border-black/15 dark:border-white/15 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Heart
                className={`w-5 h-5 ${
                  isFav
                    ? 'fill-[var(--color-primario)] text-[var(--color-primario)]'
                    : 'text-[var(--color-texto)] opacity-70'
                }`}
              />
            </button>
          </div>

          {/* Botón Comprar Directo */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleBuyNow}
              className="w-full min-h-[44px] h-11 rounded-xl border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-texto)] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <span>{isReserva ? 'Reservar ahora' : 'Comprar ahora'}</span>
              <ArrowRight className="w-4 h-4 opacity-70" />
            </button>
          </div>

          {/* Consulta por WhatsApp */}
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2 border border-emerald-500/20 hover:bg-emerald-500/15 transition-all"
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span>Consultar disponibilidad por WhatsApp</span>
            </a>
          )}

          {/* Beneficios de confianza TiendaDemo */}
          <div className="mt-6 grid gap-3 border-t border-black/10 dark:border-white/10 pt-6 text-xs opacity-75">
            <span className="flex items-center gap-3">
              <Truck className="w-4 h-4 text-[var(--color-primario)] shrink-0" />
              <span>Envío de cortesía / a convenir en tu pedido</span>
            </span>
            <span className="flex items-center gap-3">
              <RotateCcw className="w-4 h-4 text-[var(--color-primario)] shrink-0" />
              <span>Devoluciones sencillas y garantía de taller</span>
            </span>
            <span className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-[var(--color-primario)] shrink-0" />
              <span>Compra y datos protegidos</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Pestañas de Información Extendida (Descripción, Datos técnicos, Valoraciones) */}
      <section className="pt-8 border-t border-black/10 dark:border-white/10">
        <div role="tablist" aria-label="Información del producto" className="flex gap-6 border-b border-black/10 dark:border-white/10">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'descripcion'}
            onClick={() => setActiveTab('descripcion')}
            className={`pb-4 text-xs sm:text-sm font-semibold transition-all relative cursor-pointer ${
              activeTab === 'descripcion'
                ? 'text-[var(--color-primario-legible)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[var(--color-primario-legible)]'
                : 'opacity-60 hover:opacity-100'
            }`}
          >
            Descripción
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tecnicos'}
            onClick={() => setActiveTab('tecnicos')}
            className={`pb-4 text-xs sm:text-sm font-semibold transition-all relative cursor-pointer ${
              activeTab === 'tecnicos'
                ? 'text-[var(--color-primario-legible)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[var(--color-primario-legible)]'
                : 'opacity-60 hover:opacity-100'
            }`}
          >
            Datos técnicos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'valoraciones'}
            onClick={() => setActiveTab('valoraciones')}
            className={`pb-4 text-xs sm:text-sm font-semibold transition-all relative cursor-pointer ${
              activeTab === 'valoraciones'
                ? 'text-[var(--color-primario-legible)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[var(--color-primario-legible)]'
                : 'opacity-60 hover:opacity-100'
            }`}
          >
            Valoraciones ({totalReviewsCount})
          </button>
          {faqsList.length > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'faqs'}
              onClick={() => setActiveTab('faqs')}
              className={`pb-4 text-xs sm:text-sm font-semibold transition-all relative cursor-pointer ${
                activeTab === 'faqs'
                  ? 'text-[var(--color-primario-legible)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[var(--color-primario-legible)]'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              Preguntas frecuentes ({faqsList.length})
            </button>
          )}
        </div>

        {/* Panel de Contenido de la Pestaña Activa */}
        <div className="py-7">
          {activeTab === 'descripcion' && (
            <div className="space-y-4 max-w-3xl">
              <h2 className="text-lg sm:text-xl font-medium font-[var(--font-heading)]">
                Diseño que se siente bien.
              </h2>
              <div className="text-xs sm:text-sm leading-relaxed opacity-75 space-y-3 font-[var(--font-body)]">
                {product.descripcion ? (
                  renderMarkdown(product.descripcion)
                ) : (
                  <p>
                    Pieza seleccionada con altos estándares de fabricación, acabados pulidos y diseño funcional pensado para durar.
                  </p>
                )}
              </div>

              {/* Imágenes secundarias de detalle */}
              {rawImages.length > 1 && (
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
                  {rawImages.slice(1, 4).map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Detalle de ${product.nombre}`}
                      className="aspect-square rounded-xl object-cover border border-black/5 dark:border-white/5"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tecnicos' && (
            <div className="max-w-2xl">
              <dl className="divide-y divide-black/10 dark:divide-white/10 text-xs sm:text-sm">
                {specsList.length > 0 ? (
                  specsList.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-2 py-3.5">
                      <dt className="opacity-60 font-medium">{item.clave}</dt>
                      <dd className="font-semibold text-[var(--color-texto)]">{item.valor}</dd>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="grid grid-cols-2 py-3.5">
                      <dt className="opacity-60 font-medium">Categoría</dt>
                      <dd className="font-semibold">{product.category?.nombre || 'General'}</dd>
                    </div>
                    {product.tiempo_fabricacion_estimado && (
                      <div className="grid grid-cols-2 py-3.5">
                        <dt className="opacity-60 font-medium">Tiempo de fabricación</dt>
                        <dd className="font-semibold">{product.tiempo_fabricacion_estimado}</dd>
                      </div>
                    )}
                    {product.sku && (
                      <div className="grid grid-cols-2 py-3.5">
                        <dt className="opacity-60 font-medium">Código SKU</dt>
                        <dd className="font-semibold">{product.sku}</dd>
                      </div>
                    )}
                    <div className="grid grid-cols-2 py-3.5">
                      <dt className="opacity-60 font-medium">Garantía</dt>
                      <dd className="font-semibold">{details?.garantia_texto || 'Garantía oficial de taller'}</dd>
                    </div>
                  </>
                )}
              </dl>
            </div>
          )}

          {activeTab === 'valoraciones' && (
            <div className="max-w-2xl space-y-8">
              {/* Formulario para Dejar Reseña (Solo para usuarios registrados de la tienda) */}
              <div className="p-5 sm:p-6 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.02] space-y-4">
                <h3 className="text-sm sm:text-base font-semibold text-[var(--color-texto)] flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Tu opinión sobre esta pieza</span>
                </h3>

                {currentUser ? (
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <p className="text-xs opacity-70">
                      Publicando como <b className="text-[var(--color-texto)]">{currentUser.nombre}</b> ({currentUser.email})
                    </p>

                    {reviewSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>¡Muchas gracias! Tu reseña ha sido publicada y es visible para la comunidad.</span>
                      </div>
                    )}

                    {reviewError && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{reviewError}</span>
                      </div>
                    )}

                    {/* Selector de Estrellas */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5 opacity-80">
                        Calificación:
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewRating(star)}
                            className="p-1 rounded-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                            aria-label={`Calificar con ${star} estrellas`}
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= newRating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300 dark:text-slate-700'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-xs font-bold ml-2 text-[var(--color-texto)]">
                          {newRating} de 5 estrellas
                        </span>
                      </div>
                    </div>

                    {/* Comentario */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5 opacity-80">
                        Comentario / Experiencia con la pieza:
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Comparte los acabados, durabilidad o qué te pareció..."
                        className="w-full p-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)] leading-relaxed"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="min-h-[44px] px-5 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-xs font-semibold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {submittingReview ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Star className="w-4 h-4 fill-current" />
                          <span>Publicar mi Reseña</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3 pt-1">
                    <p className="text-xs opacity-75 leading-relaxed">
                      Para poder dejar una reseña sobre este producto debes ser un usuario de la tienda. Puedes ingresar o registrarte en pocos segundos.
                    </p>
                    <Link
                      href={tenantQuery ? `/tienda/cuenta?${tenantQuery.replace('?', '')}` : '/tienda/cuenta'}
                      className="min-h-[44px] px-4 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-xs font-semibold inline-flex items-center gap-2 shadow-xs hover:opacity-95 cursor-pointer"
                    >
                      <User className="w-4 h-4" />
                      <span>Iniciar Sesión para Calificar</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Lista de Reseñas de Clientes */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-[var(--color-texto)] flex items-center justify-between">
                  <span>Opiniones de la comunidad</span>
                  <span className="text-xs opacity-60 font-normal">
                    {reviewsList.length} {reviewsList.length === 1 ? 'reseña' : 'reseñas'}
                  </span>
                </h4>

                {reviewsList.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-black/15 dark:border-white/15 text-xs opacity-60">
                    Todavía no hay reseñas para esta publicación. ¡Sé el primero en compartir tu experiencia!
                  </div>
                ) : (
                  <div className="space-y-3 divide-y divide-black/10 dark:divide-white/10">
                    {reviewsList.map((rev) => (
                      <div key={rev.id} className="pt-3.5 first:pt-0 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <Star
                                  key={n}
                                  className={`w-3.5 h-3.5 ${
                                    n <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-bold text-[var(--color-texto)]">{rev.rating}/5</span>
                          </div>
                          <span className="text-[10px] opacity-50">
                            {new Date(rev.created_at).toLocaleDateString('es-AR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-[var(--color-texto)] leading-relaxed italic">
                          &ldquo;{rev.comentario}&rdquo;
                        </p>
                        <p className="text-[11px] opacity-60 font-medium">
                          {rev.user_name} · Cliente de la tienda
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'faqs' && (
            <div className="max-w-3xl space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <HelpCircle className="w-5 h-5 text-[var(--color-primario)]" />
                <h3 className="text-base font-semibold text-[var(--color-texto)] font-[var(--font-heading)]">
                  Preguntas habituales sobre este producto
                </h3>
              </div>

              {faqsList.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-black/15 dark:border-white/15 text-xs opacity-60">
                  No hay preguntas frecuentes registradas aún para este producto.
                </div>
              ) : (
                <div className="space-y-3">
                  {faqsList.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.02] overflow-hidden transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          aria-expanded={isOpen}
                          className="w-full min-h-[48px] p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                        >
                          <span className="text-xs sm:text-sm font-semibold text-[var(--color-texto)] leading-snug">
                            {faq.pregunta}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                              isOpen ? 'rotate-180 text-[var(--color-primario)]' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm leading-relaxed opacity-80 border-t border-black/5 dark:border-white/5 text-[var(--color-texto)]">
                            {faq.respuesta}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Schema.org FAQPage Structured Data (Google Rich Snippets) */}
              {faqsList.length > 0 && (
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                      '@context': 'https://schema.org',
                      '@type': 'FAQPage',
                      mainEntity: faqsList.map((faq) => ({
                        '@type': 'Question',
                        name: faq.pregunta,
                        acceptedAnswer: {
                          '@type': 'Answer',
                          text: faq.respuesta,
                        },
                      })),
                    }),
                  }}
                />
              )}
            </div>
          )}
        </div>
      </section>

      {/* 4. "También te puede gustar" (Productos Recomendados) */}
      {relatedProducts.length > 0 && (
        <section className="pt-10 border-t border-black/10 dark:border-white/10">
          <h2 className="text-xl sm:text-2xl font-medium font-[var(--font-heading)] mb-6 text-[var(--color-texto)]">
            También te puede gustar
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                store={store}
                tenantQuery={tenantQuery}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
