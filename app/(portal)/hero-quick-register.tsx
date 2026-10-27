// =============================================================================
// PORTALMAKER — Formulario de Inicio Rápido en Hero (Estilo Tiendanube / SaaS)
// Permite ingresar el correo en 1 clic y redirigir al registro con email precargado.
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

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
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch gap-2.5">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@ejemplo.com"
          className="flex-1 min-h-[48px] px-4 py-3 rounded-2xl bg-[var(--color-superficie)]/90 backdrop-blur-md border border-[var(--color-borde)] text-sm text-[var(--color-texto)] placeholder:opacity-50 focus:outline-hidden focus:ring-2 focus:ring-[#FF5500] focus:border-transparent transition-all shadow-xs"
        />
        <button
          type="submit"
          className="min-h-[48px] px-6 py-3 rounded-2xl bg-[#FF5500] text-white text-sm font-bold hover:bg-[#E04B00] active:scale-98 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <span>Crear tienda gratis</span>
          <ArrowRight className="w-4 h-4 text-white" />
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
