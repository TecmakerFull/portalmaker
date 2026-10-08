// =============================================================================
// PORTALMAKER — Drawer Lateral del Carrito de Compras & Reservas
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/cart-context'
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

export default function CartDrawer({
  storeName,
  tenantQuery,
}: {
  storeName: string
  tenantQuery: string
}) {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalAmount,
    hasReservas,
    isCartOpen,
    closeCart,
  } = useCart()

  // Cerrar con Escape
  useEffect(() => {
    if (!isCartOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCartOpen, closeCart])

  // Bloquear scroll de fondo cuando el drawer está abierto
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isCartOpen])

  if (!isCartOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop oscuro con blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={closeCart}
      />

      {/* Panel Lateral Drawer */}
      <div className="relative w-full max-w-md bg-[var(--color-fondo)] text-[var(--color-texto)] border-l border-black/10 dark:border-white/10 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-300">
        {/* Header del Carrito */}
        <div className="p-4 sm:p-5 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-primario)]/15 text-[var(--color-primario)] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-[var(--font-heading)]">
                Tu Carrito
              </h2>
              <span className="text-xs opacity-60">
                {totalItems} {totalItems === 1 ? 'producto' : 'productos'} en {storeName}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={closeCart}
            aria-label="Cerrar carrito"
            className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 opacity-70" />
          </button>
        </div>

        {/* Lista de Items */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 divide-y divide-black/5 dark:divide-white/5">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 opacity-60">
              <div className="w-16 h-16 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div>
                <p className="font-bold text-base">Tu carrito está vacío</p>
                <p className="text-xs opacity-70 mt-1 max-w-xs">
                  Explora el catálogo y agrega los productos o encargos personalizados que deseas.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCart}
                className="mt-2 min-h-[44px] px-4 py-2 rounded-xl bg-[var(--color-primario)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
              >
                Explorar catálogo
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="pt-3.5 first:pt-0 flex gap-3 sm:gap-3.5 items-start">
                {/* Miniatura */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 shrink-0">
                  {item.imagenUrl ? (
                    <img
                      src={item.imagenUrl}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-30 text-xs">
                      Sin foto
                    </div>
                  )}
                </div>

                {/* Información del Item */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs sm:text-sm font-bold truncate leading-snug">
                      {item.productName}
                    </h3>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="min-h-[32px] min-w-[32px] flex items-center justify-center text-rose-500 hover:text-rose-700 opacity-70 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Variante seleccionada */}
                  {item.variantName && (
                    <span className="text-[11px] font-semibold text-[var(--color-primario)] block truncate">
                      Opción: {item.variantName}
                    </span>
                  )}

                  {/* Badge de Tipo: En Stock o Reserva */}
                  <div>
                    {item.isReserva ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        <span>Bajo pedido / Reserva</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>En stock</span>
                      </span>
                    )}
                  </div>

                  {/* Precios y Controles de Cantidad */}
                  <div className="pt-1.5 flex items-center justify-between">
                    <div className="text-xs sm:text-sm font-extrabold text-[var(--color-primario)]">
                      ${(item.unitPrice * item.quantity).toLocaleString('es-AR')}
                      {item.quantity > 1 && (
                        <span className="text-[10px] opacity-60 font-normal ml-1.5">
                          (${item.unitPrice.toLocaleString('es-AR')} c/u)
                        </span>
                      )}
                    </div>

                    {/* Stepper de Cantidad */}
                    <div className="flex items-center border border-black/15 dark:border-white/15 rounded-lg bg-black/[0.03] dark:bg-white/[0.04]">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-xs"
                        title="Disminuir"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold select-none">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-xs"
                        title="Aumentar"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer del Carrito con Subtotal y Botón Checkout */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] space-y-3">
            {/* Aviso si incluye reservas */}
            {hasReservas && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] leading-tight flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  Tu pedido incluye piezas <strong>bajo pedido / reserva</strong> que se fabricarán especialmente.
                </span>
              </div>
            )}

            {/* Total */}
            <div className="flex items-center justify-between text-sm sm:text-base">
              <span className="opacity-70 font-semibold">Total estimado:</span>
              <span className="text-xl sm:text-2xl font-black text-[var(--color-primario)] font-[var(--font-heading)]">
                ${totalAmount.toLocaleString('es-AR')}
              </span>
            </div>

            {/* Botón Continuar Compra */}
            <Link
              href={`/tienda/checkout${tenantQuery}`}
              onClick={closeCart}
              className="min-h-[48px] w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[var(--color-primario)] text-white text-sm font-bold hover:opacity-90 active:scale-98 transition-all shadow-md cursor-pointer"
            >
              <span>Continuar Compra / Pedido</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={clearCart}
                className="text-[11px] opacity-60 hover:opacity-100 hover:underline cursor-pointer"
              >
                Vaciar carrito
              </button>
              <button
                type="button"
                onClick={closeCart}
                className="text-[11px] opacity-70 hover:opacity-100 hover:underline cursor-pointer"
              >
                Seguir navegando
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
