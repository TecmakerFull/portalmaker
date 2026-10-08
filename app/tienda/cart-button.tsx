// =============================================================================
// PORTALMAKER — Botón de Carrito con Badge de Contador para Headers
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useCart } from '@/lib/cart-context'
import { ShoppingBag } from 'lucide-react'

export default function CartButton({ className = '' }: { className?: string }) {
  const { totalItems, toggleCart } = useCart()

  return (
    <button
      type="button"
      onClick={toggleCart}
      aria-label={`Ver carrito con ${totalItems} productos`}
      title="Ver carrito de compras"
      className={`relative min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold opacity-85 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer ${className}`}
    >
      <div className="relative">
        <ShoppingBag className="w-5 h-5" />
        {totalItems > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-primario)] text-white text-[10px] font-black flex items-center justify-center shadow-xs animate-in zoom-in duration-200">
            {totalItems > 99 ? '99+' : totalItems}
          </span>
        )}
      </div>
      <span className="hidden sm:inline font-bold">Carrito</span>
    </button>
  )
}
