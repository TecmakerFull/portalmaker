// =============================================================================
// PORTALMAKER — Botón de Carrito Minimalista para Headers
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
      className={`relative min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] text-[var(--color-texto)] hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95 ${className}`}
    >
      <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-primario)] text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-in zoom-in duration-200">
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      )}
    </button>
  )
}
