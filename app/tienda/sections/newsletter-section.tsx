// =============================================================================
// PORTALMAKER — Sección: Suscripción a Novedades / Newsletter (Estilo TiendaDemo)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState } from 'react'
import { ArrowRight, Check, Sparkles } from 'lucide-react'

interface NewsletterSectionProps {
  storeName?: string
}

export default function NewsletterSection({ storeName = 'nuestra tienda' }: NewsletterSectionProps) {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubscribed(true)
  }

  return (
    <section className="mt-16 sm:mt-24 bg-black/[0.03] dark:bg-white/[0.04] py-12 sm:py-16 transition-colors border-y border-black/5 dark:border-white/5">
      <div className="wrap grid gap-6 sm:gap-8 md:grid-cols-2 md:items-center">
        <div>
          <span className="eyebrow text-[var(--color-primario)]">
            EL UNIVERSO {storeName.toUpperCase()}
          </span>
          <h2 className="mt-2 sm:mt-3 text-xl sm:text-2xl md:text-3xl font-medium font-[var(--font-heading)] text-[var(--color-texto)] leading-snug">
            Un poco de inspiración en tu bandeja.
          </h2>
          <p className="mt-2 text-xs sm:text-sm opacity-70 text-[var(--color-texto)]">
            Novedades de taller, lanzamientos y piezas exclusivas que merecen un lugar en tu vida.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-md md:ml-auto w-full">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={subscribed}
            placeholder="Tu correo electrónico"
            aria-label="Correo electrónico para suscribirse"
            className="w-full h-11 px-4 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-superficie)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] focus:ring-1 focus:ring-[var(--color-primario)] transition-all text-[var(--color-texto)] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={subscribed}
            className="h-11 px-5 rounded-xl bg-[var(--color-primario)] text-white text-xs sm:text-sm font-semibold shrink-0 inline-flex items-center gap-1.5 shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:bg-emerald-600 disabled:opacity-100"
          >
            {subscribed ? (
              <>
                <Check className="w-4 h-4" />
                <span>Suscrito</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Suscribirme</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  )
}
