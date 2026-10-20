// =============================================================================
// PORTALMAKER — Formulario de Configuración de Envíos (Fase 3)
// Permite vincular Zipnova, verificar credenciales, activar/desactivar proveedores,
// y configurar markup, envío gratis, retiro en local y tarifa fallback.
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Store } from '@/types/database'
import {
  Truck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Save,
  ExternalLink,
} from 'lucide-react'

interface EnviosFormProps {
  store: Store
  tenantQuery: string
}

interface ShippingSettings {
  storeSettings: {
    envios_activo: boolean
    envio_gratis_desde: number | null
    envio_markup_porcentaje: number
    envio_tarifa_fallback: number | null
    envio_retiro_local_activo: boolean
    envio_comision_incluye_envio: boolean
    origen_completo: boolean
  }
  providers: {
    zipnova: {
      activo: boolean
      configurado: boolean
      status: string
      last_verified_at: string | null
    }
    manual: {
      activo: boolean
      status: string
    }
  }
}

export default function EnviosForm({ store: _store, tenantQuery }: EnviosFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [verifyingZipnova, setVerifyingZipnova] = useState(false)
  const [settings, setSettings] = useState<ShippingSettings | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; message: string } | null>(null)

  // Campos de formulario Zipnova
  const [zipnovaApiKey, setZipnovaApiKey] = useState('')
  const [zipnovaSecretKey, setZipnovaSecretKey] = useState('')
  const [zipnovaAccountId, setZipnovaAccountId] = useState('')
  const [zipnovaActivo, setZipnovaActivo] = useState(true)

  // Configuración general
  const [envioGratisDesde, setEnvioGratisDesde] = useState<string>('')
  const [envioMarkup, setEnvioMarkup] = useState<string>('0')
  const [envioFallback, setEnvioFallback] = useState<string>('')
  const [retiroLocalActivo, setRetiroLocalActivo] = useState<boolean>(true)
  const [comisionIncluyeEnvio, setComisionIncluyeEnvio] = useState<boolean>(false)

  // Cargar estado inicial
  const loadData = async () => {
    try {
      const res = await fetch(`/api/tienda/admin/envios${tenantQuery}`)
      if (!res.ok) throw new Error('Error al consultar configuración')
      const data: ShippingSettings = await res.json()
      setSettings(data)

      setZipnovaActivo(data.providers.zipnova.activo)
      setEnvioGratisDesde(data.storeSettings.envio_gratis_desde ? String(data.storeSettings.envio_gratis_desde) : '')
      setEnvioMarkup(String(data.storeSettings.envio_markup_porcentaje ?? 0))
      setEnvioFallback(data.storeSettings.envio_tarifa_fallback ? String(data.storeSettings.envio_tarifa_fallback) : '')
      setRetiroLocalActivo(data.storeSettings.envio_retiro_local_activo)
      setComisionIncluyeEnvio(data.storeSettings.envio_comision_incluye_envio)
    } catch {
      setFeedback({ type: 'error', message: 'No se pudieron cargar los datos de envíos.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    const init = async () => {
      try {
        const res = await fetch(`/api/tienda/admin/envios${tenantQuery}`)
        if (!res.ok) throw new Error('Error al consultar configuración')
        const data: ShippingSettings = await res.json()
        if (mounted) {
          setSettings(data)
          setZipnovaActivo(data.providers.zipnova.activo)
          setEnvioGratisDesde(data.storeSettings.envio_gratis_desde ? String(data.storeSettings.envio_gratis_desde) : '')
          setEnvioMarkup(String(data.storeSettings.envio_markup_porcentaje ?? 0))
          setEnvioFallback(data.storeSettings.envio_tarifa_fallback ? String(data.storeSettings.envio_tarifa_fallback) : '')
          setRetiroLocalActivo(data.storeSettings.envio_retiro_local_activo)
          setComisionIncluyeEnvio(data.storeSettings.envio_comision_incluye_envio)
        }
      } catch {
        if (mounted) {
          setFeedback({ type: 'error', message: 'No se pudieron cargar los datos de envíos.' })
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [tenantQuery])

  // Guardar credenciales de Zipnova
  const handleSaveZipnova = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifyingZipnova(true)
    setFeedback(null)

    try {
      const res = await fetch(`/api/tienda/admin/envios${tenantQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_zipnova',
          apiKey: zipnovaApiKey,
          secretKey: zipnovaSecretKey,
          accountId: zipnovaAccountId,
          activo: zipnovaActivo,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar credenciales')

      if (data.ok) {
        setFeedback({
          type: 'ok',
          message: '¡Credenciales de Zipnova verificadas y guardadas exitosamente!',
        })
        setZipnovaApiKey('')
        setZipnovaSecretKey('')
        await loadData()
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Zipnova rechazó las credenciales ingresadas.',
        })
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: (err as Error)?.message || 'Fallo de conexión.',
      })
    } finally {
      setVerifyingZipnova(false)
    }
  }

  // Re-verificar credenciales existentes
  const handleReverifyZipnova = async () => {
    setVerifyingZipnova(true)
    setFeedback(null)

    try {
      const res = await fetch(`/api/tienda/admin/envios${tenantQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_zipnova' }),
      })

      const data = await res.json()
      if (data.ok) {
        setFeedback({ type: 'ok', message: 'Conexión con Zipnova confirmada y activa.' })
        await loadData()
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Las credenciales guardadas no pudieron ser validadas.',
        })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Error al contactar con Zipnova.' })
    } finally {
      setVerifyingZipnova(false)
    }
  }

  // Guardar configuración general
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    setFeedback(null)

    try {
      const res = await fetch(`/api/tienda/admin/envios${tenantQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_settings',
          envio_gratis_desde: envioGratisDesde,
          envio_markup_porcentaje: envioMarkup,
          envio_tarifa_fallback: envioFallback,
          envio_retiro_local_activo: retiroLocalActivo,
          envio_comision_incluye_envio: comisionIncluyeEnvio,
        }),
      })

      if (!res.ok) throw new Error('Error al guardar la configuración')

      setFeedback({ type: 'ok', message: 'Configuración general de envíos guardada.' })
      router.refresh()
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: (err as Error)?.message || 'Error al guardar.' })
    } finally {
      setSavingSettings(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const isZipnovaOk = settings?.providers.zipnova.status === 'ok'
  const isOrigenOk = settings?.storeSettings.origen_completo

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Truck className="w-7 h-7 text-amber-500" />
          Envíos y Despacho
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gestioná tus proveedores de paquetería, cotización automática y políticas de entrega.
        </p>
      </div>

      {/* Alerta si el origen no está completo */}
      {!isOrigenOk && (
        <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              Dirección de origen de despacho incompleta
            </p>
            <p className="text-amber-700 dark:text-amber-300/90 mt-0.5">
              Los carriers requieren la dirección y el código postal de tu taller para calcular tarifas.
            </p>
            <Link
              href={`/tienda/admin/contacto${tenantQuery}`}
              className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300 underline mt-2 hover:opacity-80"
            >
              Completar origen en Contacto & Ubicación
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Banner de Feedback */}
      {feedback && (
        <div
          className={`rounded-xl p-4 flex items-center gap-3 ${
            feedback.type === 'ok'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-500/10 border border-red-500/30 text-red-800 dark:text-red-300'
          }`}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Proveedor 1: Zipnova */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400">
              Z
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Zipnova Envíos
                {isZipnovaOk && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold">
                    Conectado
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acceso multicarrier a Correo Argentino, Andreani, OCA y envíos flex.
              </p>
            </div>
          </div>

          {settings?.providers.zipnova.configurado && (
            <button
              type="button"
              onClick={handleReverifyZipnova}
              disabled={verifyingZipnova}
              className="min-h-[44px] px-4 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {verifyingZipnova ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              )}
              Verificar conexión
            </button>
          )}
        </div>

        <form onSubmit={handleSaveZipnova} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                API Key
              </label>
              <input
                type="text"
                placeholder={settings?.providers.zipnova.configurado ? '••••••••••••••••' : 'Ej: f609a95d-...'}
                value={zipnovaApiKey}
                onChange={(e) => setZipnovaApiKey(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-transparent focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                API Secret
              </label>
              <input
                type="password"
                placeholder={settings?.providers.zipnova.configurado ? '••••••••••••••••' : 'Ej: 5a26f172-...'}
                value={zipnovaSecretKey}
                onChange={(e) => setZipnovaSecretKey(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-transparent focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ID de Cuenta (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: 22112"
                value={zipnovaAccountId}
                onChange={(e) => setZipnovaAccountId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-transparent focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                id="zipnova-activo"
                type="checkbox"
                checked={zipnovaActivo}
                onChange={(e) => setZipnovaActivo(e.target.checked)}
                className="w-4 h-4 rounded-md accent-amber-500 cursor-pointer"
              />
              <label htmlFor="zipnova-activo" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                Habilitar cotizaciones automáticas con Zipnova
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              Tus credenciales se cifran con AES-256-GCM y nunca se exponen al cliente.
            </span>

            <button
              type="submit"
              disabled={verifyingZipnova}
              className="min-h-[44px] px-5 rounded-xl font-semibold text-xs bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors flex items-center gap-2 cursor-pointer"
            >
              {verifyingZipnova ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar y verificar
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Reglas de Cotización y Políticas */}
      <form onSubmit={handleSaveSettings} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Políticas y Tarifas de Entrega
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Personalizá márgenes, montos para envío gratis y alternativas de retiro.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Envío gratis desde */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Envío gratis a partir de ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Vacío = sin envío gratis"
              value={envioGratisDesde}
              onChange={(e) => setEnvioGratisDesde(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-transparent focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Si el total del pedido supera este monto, el costo de envío es $0.
            </p>
          </div>

          {/* Margen adicional (Markup) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Recargo / Margen de embalaje (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="0"
              value={envioMarkup}
              onChange={(e) => setEnvioMarkup(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-transparent focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Porcentaje adicional que se suma a la tarifa del carrier para cubrir cajas y embalaje.
            </p>
          </div>

          {/* Tarifa de Fallback */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tarifa de emergencia / Fallback ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 4500"
              value={envioFallback}
              onChange={(e) => setEnvioFallback(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-transparent focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Precio fijo que se cobrará al cliente si los servicios de los carriers están caídos.
            </p>
          </div>

          {/* Retiro en Local */}
          <div className="flex flex-col justify-center space-y-2">
            <div className="flex items-center gap-2.5">
              <input
                id="retiro-local"
                type="checkbox"
                checked={retiroLocalActivo}
                onChange={(e) => setRetiroLocalActivo(e.target.checked)}
                className="w-4 h-4 rounded-md accent-amber-500 cursor-pointer"
              />
              <label htmlFor="retiro-local" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                Permitir retiro gratuito en el local / taller
              </label>
            </div>
            <p className="text-[11px] text-slate-400 ml-6">
              El cliente podrá seleccionar retirar su pedido sin costo en tu dirección.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-white/5">
          <button
            type="submit"
            disabled={savingSettings}
            className="min-h-[44px] px-6 rounded-xl font-semibold text-xs bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors flex items-center gap-2 cursor-pointer"
          >
            {savingSettings ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar políticas
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
