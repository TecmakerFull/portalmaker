// =============================================================================
// PORTALMAKER — Formulario de Contacto de la Landing (Client Component)
// Envía consultas mediante /api/portal/contacto (Resend -> temperini@gmail.com)
// con reply_to al correo del remitente.
// =============================================================================

'use client'

import { useState } from 'react'
import { Send, Check, Loader2, AlertCircle } from 'lucide-react'

export default function PortalContactForm() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [motivo, setMotivo] = useState('Consulta comercial / Crear tienda')
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !mensaje.trim()) return

    setLoading(true)
    setErrorMsg(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/portal/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          email: email.trim(),
          motivo,
          mensaje: mensaje.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo enviar tu mensaje.')
      }

      setSuccess(true)
      setNombre('')
      setEmail('')
      setMensaje('')
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al enviar la consulta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 sm:p-7 rounded-2xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] space-y-4 text-left"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-base text-[var(--color-texto)]">
          Envianos un mensaje directo
        </h3>
        <span className="text-xs font-mono opacity-60">info@portalmaker.ar</span>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>Recibimos tu consulta. Te responderemos a la brevedad a tu correo.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1 opacity-80">
            Tu nombre
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Martín Gómez"
            className="w-full h-11 px-3.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-xs sm:text-sm outline-none focus:border-[#FF5500] text-[var(--color-texto)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 opacity-80">
            Tu correo electrónico *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            className="w-full h-11 px-3.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-xs sm:text-sm outline-none focus:border-[#FF5500] text-[var(--color-texto)]"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1 opacity-80">
          Motivo de consulta
        </label>
        <select
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="w-full h-11 px-3.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-xs sm:text-sm outline-none focus:border-[#FF5500] text-[var(--color-texto)]"
        >
          <option value="Consulta comercial / Crear tienda">Consulta comercial / Crear tienda</option>
          <option value="Planes y suscripciones">Planes y suscripciones</option>
          <option value="Soporte técnico">Soporte técnico</option>
          <option value="Plan Enterprise / A medida">Plan Enterprise / A medida</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1 opacity-80">
          Mensaje *
        </label>
        <textarea
          required
          rows={3}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Contanos en qué podemos ayudarte..."
          className="w-full p-3.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-xs sm:text-sm outline-none focus:border-[#FF5500] text-[var(--color-texto)] resize-y"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{ color: '#FFFFFF' }}
        className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Enviando...</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>Enviar consulta</span>
          </>
        )}
      </button>
    </form>
  )
}

