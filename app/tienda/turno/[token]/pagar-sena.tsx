// =============================================================================
// PORTALMAKER — Botón para pagar (o reintentar) la seña de un turno
// Reutiliza el endpoint de preferencia del checkout: la orden de la seña es
// una orden común de Mercado Pago.
// =============================================================================

'use client'

import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'

export default function PagarSena({
  orderId,
  publicToken,
  storeId,
  monto,
  tenantQuery,
}: {
  orderId: string
  publicToken: string
  storeId: string
  monto: number
  tenantQuery: string
}) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pagar = async () => {
    setEnviando(true)
    setError(null)
    const res = await fetch(`/api/checkout/mercadopago/preference${tenantQuery}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, publicToken, storeId, returnOrigin: window.location.origin }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.initPoint) {
      window.location.href = data.initPoint
      return
    }
    setEnviando(false)
    setError(data?.error || 'No pudimos abrir Mercado Pago. Probá de nuevo.')
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={pagar}
        disabled={enviando}
        className="w-full min-h-12 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        Pagar seña de {'$' + monto.toLocaleString('es-AR')}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
