// =============================================================================
// PORTALMAKER — Vista Interactiva de Producto con Variantes y Galería Sincronizada
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState } from 'react'
import type { Product, Store, ProductVariant, ProductDetails } from '@/types/database'
import ProductGallery from './product-gallery'
import { renderMarkdown } from '@/lib/markdown'
import { MessageSquare, Clock, Box, Layers } from 'lucide-react'

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
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    variants.length > 0 ? variants[0] : null
  )

  const imagenes = product.imagenes && product.imagenes.length > 0 ? product.imagenes : []

  // Cálculo del precio activo (incluyendo variación de precio de la variante si aplica)
  const additionalPrice = selectedVariant?.precio_adicional ?? 0
  const currentBasePrice = product.precio_base + additionalPrice
  const currentOfferPrice = product.precio_oferta !== null && product.precio_oferta !== undefined
    ? product.precio_oferta + additionalPrice
    : null

  // Stock activo
  const hasVariantStock = selectedVariant && selectedVariant.stock !== null
  const currentStock = hasVariantStock ? selectedVariant.stock : product.stock
  const hasStock = !product.gestiona_stock || (currentStock ?? 0) > 0

  // Generar URL de WhatsApp con la variante seleccionada
  const cleanPhone = store.whatsapp_numero ? store.whatsapp_numero.replace(/[^0-9]/g, '') : null
  const displayPriceText = product.precio_base === 0 && !product.gestiona_stock
    ? 'A consultar'
    : `$${(currentOfferPrice || currentBasePrice).toLocaleString('es-AR')}`

  const variantText = selectedVariant ? ` (Opción: ${selectedVariant.nombre})` : ''
  const whatsappMsg = `Hola ${store.nombre}! Me interesa el producto "${product.nombre}"${variantText} (${displayPriceText}). ¿Podrían darme más información?`
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}`
    : null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
      {/* Columna Izquierda: Galería Interactiva con Sincronización de Variante */}
      <div>
        <ProductGallery
          images={imagenes}
          productName={product.nombre}
          selectedImageOverride={selectedVariant?.imagen_url}
        />
      </div>

      {/* Columna Derecha: Información, Selección de Variantes y Compra */}
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
                    onClick={() => setSelectedVariant(v)}
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

        {/* Botón WhatsApp Principal */}
        {whatsappUrl && (
          <div className="pt-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[52px] w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[var(--color-primario)] text-white text-base font-bold hover:opacity-90 active:scale-98 transition-all shadow-md cursor-pointer"
            >
              <MessageSquare className="w-5 h-5" />
              <span>
                {product.gestiona_stock && !hasStock
                  ? 'Consultar Disponibilidad por WhatsApp'
                  : 'Comprar / Consultar por WhatsApp'}
              </span>
            </a>
          </div>
        )}

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
