// =============================================================================
// PORTALMAKER — Vista Interactiva de Cuenta (Client Component)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Store } from '@/types/database'
import { UserRound, Heart, ShoppingBag, ArrowRight, Check } from 'lucide-react'

interface CuentaClientProps {
  store: Store
  tenantQuery: string
}

export default function CuentaClient({ store, tenantQuery }: CuentaClientProps) {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const withTenant = (path: string) => {
    if (!tenantQuery) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}${tenantQuery.replace('?', '')}`
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setIsSubmitted(true)
  }

  return (
    <div className="mx-auto max-w-md space-y-8">
      <div>
        <div className="w-12 h-12 rounded-2xl bg-[var(--color-primario)]/15 text-[var(--color-primario)] flex items-center justify-center mb-4">
          <UserRound className="w-6 h-6" />
        </div>
        <p className="eyebrow text-[var(--color-primario)]">ESPACIO DE CLIENTE</p>
        <h1 className="text-2xl sm:text-3xl font-medium font-[var(--font-heading)] mt-2 text-[var(--color-texto)]">
          {isSubmitted ? 'Hola, bienvenido.' : 'Qué bueno verte.'}
        </h1>
        <p className="mt-2 text-xs sm:text-sm opacity-70 text-[var(--color-texto)]">
          {isSubmitted
            ? `Sesión activa para ${email}. Tus piezas favoritas y pedidos en un solo lugar.`
            : 'Accede a tu espacio personal para revisar tus favoritos y estado de consultas.'}
        </p>
      </div>

      {isSubmitted ? (
        <div className="space-y-4">
          <Link
            href={withTenant('/tienda/favoritos')}
            className="w-full h-12 px-4 rounded-xl border border-black/15 dark:border-white/15 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs sm:text-sm font-semibold"
          >
            <span className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-[var(--color-primario)]" />
              <span>Mis favoritos</span>
            </span>
            <ArrowRight className="w-4 h-4 opacity-50" />
          </Link>

          <Link
            href={withTenant('/tienda')}
            className="w-full h-12 px-4 rounded-xl border border-black/15 dark:border-white/15 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs sm:text-sm font-semibold"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[var(--color-primario)]" />
              <span>Seguir explorando la tienda</span>
            </span>
            <ArrowRight className="w-4 h-4 opacity-50" />
          </Link>

          <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-xs opacity-75">
            Los pedidos realizados mediante WhatsApp o transferencia son confirmados directamente con el titular de {store.nombre}.
          </div>

          <button
            type="button"
            onClick={() => setIsSubmitted(false)}
            className="text-xs opacity-60 hover:opacity-100 hover:underline pt-2 cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 opacity-80">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@ejemplo.com"
              className="w-full h-11 px-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-superficie)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] focus:ring-1 focus:ring-[var(--color-primario)] text-[var(--color-texto)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 opacity-80">
              Contraseña
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full h-11 px-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-superficie)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] focus:ring-1 focus:ring-[var(--color-primario)] text-[var(--color-texto)]"
            />
          </div>

          <button
            type="submit"
            className="w-full h-12 rounded-xl bg-[var(--color-primario)] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-98 transition-all cursor-pointer"
          >
            <span>Ingresar a mi cuenta</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[11px] opacity-60 text-center pt-2">
            Espacio de cliente para seguimiento y compras en {store.nombre}.
          </p>
        </form>
      )}
    </div>
  )
}
