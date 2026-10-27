// =============================================================================
// PORTALMAKER — Barra Fija Inferior Mobile ("Sticky Bottom Bar" estilo Tiendanube)
// Siempre visible al scrollear en celular para máxima tasa de conversión.
// =============================================================================

'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function StickyBottomCta() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-[var(--color-superficie)]/95 backdrop-blur-md border-t border-[var(--color-borde)] p-2.5 px-4 shadow-lg pb-[max(0.625rem,env(safe-area-inset-bottom))] transition-colors duration-200">
      <Link
        href="/login?mode=register"
        style={{ color: '#FFFFFF' }}
        className="w-full min-h-[44px] h-11 px-4 rounded-xl bg-[#FF5500] text-white text-sm font-bold hover:bg-[#E04B00] active:scale-98 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
      >
        <Sparkles className="w-4 h-4 text-white" />
        <span>Crear tienda gratis</span>
        <ArrowRight className="w-4 h-4 text-white" />
      </Link>
    </div>
  )
}
