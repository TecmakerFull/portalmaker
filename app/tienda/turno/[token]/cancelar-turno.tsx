// =============================================================================
// PORTALMAKER — Botón para que el cliente cancele su turno (con confirmación)
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, X } from 'lucide-react'

export default function CancelarTurno({ token, tenantQuery }: { token: string; tenantQuery: string }) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancelar = async () => {
    setEnviando(true)
    setError(null)
    const res = await fetch(`/api/turnos/cancelar${tenantQuery}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data = await res.json().catch(() => ({}))
    setEnviando(false)
    if (!res.ok) {
      setError(data?.error || 'No se pudo cancelar. Probá de nuevo.')
      return
    }
    router.refresh()
  }

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="min-h-12 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer hover:bg-red-500/10">
        <X className="w-4 h-4" /> Cancelar turno
      </button>
    )
  }

  return (
    <div className="space-y-2 p-3 rounded-xl border border-red-500/30">
      <p className="text-sm">¿Seguro que querés cancelar? El horario queda libre para otra persona.</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setConfirmando(false)} className="min-h-11 rounded-xl border border-black/15 dark:border-white/15 text-sm font-semibold cursor-pointer">
          No, volver
        </button>
        <button type="button" disabled={enviando} onClick={cancelar} className="min-h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
          {enviando && <Loader2 className="w-4 h-4 animate-spin" />} Sí, cancelar
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
