'use client'

// =============================================================================
// PORTALMAKER — Botón "Pagar con Mercado Pago" del plan (panel del dueño)
// Solo envía storeId y plan objetivo: el monto lo calcula el servidor.
// =============================================================================

import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'

interface Props {
  storeId: string
  targetPlan: 'starter' | 'maker_pro' | 'enterprise'
  label: string
  variant?: 'primary' | 'secondary'
  className?: string
}

export default function PayPlanButton({ storeId, targetPlan, label, variant = 'primary', className = '' }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePay() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/subscriptions/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, targetPlan, returnOrigin: window.location.origin }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.initPoint) {
        setError(data.error || 'No pudimos generar el link de pago.')
        setLoading(false)
        return
      }
      window.location.href = data.initPoint
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
      setLoading(false)
    }
  }

  const styles =
    variant === 'primary'
      ? 'bg-[#CA8A04] hover:bg-[#A16207] text-white'
      : 'border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5'

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className={`w-full min-h-[44px] px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 ${styles} ${className}`}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        <span>{loading ? 'Generando link de pago...' : label}</span>
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[11px] text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  )
}
