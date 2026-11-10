'use client'

// =============================================================================
// PORTALMAKER — Controles del débito automático (panel del dueño)
// Activa o cancela la suscripción de Mercado Pago. Solo envía el storeId: plan y
// monto los resuelve el servidor.
// =============================================================================

import { useState } from 'react'
import { Loader2, Repeat } from 'lucide-react'

interface Props {
  storeId: string
  status: 'none' | 'pending' | 'authorized' | 'paused' | 'cancelled'
  amountLabel: string | null
}

export default function AutodebitControls({ storeId, status, amountLabel }: Props) {
  const [loading, setLoading] = useState<'enable' | 'cancel' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function call(kind: 'enable' | 'cancel') {
    setLoading(kind)
    setError(null)
    try {
      const res = await fetch(`/api/subscriptions/autodebit/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, returnOrigin: window.location.origin }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'No pudimos completar la operación.')
        setLoading(null)
        return
      }
      if (kind === 'enable' && data.initPoint) {
        window.location.href = data.initPoint
        return
      }
      window.location.reload()
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
      setLoading(null)
    }
  }

  const active = status === 'authorized' || status === 'paused'
  const pending = status === 'pending'

  return (
    <div className="rounded-2xl border border-[var(--color-borde)] p-4 space-y-3">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Repeat className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
          <span>Débito automático</span>
        </h3>
        <p className="text-xs opacity-70">
          {active
            ? `Activo: Mercado Pago cobra ${amountLabel ?? 'tu plan'} cada mes con el medio de pago que autorizaste. Podés cancelarlo cuando quieras y volver al pago manual.`
            : pending
              ? 'Falta que autorices el medio de pago en Mercado Pago. Mientras tanto seguís pagando de forma manual.'
              : 'Opcional: autorizá un medio de pago en Mercado Pago y la suscripción se renueva sola cada mes. Podés cancelarlo cuando quieras.'}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        {!active && (
          <button
            type="button"
            onClick={() => call('enable')}
            disabled={loading !== null}
            className="min-h-[44px] px-4 rounded-xl bg-[#CA8A04] hover:bg-[#A16207] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading === 'enable' && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{pending ? 'Completar la autorización' : 'Activar débito automático'}</span>
          </button>
        )}
        {(active || pending) && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('¿Cancelar el débito automático? Vas a volver al pago manual y conservás el período ya pagado.')) call('cancel')
            }}
            disabled={loading !== null}
            className="min-h-[44px] px-4 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading === 'cancel' && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Cancelar débito automático</span>
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-[11px] text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  )
}
