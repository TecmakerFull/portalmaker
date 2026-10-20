// =============================================================================
// PORTALMAKER — Formulario de Configuración de Envíos y Logística (Fase 3 y 6)
// Permite vincular Zipnova, verificar credenciales, configurar origen de despacho,
// y ajustar markup, envío gratis, retiro en local y tarifa fallback.
// REGLA CRÍTICA: Cero emojis, solo lucide-react, touch targets >= 44x44px.
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Store } from '@/types/database'
import {
  Truck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Save,
  MapPin,
  Building2,
  CircleCheck,
} from 'lucide-react'
import {
  isValidCodigoPostal,
  normalizeCodigoPostal,
  formatCuit,
  isValidCuit,
} from '@/lib/shipping-validators'

const PROVINCIAS = [
  'Ciudad Autónoma de Buenos Aires',
  'Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
]

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
    origen_calle?: string
    origen_altura?: string
    origen_piso_depto?: string
    origen_localidad?: string
    origen_provincia?: string
    origen_codigo_postal?: string
    origen_cuit?: string
    origen_razon_social?: string
    origen_telefono?: string
    origen_email?: string
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

const inputClass =
  'w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all shadow-xs'
const labelClass = 'block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5'

export default function EnviosForm({ store, tenantQuery }: EnviosFormProps) {
  const router = useRouter()
  const effectiveQuery = tenantQuery || (store?.slug ? `?tenant=${store.slug}` : '')

  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [verifyingZipnova, setVerifyingZipnova] = useState(false)
  const [savingOrigen, setSavingOrigen] = useState(false)
  const [settings, setSettings] = useState<ShippingSettings | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; message: string } | null>(null)

  // Origen de despacho (Taller)
  const [origenCalle, setOrigenCalle] = useState(store.origen_calle ?? '')
  const [origenAltura, setOrigenAltura] = useState(store.origen_altura ?? '')
  const [origenPisoDepto, setOrigenPisoDepto] = useState(store.origen_piso_depto ?? '')
  const [origenLocalidad, setOrigenLocalidad] = useState(store.origen_localidad ?? '')
  const [origenProvincia, setOrigenProvincia] = useState(store.origen_provincia ?? '')
  const [origenCodigoPostal, setOrigenCodigoPostal] = useState(store.origen_codigo_postal ?? '')
  const [origenCuit, setOrigenCuit] = useState(store.origen_cuit ?? '')
  const [origenRazonSocial, setOrigenRazonSocial] = useState(store.origen_razon_social ?? '')
  const [origenTelefono, setOrigenTelefono] = useState(store.origen_telefono ?? '')
  const [origenEmail, setOrigenEmail] = useState(store.origen_email ?? '')

  // Campos de formulario Zipnova
  const [zipnovaApiKey, setZipnovaApiKey] = useState('')
  const [zipnovaSecretKey, setZipnovaSecretKey] = useState('')
  const [zipnovaAccountId, setZipnovaAccountId] = useState('')
  const [zipnovaActivo, setZipnovaActivo] = useState(true)

  // Configuración general
  const [enviosActivoStore, setEnviosActivoStore] = useState(store.envios_activo ?? false)
  const [envioGratisDesde, setEnvioGratisDesde] = useState<string>('')
  const [envioMarkup, setEnvioMarkup] = useState<string>('0')
  const [envioFallback, setEnvioFallback] = useState<string>('')
  const [retiroLocalActivo, setRetiroLocalActivo] = useState<boolean>(true)
  const [comisionIncluyeEnvio, setComisionIncluyeEnvio] = useState<boolean>(false)

  // Cargar estado inicial
  const loadData = async () => {
    try {
      const res = await fetch(`/api/tienda/admin/envios${effectiveQuery}`)
      if (!res.ok) throw new Error('Error al consultar configuración')
      const data: ShippingSettings = await res.json()
      setSettings(data)

      setEnviosActivoStore(data.storeSettings.envios_activo)
      setZipnovaActivo(data.providers.zipnova.activo)
      setEnvioGratisDesde(data.storeSettings.envio_gratis_desde ? String(data.storeSettings.envio_gratis_desde) : '')
      setEnvioMarkup(String(data.storeSettings.envio_markup_porcentaje ?? 0))
      setEnvioFallback(data.storeSettings.envio_tarifa_fallback ? String(data.storeSettings.envio_tarifa_fallback) : '')
      setRetiroLocalActivo(data.storeSettings.envio_retiro_local_activo)
      setComisionIncluyeEnvio(data.storeSettings.envio_comision_incluye_envio)

      if (data.storeSettings.origen_calle) setOrigenCalle(data.storeSettings.origen_calle)
      if (data.storeSettings.origen_altura) setOrigenAltura(data.storeSettings.origen_altura)
      if (data.storeSettings.origen_piso_depto) setOrigenPisoDepto(data.storeSettings.origen_piso_depto)
      if (data.storeSettings.origen_localidad) setOrigenLocalidad(data.storeSettings.origen_localidad)
      if (data.storeSettings.origen_provincia) setOrigenProvincia(data.storeSettings.origen_provincia)
      if (data.storeSettings.origen_codigo_postal) setOrigenCodigoPostal(data.storeSettings.origen_codigo_postal)
      if (data.storeSettings.origen_cuit) setOrigenCuit(data.storeSettings.origen_cuit)
      if (data.storeSettings.origen_razon_social) setOrigenRazonSocial(data.storeSettings.origen_razon_social)
      if (data.storeSettings.origen_telefono) setOrigenTelefono(data.storeSettings.origen_telefono)
      if (data.storeSettings.origen_email) setOrigenEmail(data.storeSettings.origen_email)
    } catch {
      setFeedback({ type: 'error', message: 'No se pudieron cargar los datos de envíos.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [effectiveQuery])

  // Guardar Origen de Despacho
  const handleSaveOrigen = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingOrigen(true)
    setFeedback(null)

    if (!origenCodigoPostal.trim()) {
      setFeedback({ type: 'error', message: 'El código postal de origen es obligatorio para poder cotizar envíos.' })
      setSavingOrigen(false)
      return
    }
    if (!isValidCodigoPostal(origenCodigoPostal)) {
      setFeedback({ type: 'error', message: 'Código postal inválido. Usá 4 dígitos (ej: 2000) o formato CPA.' })
      setSavingOrigen(false)
      return
    }
    if (origenCuit.trim() && !isValidCuit(origenCuit)) {
      setFeedback({ type: 'error', message: 'El CUIT no es válido. Revisá los 11 dígitos con dígito verificador.' })
      setSavingOrigen(false)
      return
    }

    try {
      const res = await fetch(`/api/tienda/admin/envios${effectiveQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_origen',
          storeId: store.id,
          tenant: store.slug,
          calle: origenCalle,
          altura: origenAltura,
          pisoDepto: origenPisoDepto,
          localidad: origenLocalidad,
          provincia: origenProvincia,
          codigoPostal: normalizeCodigoPostal(origenCodigoPostal),
          cuit: origenCuit ? formatCuit(origenCuit) : '',
          razonSocial: origenRazonSocial,
          telefono: origenTelefono,
          email: origenEmail,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar origen de despacho')

      setFeedback({ type: 'ok', message: '¡Dirección de origen del taller guardada exitosamente!' })
      await loadData()
      router.refresh()
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: (err as Error)?.message || 'Error al guardar origen.' })
    } finally {
      setSavingOrigen(false)
    }
  }

  // Guardar credenciales de Zipnova
  const handleSaveZipnova = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifyingZipnova(true)
    setFeedback(null)

    try {
      const res = await fetch(`/api/tienda/admin/envios${effectiveQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_zipnova',
          storeId: store.id,
          tenant: store.slug,
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
        message: (err as Error)?.message || 'Error al conectar con el servidor',
      })
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
      const res = await fetch(`/api/tienda/admin/envios${effectiveQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_settings',
          storeId: store.id,
          tenant: store.slug,
          envio_gratis_desde: envioGratisDesde,
          envio_markup_porcentaje: envioMarkup,
          envio_tarifa_fallback: envioFallback,
          envio_retiro_local_activo: retiroLocalActivo,
          envio_comision_incluye_envio: comisionIncluyeEnvio,
        }),
      })

      if (!res.ok) throw new Error('Error al guardar la configuración')

      setFeedback({ type: 'ok', message: 'Configuración general de envíos guardada exitosamente.' })
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

      {/* Banner de Feedback Global */}
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

      {/* SECCIÓN 1: Origen de Despacho (Taller / Showroom) */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center font-bold text-amber-600 dark:text-amber-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Dirección de Origen de Despacho
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lugar físico desde donde despachas los paquetes (indispensable para calcular tarifas y emitir guías).
              </p>
            </div>
          </div>

          <div>
            {isOrigenOk ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CircleCheck className="w-3.5 h-3.5" />
                Origen completo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <AlertCircle className="w-3.5 h-3.5" />
                Incompleto (falta CP o dirección)
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveOrigen} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Calle</label>
              <input
                type="text"
                value={origenCalle}
                onChange={(e) => setOrigenCalle(e.target.value)}
                placeholder="Ej: Lamadrid"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Altura / Número</label>
              <input
                type="text"
                value={origenAltura}
                onChange={(e) => setOrigenAltura(e.target.value)}
                placeholder="Ej: 650"
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Piso / Depto</label>
              <input
                type="text"
                value={origenPisoDepto}
                onChange={(e) => setOrigenPisoDepto(e.target.value)}
                placeholder="Ej: 2B (opcional)"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Código Postal *</label>
              <input
                type="text"
                value={origenCodigoPostal}
                onChange={(e) => setOrigenCodigoPostal(e.target.value)}
                placeholder="Ej: 2000 o S2000ABC"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Localidad / Ciudad</label>
              <input
                type="text"
                value={origenLocalidad}
                onChange={(e) => setOrigenLocalidad(e.target.value)}
                placeholder="Ej: Rosario"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Provincia</label>
              <select
                value={origenProvincia}
                onChange={(e) => setOrigenProvincia(e.target.value)}
                required
                className={inputClass}
              >
                <option value="">Seleccionar...</option>
                {PROVINCIAS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100 dark:border-white/5">
            <div>
              <label className={labelClass}>CUIT (Opcional)</label>
              <input
                type="text"
                value={origenCuit}
                onChange={(e) => setOrigenCuit(e.target.value)}
                placeholder="20-xxxxxxxx-x"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Razón Social / Nombre Taller</label>
              <input
                type="text"
                value={origenRazonSocial}
                onChange={(e) => setOrigenRazonSocial(e.target.value)}
                placeholder={store.nombre || 'Nombre del taller'}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Teléfono de Despacho</label>
              <input
                type="text"
                value={origenTelefono}
                onChange={(e) => setOrigenTelefono(e.target.value)}
                placeholder={store.whatsapp_numero || '11 2345-6789'}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email de Despacho</label>
              <input
                type="email"
                value={origenEmail}
                onChange={(e) => setOrigenEmail(e.target.value)}
                placeholder={store.admin_email || 'taller@tienda.com'}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingOrigen}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {savingOrigen ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Guardar Dirección de Origen</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECCIÓN 2: Proveedor Zipnova Envíos */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400">
              Z
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Zipnova Envíos
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acceso multicarrier a Correo Argentino, Andreani, OCA y envíos flex.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isZipnovaOk ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Conectado y verificado
              </span>
            ) : settings?.providers.zipnova.configurado ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                <AlertCircle className="w-3.5 h-3.5" />
                Credenciales no válidas
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                No vinculado
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveZipnova} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>API Key</label>
              <input
                type="text"
                value={zipnovaApiKey}
                onChange={(e) => setZipnovaApiKey(e.target.value)}
                placeholder="f609a95d-169e-4e03-aee0-..."
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>API Secret</label>
              <input
                type="password"
                value={zipnovaSecretKey}
                onChange={(e) => setZipnovaSecretKey(e.target.value)}
                placeholder="5a26f172-9b3e-42eb-bc93-..."
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>ID de Cuenta (opcional)</label>
              <input
                type="text"
                value={zipnovaAccountId}
                onChange={(e) => setZipnovaAccountId(e.target.value)}
                placeholder="22112"
                className={inputClass}
              />
            </div>
            <div className="flex items-center h-full pt-4">
              <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={zipnovaActivo}
                  onChange={(e) => setZipnovaActivo(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                />
                <span>Habilitar cotizaciones automáticas con Zipnova</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Lock className="w-3.5 h-3.5" />
              <span>Tus credenciales se cifran con AES-256-GCM y nunca se exponen al cliente.</span>
            </div>

            <button
              type="submit"
              disabled={verifyingZipnova}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {verifyingZipnova ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Guardar y verificar</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECCIÓN 3: Políticas Generales y Parámetros */}
      <form onSubmit={handleSaveSettings} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Políticas de Envío de la Tienda
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Reglas comerciales, recargo sobre tarifa de carrier y alternativas de entrega.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className={labelClass}>Envío gratis a partir de ($)</label>
            <input
              type="number"
              min="0"
              step="100"
              value={envioGratisDesde}
              onChange={(e) => setEnvioGratisDesde(e.target.value)}
              placeholder="Ej: 50000 (vacío = no ofrece)"
              className={inputClass}
            />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              Si el subtotal supera este monto, el costo del envío para el cliente será $0.
            </span>
          </div>

          <div>
            <label className={labelClass}>Margen sobre envío (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={envioMarkup}
              onChange={(e) => setEnvioMarkup(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              Porcentaje extra sumado al costo real del carrier por embalaje o gestión.
            </span>
          </div>

          <div>
            <label className={labelClass}>Tarifa de contingencia ($)</label>
            <input
              type="number"
              min="0"
              step="100"
              value={envioFallback}
              onChange={(e) => setEnvioFallback(e.target.value)}
              placeholder="Ej: 4500 (opcional)"
              className={inputClass}
            />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              Tarifa fija si el carrier no responde o no tiene cobertura para el CP.
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
          <label className="flex items-start gap-3 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={retiroLocalActivo}
              onChange={(e) => setRetiroLocalActivo(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
            />
            <div>
              <span className="font-semibold text-slate-900 dark:text-white block">
                Ofrecer opción de Retiro en Local
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Permite al comprador elegir retirar gratis en tu taller o showroom.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={comisionIncluyeEnvio}
              onChange={(e) => setComisionIncluyeEnvio(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
            />
            <div>
              <span className="font-semibold text-slate-900 dark:text-white block">
                Incluir costo de envío en la comisión de Mercado Pago
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Por defecto deshabilitado (Portalmaker no cobra comisión sobre el envío).
              </span>
            </div>
          </label>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-white/5">
          <button
            type="submit"
            disabled={savingSettings}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {savingSettings ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Guardar Configuración General</span>
          </button>
        </div>
      </form>
    </div>
  )
}
