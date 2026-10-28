// =============================================================================
// PORTALMAKER — Formulario de Inicio Rápido en Hero (Estilo Tiendanube / SaaS)
// Permite ingresar el correo en 1 clic y redirigir al registro con email precargado.
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

export default function HeroQuickRegister() {
  const [email, setEmail] = useState('')
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (trimmed) {
      router.push(`/login?mode=register&email=${encodeURIComponent(trimmed)}`)
    } else {
      router.push('/login?mode=register')
    }
  }

  return (
    <div className="w-full max-w-lg">
      <form
        onSubmit={handleSubmit}
        className="rounded-full bg-white dark:bg-[#13161D] border border-slate-200 dark:border-[#242A38] shadow-sm p-1 sm:p-1.5 pl-4 sm:pl-5 flex items-center gap-1.5 sm:gap-2 focus-within:ring-2 focus-within:ring-[#FF5500] focus-within:border-transparent transition-all"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tucorreo@ejemplo.com"
          className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 min-h-[40px] sm:min-h-[44px] px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-[#FF5500] text-white text-xs sm:text-sm font-bold hover:bg-[#E04B00] active:scale-95 transition-all shadow-xs flex items-center justify-center cursor-pointer whitespace-nowrap"
        >
          <span>Crear tienda gratis</span>
        </button>
      </form>

      {/* Microcopy de confianza */}
      <div className="mt-3 flex items-center gap-2 text-xs opacity-75 font-medium">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span>Sin costo mensual inicial. No necesitás tarjeta de crédito.</span>
      </div>
    </div>
  )
}
