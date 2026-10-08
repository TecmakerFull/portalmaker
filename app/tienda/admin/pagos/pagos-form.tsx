// =============================================================================
// PORTALMAKER — Formulario de Configuración de Datos de Transferencia y Cobros
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Store } from '@/types/database'
import {
  CreditCard,
  Save,
  Loader2,
  Check,
  AlertTriangle,
  AlertCircle,
  Banknote,
  Building2,
  User,
  FileText,
  Copy,
} from 'lucide-react'

export default function PagosForm({
  store,
  tenantQuery,
}: {
  store: Store
  tenantQuery: string
}) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [transferenciaActiva, setTransferenciaActiva] = useState(
    store.transferencia_activa ?? false
  )
  const [alias, setAlias] = useState(store.transferencia_alias ?? '')
  const [cbuCvu, setCbuCvu] = useState(store.transferencia_cbu_cvu ?? '')
  const [banco, setBanco] = useState(store.transferencia_banco ?? '')
  const [titular, setTitular] = useState(store.transferencia_titular ?? '')
  const [cuit, setCuit] = useState(store.transferencia_cuit ?? '')
  const [instrucciones, setInstrucciones] = useState(
    store.transferencia_instrucciones ?? 'Enviar comprobante de transferencia por WhatsApp indicando el número de pedido.'
  )

  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          transferencia_activa: transferenciaActiva,
          transferencia_alias: alias.trim() || null,
          transferencia_cbu_cvu: cbuCvu.trim() || null,
          transferencia_banco: banco.trim() || null,
          transferencia_titular: titular.trim() || null,
          transferencia_cuit: cuit.trim() || null,
          transferencia_instrucciones: instrucciones.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', store.id)

      if (error) throw error

      setSuccessMsg('¡Datos de cobro guardados correctamente!')
      router.refresh()
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar los datos de cobro.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-texto)] font-[var(--font-heading)] flex items-center gap-2.5">
          <CreditCard className="w-7 h-7 text-[#CA8A04] dark:text-[#FACC15]" />
          <span>Cobros & Datos de Transferencia</span>
        </h1>
        <p className="text-xs sm:text-sm opacity-70 mt-1">
          Configura los datos bancarios para que tus compradores puedan transferir directamente y copiar tu alias o CBU en el checkout.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Switch de Activación */}
        <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold">Aceptar pagos por Transferencia Bancaria</h2>
              <p className="text-xs opacity-70 mt-0.5">
                Al activarlo, tus clientes verán la opción de transferir y tus datos precargados con botones de copia rápida.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setTransferenciaActiva(!transferenciaActiva)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                transferenciaActiva ? 'bg-[#FACC15]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  transferenciaActiva ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 2. Formulario de Datos Bancarios */}
        <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Banknote className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
            <span>Datos de tu Cuenta Bancaria o Billetera Virtual</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Alias */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                Alias (Recomendado)
              </label>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Ej: tecmaker.3d.mp"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
              />
            </div>

            {/* CBU / CVU */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                CBU o CVU (22 dígitos)
              </label>
              <input
                type="text"
                value={cbuCvu}
                onChange={(e) => setCbuCvu(e.target.value)}
                placeholder="Ej: 0000003100012345678901"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
              />
            </div>

            {/* Banco / Billetera */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                Banco / Billetera
              </label>
              <input
                type="text"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                placeholder="Ej: Mercado Pago, Banco Nación, Santander, etc."
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
              />
            </div>

            {/* Titular */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                Nombre del Titular de la Cuenta
              </label>
              <input
                type="text"
                value={titular}
                onChange={(e) => setTitular(e.target.value)}
                placeholder="Ej: Enrique Gómez"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
              />
            </div>

            {/* CUIT / CUIL */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                CUIT / CUIL del Titular (Opcional)
              </label>
              <input
                type="text"
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                placeholder="Ej: 20-34567890-9"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
              />
            </div>

            {/* Instrucciones adicionales */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                Instrucciones para el Comprobante (Opcional)
              </label>
              <textarea
                rows={2}
                value={instrucciones}
                onChange={(e) => setInstrucciones(e.target.value)}
                placeholder="Ej: Enviar comprobante de transferencia por WhatsApp indicando el número de pedido."
                className="w-full p-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15] leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Botón Guardar y Feedback */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
          {successMsg && (
            <div className="p-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3 px-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="min-h-[48px] px-7 py-3 rounded-2xl bg-[#FACC15] text-[#1F2937] font-bold text-sm hover:bg-[#EAB308] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Datos de Cobro</span>
              </>
            )}
          </button>
        </div>

        {/* Notificación Toast Flotante */}
        {successMsg && (
          <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#1F2937] text-white text-sm font-medium shadow-2xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span>{successMsg}</span>
          </div>
        )}
      </form>
    </div>
  )
}
