// =============================================================================
// PORTALMAKER — Formulario de Configuración de Cobros (Mercado Pago & Transferencia)
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  ShieldCheck,
  Link2,
  Unlink,
  Percent,
  ExternalLink,
  Info,
} from 'lucide-react'
import { StickySaveBar } from '../components/sticky-save-bar'

export default function PagosForm({
  store,
  tenantQuery,
}: {
  store: Store
  tenantQuery: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseBrowserClient()

  // Mercado Pago
  const [mpConnected, setMpConnected] = useState(store.mp_connected ?? false)
  const [mpRecargo, setMpRecargo] = useState<number | string>(store.mp_recargo_porcentaje ?? 0)
  const [disconnectingMp, setDisconnectingMp] = useState(false)

  // Transferencia Bancaria
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

  const [loadingMp, setLoadingMp] = useState(false)
  const [loadingTransf, setLoadingTransf] = useState(false)
  const [successMpMsg, setSuccessMpMsg] = useState<string | null>(null)
  const [successTransfMsg, setSuccessTransfMsg] = useState<string | null>(null)
  const [errorMpMsg, setErrorMpMsg] = useState<string | null>(null)
  const [errorTransfMsg, setErrorTransfMsg] = useState<string | null>(null)

  // Feedback de OAuth por URL params
  useEffect(() => {
    const successParam = searchParams.get('success')
    const errorParam = searchParams.get('error')

    if (successParam === 'mp_connected') {
      setSuccessMpMsg('Tu cuenta de Mercado Pago fue conectada exitosamente.')
      setMpConnected(true)
      router.replace(window.location.pathname + (tenantQuery || ''))
    } else if (errorParam) {
      if (errorParam === 'mp_denied') {
        setErrorMpMsg('La autorización de Mercado Pago fue cancelada.')
      } else {
        setErrorMpMsg('Ocurrió un error al vincular tu cuenta de Mercado Pago. Reintenta.')
      }
      router.replace(window.location.pathname + (tenantQuery || ''))
    }
  }, [searchParams, router, tenantQuery])

  // Desvincular Mercado Pago
  const handleDisconnectMp = async () => {
    if (!confirm('¿Estás seguro de que deseas desvincular tu cuenta de Mercado Pago? Tu tienda dejará de aceptar pagos online directos hasta que vuelvas a conectarla.')) {
      return
    }

    setDisconnectingMp(true)
    setErrorMpMsg(null)

    try {
      const res = await fetch('/api/auth/mercadopago/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: store.id }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al desvincular')

      setMpConnected(false)
      setSuccessMpMsg('Cuenta de Mercado Pago desvinculada.')
      router.refresh()
      setTimeout(() => setSuccessMpMsg(null), 4000)
    } catch (err: any) {
      setErrorMpMsg(err?.message || 'No se pudo desvincular Mercado Pago.')
    } finally {
      setDisconnectingMp(false)
    }
  }

  // Guardar exclusivamente configuración de Mercado Pago (Recargo)
  const handleSaveMp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoadingMp(true)
    setErrorMpMsg(null)
    setSuccessMpMsg(null)

    try {
      const res = await fetch('/api/store/payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          section: 'mp',
          mpRecargoPorcentaje: mpRecargo,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar la configuración de Mercado Pago.')
      }

      setMpRecargo(data.recargo ?? mpRecargo)
      setSuccessMpMsg('Configuración de Mercado Pago guardada correctamente.')
      router.refresh()
      setTimeout(() => setSuccessMpMsg(null), 4000)
    } catch (err: any) {
      setErrorMpMsg(err?.message || 'Error al guardar los datos de Mercado Pago.')
    } finally {
      setLoadingMp(false)
    }
  }

  // Guardar exclusivamente configuración de Transferencia Bancaria
  const handleSaveTransferencia = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoadingTransf(true)
    setErrorTransfMsg(null)
    setSuccessTransfMsg(null)

    try {
      const res = await fetch('/api/store/payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          section: 'transferencia',
          transferenciaActiva,
          transferenciaAlias: alias,
          transferenciaCbuCvu: cbuCvu,
          transferenciaBanco: banco,
          transferenciaTitular: titular,
          transferenciaCuit: cuit,
          transferenciaInstrucciones: instrucciones,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar los datos de transferencia.')
      }

      setSuccessTransfMsg('Datos de transferencia bancaria guardados correctamente.')
      router.refresh()
      setTimeout(() => setSuccessTransfMsg(null), 4000)
    } catch (err: any) {
      setErrorTransfMsg(err?.message || 'Error al guardar los datos de transferencia.')
    } finally {
      setLoadingTransf(false)
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-texto)] font-[var(--font-heading)] flex items-center gap-2.5">
          <CreditCard className="w-7 h-7 text-[#009EE3]" />
          <span>Métodos de Pago y Cobro</span>
        </h1>
        <p className="text-xs sm:text-sm opacity-70 mt-1">
          Configura cómo reciben el dinero de las ventas: vinculá tu cuenta de Mercado Pago para cobros automáticos o carga tus datos bancarios para transferencias directas.
        </p>
      </div>

      <div className="space-y-6">
        {/* =========================================================================
            1. MERCADO PAGO INTEGRATION CARD
        ========================================================================== */}
        <form onSubmit={handleSaveMp} className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-borde)]/60 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#009EE3]/10 border border-[#009EE3]/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[#009EE3]" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <span>Mercado Pago</span>
                    {mpConnected ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Conectado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                        No conectado
                      </span>
                    )}
                  </h2>
                  <p className="text-xs opacity-70">
                    Tarjetas de crédito, débito, cuotas y dinero en cuenta con acreditación directa.
                  </p>
                </div>
              </div>
            </div>

            {/* Acción de Conectar / Desconectar */}
            <div className="shrink-0">
              {mpConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnectMp}
                  disabled={disconnectingMp}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-500/10 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {disconnectingMp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Unlink className="w-4 h-4" />
                  )}
                  <span>Desvincular cuenta</span>
                </button>
              ) : (
                <a
                  href={`/api/auth/mercadopago/authorize?store_id=${store.id}`}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#009EE3] text-white text-xs sm:text-sm font-semibold hover:bg-[#0089C7] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Link2 className="w-4 h-4" />
                  <span>Conectar con Mercado Pago</span>
                </a>
              )}
            </div>
          </div>

          {/* Información del Estado */}
          {mpConnected ? (
            <div className="space-y-4">
              {/* Fila superior: Estado de conexión y selector de recargo en la misma línea en desktop */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* Banner de estado listo */}
                <div className="lg:col-span-7 xl:col-span-8 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm space-y-1">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                      Tu tienda está lista para cobrar con Mercado Pago
                    </p>
                    <p className="opacity-80 text-xs leading-relaxed">
                      Cuando un cliente compra en tu tienda, el dinero neto se acredita directamente en tu cuenta de Mercado Pago en el momento.
                    </p>
                  </div>
                </div>

                {/* Recargo opcional por pagar con Mercado Pago */}
                <div className="lg:col-span-5 xl:col-span-4 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)]/70 flex flex-col justify-between space-y-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider opacity-75 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-[#009EE3]" />
                        <span>Recargo adicional (%)</span>
                      </span>
                      <span className="text-[10px] font-normal lowercase opacity-60">máx 15%</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="15"
                        value={mpRecargo}
                        onChange={(e) => setMpRecargo(e.target.value)}
                        placeholder="0"
                        className="w-full min-h-[44px] pl-3.5 pr-10 py-2 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#009EE3]"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold opacity-50">
                        %
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] opacity-60 leading-tight">
                    Porcentaje extra que abona el comprador (0% = sin recargo).
                  </p>
                </div>
              </div>

              {/* Tabla orientativa de comisiones de Mercado Pago */}
              <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)]/70 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold opacity-80">
                  <Info className="w-4 h-4 text-[#009EE3]" />
                  <span>Referencia de comisiones habituales de Mercado Pago (Cobros online)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-[var(--color-superficie)] border border-[var(--color-borde)]/50">
                    <p className="font-bold text-[11px] opacity-60 uppercase">Dinero en cuenta / Débito</p>
                    <p className="text-sm font-bold text-[var(--color-texto)] mt-0.5">~3,19% + IVA</p>
                    <p className="text-[10px] opacity-55">Acreditación en el acto</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--color-superficie)] border border-[var(--color-borde)]/50">
                    <p className="font-bold text-[11px] opacity-60 uppercase">Tarjeta de Crédito en el acto</p>
                    <p className="text-sm font-bold text-[var(--color-texto)] mt-0.5">~6,39% + IVA</p>
                    <p className="text-[10px] opacity-55">Acreditación inmediata</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--color-superficie)] border border-[var(--color-borde)]/50">
                    <p className="font-bold text-[11px] opacity-60 uppercase">Comisión Portalmaker</p>
                    <p className="text-sm font-bold text-[#009EE3] mt-0.5">2,00%</p>
                    <p className="text-[10px] opacity-55">Retención por servicio de plataforma</p>
                  </div>
                </div>
                <p className="text-[10px] opacity-50">
                  * Las tasas exactas y plazos dependen de tu configuración en tu cuenta de Mercado Pago (tasas sujetas a cambios de Mercado Pago Argentina).
                </p>
              </div>

              {/* Botón de Guardar Mercado Pago */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[var(--color-borde)]/40">
                <div>
                  {successMpMsg && (
                    <div className="p-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>{successMpMsg}</span>
                    </div>
                  )}
                  {errorMpMsg && (
                    <div className="p-2.5 px-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errorMpMsg}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loadingMp}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#009EE3] text-white font-bold text-xs sm:text-sm hover:bg-[#0089C7] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {loadingMp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando Mercado Pago...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Cambios de Mercado Pago</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-500/5 border border-[var(--color-borde)] flex items-start gap-3">
              <Info className="w-5 h-5 text-[#009EE3] shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm space-y-1">
                <p className="font-semibold text-[var(--color-texto)]">
                  Vinculación oficial con 1 solo clic
                </p>
                <p className="text-xs opacity-70 leading-relaxed">
                  Al hacer clic en &quot;Conectar con Mercado Pago&quot;, iniciarás sesión en tu cuenta de Mercado Pago y autorizarás a Portalmaker para procesar las compras. No necesitas ingresar claves secretas ni tokens manuales.
                </p>
              </div>
            </div>
          )}
        </form>

        {/* =========================================================================
            2. TRANSFERENCIA BANCARIA CARD
        ========================================================================== */}
        <form onSubmit={handleSaveTransferencia} className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--color-borde)]/60 pb-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Banknote className="w-5 h-5 text-[#CA8A04] dark:text-[#FACC15]" />
                <span>Transferencia Bancaria o CVU</span>
              </h2>
              <p className="text-xs opacity-70 mt-0.5">
                Tus clientes verán tus datos precargados con botones de copia rápida para transferir y adjuntar su comprobante.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold uppercase tracking-wider ${transferenciaActiva ? 'text-emerald-700 dark:text-emerald-400' : 'opacity-50'}`}>
                {transferenciaActiva ? 'Habilitada' : 'Deshabilitada'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={transferenciaActiva}
                onClick={() => setTransferenciaActiva((prev) => !prev)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none min-h-[44px] min-w-[44px] items-center p-0.5 ${
                  transferenciaActiva ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                title={transferenciaActiva ? 'Click para deshabilitar transferencia' : 'Click para habilitar transferencia'}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    transferenciaActiva ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

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

          {/* Botón de Guardar Transferencia y Feedback */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[var(--color-borde)]/40">
            <div>
              {successTransfMsg && (
                <div className="p-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{successTransfMsg}</span>
                </div>
              )}
              {errorTransfMsg && (
                <div className="p-2.5 px-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorTransfMsg}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loadingTransf}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] font-bold text-xs sm:text-sm hover:bg-[#eab308] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
            >
              {loadingTransf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
                  <span>Guardando Transferencia...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-[#1F2937]" />
                  <span>Guardar Datos de Transferencia</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
