// =============================================================================
// PORTALMAKER — Drawer Lateral del Carrito de Compras (Estilo TiendaDemo)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/cart-context'
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Truck,
  CreditCard,
  ImageIcon,
  MessageSquare,
} from 'lucide-react'

export default function CartDrawer({
  storeName,
  whatsappNumero,
  checkoutActivo = true,
  tenantQuery,
}: {
  storeName: string
  whatsappNumero?: string | null
  checkoutActivo?: boolean
  tenantQuery: string
}) {
  const {
    items,
    removeItem,
    updateQuantity,
    totalItems,
    totalAmount,
    isCartOpen,
    closeCart,
  } = useCart()

  const closeRef = useRef<HTMLButtonElement>(null)

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
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      closeRef.current?.focus()
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [isCartOpen])

  if (!isCartOpen) return null

  const withTenant = (path: string) => {
    if (!tenantQuery) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}${tenantQuery.replace('?', '')}`
  }

  const formatMoney = (val: number) => {
    return `$${val.toLocaleString('es-AR')}`
  }

  return (
    <>
      {/* Backdrop con posición fija e interceptor de clic */}
      <div
        className="drawer-backdrop fixed inset-0 bg-black/45 backdrop-blur-xs z-[100] transition-opacity"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer lateral deslizable desde la derecha (100dvh) */}
      <aside
        className="cart-drawer fixed right-0 top-0 h-[100dvh] w-full max-w-[440px] bg-[var(--color-superficie)] text-[var(--color-texto)] z-[101] shadow-2xl flex flex-col border-l border-black/10 dark:border-white/10"
        role="dialog"
        aria-modal="true"
        aria-label="Tu carrito de compras"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-black/10 dark:border-white/10 p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-medium font-[var(--font-heading)] flex items-center gap-2">
            <span>Tu carrito</span>
            <span className="text-xs sm:text-sm opacity-60">({totalItems})</span>
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={closeCart}
            aria-label="Cerrar carrito"
            className="w-9 h-9 rounded-xl flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Lista de Items */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 divide-y divide-black/5 dark:divide-white/5">
          {items.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <ShoppingBag className="mx-auto w-12 h-12 opacity-30 text-[var(--color-primario)]" />
              <div>
                <h3 className="text-base sm:text-lg font-medium text-[var(--color-texto)]">
                  Tu carrito está esperando
                </h3>
                <p className="mt-1 text-xs opacity-60">
                  Encuentra tu próxima pieza favorita en {storeName}.
                </p>
              </div>
              <Link
                href={withTenant('/tienda')}
                onClick={closeCart}
                className="mt-4 min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-xs font-semibold inline-flex items-center gap-2 shadow-xs hover:opacity-95 cursor-pointer"
              >
                <span>Explorar productos</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[80px_1fr] sm:grid-cols-[88px_1fr] gap-3 sm:gap-4 items-start pt-4 first:pt-0"
                >
                  {/* Foto miniatura */}
                  <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] overflow-hidden shrink-0 border border-black/5 dark:border-white/5">
                    {item.imagenUrl ? (
                      <img
                        src={item.imagenUrl}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-30">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Info y Controles */}
                  <div className="min-w-0">
                    <Link
                      href={withTenant(`/tienda/productos/${item.productSlug}`)}
                      onClick={closeCart}
                      className="text-xs sm:text-sm font-medium leading-snug line-clamp-1 hover:text-[var(--color-primario)] transition-colors block"
                    >
                      {item.productName}
                    </Link>

                    {item.variantName && (
                      <p className="mt-0.5 text-[11px] opacity-60 truncate">
                        Variante: {item.variantName}
                      </p>
                    )}

                    <p className="mt-1.5 text-xs sm:text-sm font-semibold text-[var(--color-texto)]">
                      {formatMoney(item.unitPrice * item.quantity)}
                    </p>

                    {/* Stepper y Borrar */}
                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label="Reducir cantidad"
                          className="w-7 h-7 flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer active:scale-95"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label="Aumentar cantidad"
                          className="w-7 h-7 flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Eliminar ${item.productName}`}
                        className="w-7 h-7 rounded-lg flex items-center justify-center opacity-50 hover:opacity-100 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer del Carrito con Subtotal y Checkout */}
        {items.length > 0 && (
          <footer className="border-t border-black/10 dark:border-white/10 p-5 sm:p-6 bg-black/[0.01] dark:bg-white/[0.01]">
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] p-3 text-xs opacity-80">
              <Truck className="w-4 h-4 text-[var(--color-primario)] shrink-0" />
              <span>Envío a acordar / disponible al finalizar</span>
            </div>

            <div className="flex items-center justify-between text-base sm:text-lg font-semibold text-[var(--color-texto)]">
              <span>Subtotal</span>
              <span>{formatMoney(totalAmount)}</span>
            </div>

            <p className="mt-1 text-[11px] opacity-60">
              {checkoutActivo
                ? 'Envío y opciones de pago seleccionables en el siguiente paso.'
                : 'Esta tienda coordina pedidos y entregas directamente por WhatsApp.'}
            </p>

            {checkoutActivo ? (
              <Link
                href={withTenant('/tienda/checkout')}
                onClick={closeCart}
                className="mt-5 w-full min-h-[48px] h-12 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-sm font-semibold flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-98 transition-all cursor-pointer"
              >
                <span>Finalizar compra</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const cleanPhone = whatsappNumero ? whatsappNumero.replace(/[^0-9]/g, '') : null
                  if (cleanPhone) {
                    const lines = items.map(
                      (item) =>
                        `• ${item.quantity}x ${item.productName}${item.variantName ? ` (${item.variantName})` : ''} - $${(item.unitPrice * item.quantity).toLocaleString('es-AR')}`
                    )
                    const text = `Hola ${storeName}, quiero realizar el siguiente pedido:\n\n${lines.join('\n')}\n\nTotal estimado: $${totalAmount.toLocaleString('es-AR')}\n\n¿Cómo podemos coordinar el pago y la entrega?`
                    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
                  } else {
                    window.location.href = withTenant('/tienda/checkout')
                  }
                  closeCart()
                }}
                className="mt-5 w-full min-h-[48px] h-12 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-sm font-semibold flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-98 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Pedir por WhatsApp</span>
              </button>
            )}

            <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] opacity-60">
              <CreditCard className="w-3.5 h-3.5" />
              <span>{checkoutActivo ? 'Pago 100% protegido y transparente' : 'Coordinación directa con el maker'}</span>
            </p>
          </footer>
        )}
      </aside>
    </>
  )
}
