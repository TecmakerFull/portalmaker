// =============================================================================
// PORTALMAKER — Tarjeta de Producto Minimalista (Estilo TiendaDemo / Nöra)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Product, Store } from '@/types/database'
import { useCart } from '@/lib/cart-context'
import { isStoreCheckoutActive } from '@/lib/plans'
import { Heart, Plus, Check, Star, ArrowUpRight, MessageSquare, ImageIcon, Layers, ChevronRight, ShoppingBag } from 'lucide-react'

interface ProductCardProps {
  product: Product & {
    category?: { nombre: string } | null
    variants?: { id: string; nombre: string; stock: number | null; activo: boolean }[] | null
  }
  store: Store
  tenantQuery: string
}

export default function ProductCard({ product, store, tenantQuery }: ProductCardProps) {
  const { addItem, openCart, favorites, toggleFavorite, isFavorite } = useCart()
  const [added, setAdded] = useState(false)

  const isCheckoutActive = isStoreCheckoutActive(store)
  const isFav = isFavorite(product.id)
  const firstImage = product.imagenes && product.imagenes.length > 0 ? product.imagenes[0] : null
  const hasPrice = typeof product.precio_base === 'number' && product.precio_base > 0
  const isOutOfStock = product.gestiona_stock && (product.stock === null || product.stock <= 0)
  const isOffer = product.oferta_activa && product.precio_oferta !== null && product.precio_oferta < product.precio_base
  const effectivePrice = isOffer && product.precio_oferta ? product.precio_oferta : product.precio_base

  // Detección de variantes activas (estilo Mercado Libre)
  const activeVariants = Array.isArray(product.variants)
    ? product.variants.filter((v) => v.activo)
    : []
  const hasVariants = activeVariants.length > 0
  const variantCount = activeVariants.length

  // Formato de moneda
  const formatMoney = (val: number) => {
    return `$${val.toLocaleString('es-AR')}`
  }

  // Descuento porcentual si hay oferta
  const discountPercent = isOffer && product.precio_oferta
    ? Math.round((1 - product.precio_oferta / product.precio_base) * 100)
    : null

  // Etiqueta destacada
  let badgeText: string | null = null
  if (discountPercent) {
    badgeText = `−${discountPercent}%`
  } else if (product.destacado) {
    badgeText = 'Destacado'
  } else if (isOutOfStock) {
    badgeText = 'Sin stock'
  } else if (!product.gestiona_stock) {
    badgeText = 'A pedido'
  }

  // Teléfono limpio de WhatsApp
  const cleanPhone = store.whatsapp_numero ? store.whatsapp_numero.replace(/[^0-9]/g, '') : null

  // Link WhatsApp general de consulta (Estado 1 de AGENTS.md: gestiona_stock = false)
  const generalWhatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola ${store.nombre}! Me interesa consultar por el catálogo de tu tienda.`)}`
    : null

  // Link WhatsApp de compra o consulta con referencia al producto
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        hasPrice
          ? `Hola ${store.nombre}! Me interesa comprar el producto: "${product.nombre}" (${formatMoney(effectivePrice)})`
          : `Hola ${store.nombre}! Me interesa consultar precio y disponibilidad de: "${product.nombre}"`
      )}`
    : null

  // Link WhatsApp de disponibilidad (Estado 3 de AGENTS.md: gestiona_stock = true, stock = 0)
  const whatsappAvailabilityUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Hola ${store.nombre}! Me interesa consultar disponibilidad de: "${product.nombre}"`
      )}`
    : null

  // URL al detalle con tenantQuery
  const withTenant = (path: string) => {
    if (!tenantQuery) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}${tenantQuery.replace('?', '')}`
  }
  const productUrl = withTenant(`/tienda/productos/${product.slug}`)

  // Añadir al carrito y abrir drawer con feedback interactivo
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const res = addItem(
      {
        productId: product.id,
        productSlug: product.slug,
        productName: product.nombre,
        imagenUrl: firstImage,
        variantId: null,
        variantName: null,
        unitPrice: effectivePrice,
        originalPrice: isOffer ? product.precio_base : null,
        gestionaStock: product.gestiona_stock,
        stockDisponible: product.stock,
        isReserva: isOutOfStock || !product.gestiona_stock,
      },
      1
    )

    if (res.success) {
      setAdded(true)
      openCart() // Despliega el carrito inmediatamente para dar acción visible al usuario
      setTimeout(() => setAdded(false), 1800)
    }
  }

  return (
    <article className="product-card min-w-0 flex flex-col justify-between group">
      <div>
        {/* Contenedor de la Foto */}
        <div className="product-photo aspect-[1/1.04] bg-black/[0.03] dark:bg-white/[0.04] overflow-hidden relative rounded-md">
          <Link
            href={productUrl}
            prefetch={true}
            aria-label={`Ver detalle de ${product.nombre}`}
            className="block w-full h-full active:scale-[0.99] transition-transform"
          >
            {firstImage ? (
              <img
                src={firstImage}
                alt={product.nombre}
                width={600}
                height={600}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.045]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center opacity-30 gap-1.5">
                <ImageIcon className="w-7 h-7 sm:w-9 sm:h-9" />
                <span className="text-[10px]">Sin imagen</span>
              </div>
            )}
          </Link>

          {/* Badge de opciones/variantes en la foto */}
          {hasVariants && (
            <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/65 text-white text-[10px] font-medium backdrop-blur-xs flex items-center gap-1 shadow-xs pointer-events-none">
              <Layers className="w-3 h-3 text-[var(--color-primario)]" />
              <span>{variantCount} {variantCount === 1 ? 'opción' : 'opciones'}</span>
            </span>
          )}

          {/* Badge en la esquina superior izquierda */}
          {badgeText && (
            <span className="product-badge bg-[var(--color-superficie)] text-[var(--color-texto)] font-semibold text-[10px] shadow-xs">
              {badgeText}
            </span>
          )}

          {/* Botón de Favorito en la esquina superior derecha */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleFavorite(product.id)
            }}
            aria-label={isFav ? `Quitar de favoritos` : `Guardar en favoritos`}
            className="favorite-button cursor-pointer active:scale-90"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFav
                  ? 'fill-[var(--color-primario)] text-[var(--color-primario)]'
                  : 'text-[var(--color-texto)] opacity-70 hover:opacity-100'
              }`}
            />
          </button>
        </div>

        {/* Categoría y Calificación */}
        <div className="mt-3 sm:mt-4 flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-widest opacity-60 font-medium truncate">
            {product.category?.nombre || 'General'}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-medium opacity-80 shrink-0">
            <Star className="w-3 h-3 fill-[var(--color-primario)] text-[var(--color-primario)]" />
            <span>4.9</span>
            <span className="opacity-50">(24)</span>
          </span>
        </div>

        {/* Nombre del Producto con Flecha Diagonal */}
        <Link
          href={productUrl}
          className="mt-1.5 flex items-start justify-between gap-1 group-hover:text-[var(--color-primario)] transition-colors"
        >
          <h3 className="text-xs sm:text-[14px] font-medium leading-snug line-clamp-2">
            {product.nombre}
          </h3>
          <ArrowUpRight className="w-3.5 h-3.5 shrink-0 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all mt-0.5" />
        </Link>

        {/* Precios */}
        <div className="mt-1.5 flex items-baseline gap-2">
          {hasPrice ? (
            <>
              <span className="text-sm sm:text-base font-semibold text-[var(--color-texto)]">
                {formatMoney(effectivePrice)}
              </span>
              {isOffer && (
                <span className="text-xs opacity-50 line-through">
                  {formatMoney(product.precio_base)}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs sm:text-sm font-medium opacity-70 italic">
              A consultar
            </span>
          )}
        </div>
      </div>

      {/* Fila Inferior: Indicador de variantes + Botón de Acción contextual */}
      <div className="mt-3 flex items-center justify-between pt-1">
        {/* Indicador sutil de opciones a la izquierda */}
        {hasVariants ? (
          <span className="text-[11px] font-medium text-[var(--color-primario-legible)] opacity-90 flex items-center gap-1 truncate max-w-[130px]">
            <Layers className="w-3.5 h-3.5 shrink-0 text-[var(--color-primario)]" />
            <span>{variantCount} opciones</span>
          </span>
        ) : (
          <div />
        )}

        {/* Botón de Acción según especificación AGENTS.md:
            1. Con variantes -> "Ver opciones" (lleva a la ficha de producto)
            2. gestiona_stock = false -> "Consultar" (WhatsApp general)
            3. gestiona_stock = true, stock = 0 -> "Consultar disponibilidad" (WhatsApp con ref. al producto)
            4. gestiona_stock = true, stock > 0 -> "Comprar" (checkout cuando esté activo, o WhatsApp en vitrina)
        */}
        {hasVariants ? (
          <Link
            href={productUrl}
            className="min-h-[32px] h-8 px-2.5 sm:px-3 rounded-lg text-[11px] font-semibold border border-black/10 dark:border-white/10 hover:bg-[var(--color-primario)] hover:text-[var(--color-primario-texto)] text-[var(--color-texto)] transition-all inline-flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <span>Ver opciones</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-70" />
          </Link>
        ) : !product.gestiona_stock ? (
          /* Estado 1 de AGENTS.md: gestiona_stock = false -> "Consultar" (WhatsApp general) */
          generalWhatsappUrl ? (
            <a
              href={generalWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[32px] h-8 px-2.5 sm:px-3 rounded-lg text-[11px] font-semibold border border-black/10 dark:border-white/10 hover:bg-emerald-600 hover:text-white text-[var(--color-texto)] transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Consultar</span>
            </a>
          ) : (
            <Link
              href={productUrl}
              className="min-h-[32px] h-8 px-2.5 sm:px-3 rounded-lg text-[11px] font-semibold border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-texto)] transition-all inline-flex items-center gap-1"
            >
              Ver más
            </Link>
          )
        ) : isOutOfStock ? (
          /* Estado 3 de AGENTS.md: gestiona_stock = true, stock = 0 -> "Consultar disponibilidad" (WhatsApp con ref. al producto) */
          whatsappAvailabilityUrl ? (
            <a
              href={whatsappAvailabilityUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[32px] h-8 px-2.5 sm:px-3 rounded-lg text-[11px] font-semibold border border-black/10 dark:border-white/10 hover:bg-emerald-600 hover:text-white text-[var(--color-texto)] transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Consultar disponibilidad</span>
            </a>
          ) : (
            <Link
              href={productUrl}
              className="min-h-[32px] h-8 px-2.5 sm:px-3 rounded-lg text-[11px] font-semibold border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-texto)] transition-all inline-flex items-center gap-1"
            >
              Ver más
            </Link>
          )
        ) : isCheckoutActive ? (
          /* Estado 2 de AGENTS.md: gestiona_stock = true, stock > 0 -> "Comprar" (checkout, cuando esté activo) */
          <button
            type="button"
            onClick={handleAddToCart}
            className={`min-h-[32px] h-8 px-2.5 sm:px-3 rounded-lg text-[11px] font-semibold transition-all inline-flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-xs ${
              added
                ? 'bg-emerald-600 text-white'
                : 'hover:bg-[var(--color-primario)] hover:text-[var(--color-primario-texto)] border border-black/10 dark:border-white/10 text-[var(--color-texto)] bg-black/[0.02] dark:bg-white/[0.03]'
            }`}
          >
            {added ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Listo</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Comprar</span>
              </>
            )}
          </button>
        ) : whatsappUrl ? (
          /* Estado 2 en modo vitrina (checkout inactivo): enlace directo para comprar por WhatsApp */
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[32px] h-8 px-2.5 sm:px-3 rounded-lg text-[11px] font-semibold border border-black/10 dark:border-white/10 hover:bg-emerald-600 hover:text-white text-[var(--color-texto)] transition-all inline-flex items-center gap-1.5 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>Comprar</span>
          </a>
        ) : (
          <Link
            href={productUrl}
            className="min-h-[32px] h-8 px-2.5 sm:px-3 rounded-lg text-[11px] font-semibold border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-texto)] transition-all inline-flex items-center gap-1"
          >
            Ver más
          </Link>
        )}
      </div>
    </article>
  )
}
