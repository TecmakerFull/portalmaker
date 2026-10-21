// =============================================================================
// PORTALMAKER — Panel de Configuración: Contacto, Horarios, Ubicación y Redes
// Cada tarjeta cuenta con su propio botón de guardado y feedback independiente.
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Store } from '@/types/database'
import {
  MapPin,
  Mail,
  Phone,
  Clock,
  Globe,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle,
  Truck,
  Building2,
  ChevronDown,
  ChevronUp,
  Copy,
  Sun,
  Moon,
  Save,
} from 'lucide-react'
import {
  isValidCuit,
  isValidCodigoPostal,
} from '@/lib/shipping-validators'
import {
  parseHorarios,
  generarTextoHorarios,
  getEstadoTienda,
  DIAS_SEMANA,
  type HorariosConfig,
  type DiaSemana,
} from '@/lib/horarios'
import GeorefNormalizer from '@/components/georef-normalizer'

// Provincias argentinas normalizadas según el estándar de carriers
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

// Lista de horas en formato 24hs en intervalos de 30 minutos (00:00 a 23:30)
const OPCIONES_HORAS_24H: string[] = []
for (let h = 0; h < 24; h++) {
  const hh = h.toString().padStart(2, '0')
  OPCIONES_HORAS_24H.push(`${hh}:00`)
  OPCIONES_HORAS_24H.push(`${hh}:30`)
}

// Devuelve las opciones garantizando que si el valor actual no está en múltiplos de 30m, igual esté seleccionable
function getOpcionesHoras(valorActual: string): string[] {
  if (valorActual && !OPCIONES_HORAS_24H.includes(valorActual)) {
    return [...OPCIONES_HORAS_24H, valorActual].sort()
  }
  return OPCIONES_HORAS_24H
}

// Selector compacto en formato 24hs que no depende de la configuración regional del navegador
function TimeSelect24h({
  value,
  onChange,
  disabled = false,
  ariaLabel,
}: {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
  ariaLabel?: string
}) {
  const opciones = getOpcionesHoras(value)
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
      className="h-9 w-[86px] px-2 text-xs font-mono font-medium rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#FACC15] shrink-0 text-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:border-black/30 dark:hover:border-white/30"
    >
      {opciones.map((h) => (
        <option key={h} value={h}>
          {h} hs
        </option>
      ))}
    </select>
  )
}

interface ContactoFormProps {
  store: Store
  tenantQuery: string
}

export default function ContactoForm({ store, tenantQuery }: ContactoFormProps) {
  const router = useRouter()
  const effectiveQuery = tenantQuery || (store?.slug ? `?tenant=${store.slug}` : '')

  // 1. Canales de atención
  const [whatsapp, setWhatsapp] = useState(store.whatsapp_numero ?? '')
  const [emailContacto, setEmailContacto] = useState(store.email_contacto ?? '')
  const [loadingCanales, setLoadingCanales] = useState(false)
  const [feedbackCanales, setFeedbackCanales] = useState<{ type: 'ok' | 'error'; message: string } | null>(null)

  // 2. Horarios de atención estructurados
  const [horariosConfig, setHorariosConfig] = useState<HorariosConfig>(() => parseHorarios(store))
  const [loadingHorarios, setLoadingHorarios] = useState(false)
  const [feedbackHorarios, setFeedbackHorarios] = useState<{ type: 'ok' | 'error'; message: string } | null>(null)

  // 3. Ubicación estructurada del taller y origen logístico
  const [calle, setCalle] = useState(store.origen_calle ?? '')
  const [altura, setAltura] = useState(store.origen_altura ?? '')
  const [pisoDepto, setPisoDepto] = useState(store.origen_piso_depto ?? '')
  const [localidad, setLocalidad] = useState(store.origen_localidad ?? '')
  const [provincia, setProvincia] = useState(store.origen_provincia ?? '')
  const [codigoPostal, setCodigoPostal] = useState(store.origen_codigo_postal ?? '')
  const [googleMapsEmbedUrl, setGoogleMapsEmbedUrl] = useState(store.google_maps_embed_url ?? '')

  // Datos fiscales opcionales
  const [showFiscal, setShowFiscal] = useState(Boolean(store.origen_cuit || store.origen_razon_social))
  const [cuit, setCuit] = useState(store.origen_cuit ?? '')
  const [razonSocial, setRazonSocial] = useState(store.origen_razon_social ?? '')
  const [loadingUbicacion, setLoadingUbicacion] = useState(false)
  const [feedbackUbicacion, setFeedbackUbicacion] = useState<{ type: 'ok' | 'error'; message: string } | null>(null)

  // 4. Redes sociales
  const [instagramUrl, setInstagramUrl] = useState(store.instagram_url ?? '')
  const [facebookUrl, setFacebookUrl] = useState(store.facebook_url ?? '')
  const [tiktokUrl, setTiktokUrl] = useState(store.tiktok_url ?? '')
  const [loadingRedes, setLoadingRedes] = useState(false)
  const [feedbackRedes, setFeedbackRedes] = useState<{ type: 'ok' | 'error'; message: string } | null>(null)

  // --- Handlers para horarios ---
  const toggleDiaActivo = (diaKey: DiaSemana) => {
    setHorariosConfig((prev) => ({
      ...prev,
      dias: {
        ...prev.dias,
        [diaKey]: {
          ...prev.dias[diaKey],
          activo: !prev.dias[diaKey].activo,
        },
      },
    }))
  }

  const toggleDobleTurno = (diaKey: DiaSemana) => {
    setHorariosConfig((prev) => ({
      ...prev,
      dias: {
        ...prev.dias,
        [diaKey]: {
          ...prev.dias[diaKey],
          dobleTurno: !prev.dias[diaKey].dobleTurno,
        },
      },
    }))
  }

  const updateTurno1 = (diaKey: DiaSemana, campo: 'desde' | 'hasta', valor: string) => {
    setHorariosConfig((prev) => ({
      ...prev,
      dias: {
        ...prev.dias,
        [diaKey]: {
          ...prev.dias[diaKey],
          turno1: {
            ...prev.dias[diaKey].turno1,
            [campo]: valor,
          },
        },
      },
    }))
  }

  const updateTurno2 = (diaKey: DiaSemana, campo: 'desde' | 'hasta', valor: string) => {
    setHorariosConfig((prev) => ({
      ...prev,
      dias: {
        ...prev.dias,
        [diaKey]: {
          ...prev.dias[diaKey],
          turno2: {
            ...prev.dias[diaKey].turno2,
            [campo]: valor,
          },
        },
      },
    }))
  }

  const copiarLunesALunVie = () => {
    const lunes = horariosConfig.dias.lunes
    setHorariosConfig((prev) => ({
      ...prev,
      dias: {
        ...prev.dias,
        martes: { ...lunes },
        miercoles: { ...lunes },
        jueves: { ...lunes },
        viernes: { ...lunes },
      },
    }))
  }

  const copiarLunesATodaLaSemana = () => {
    const lunes = horariosConfig.dias.lunes
    setHorariosConfig((prev) => ({
      ...prev,
      dias: {
        lunes: { ...lunes },
        martes: { ...lunes },
        miercoles: { ...lunes },
        jueves: { ...lunes },
        viernes: { ...lunes },
        sabado: { ...lunes },
        domingo: { ...lunes },
      },
    }))
  }

  const estadoEnVivoSimulado = getEstadoTienda(horariosConfig)
  const resumenTexto = generarTextoHorarios(horariosConfig)

  // --- Funciones de Guardado Independientes por Tarjeta ---

  // 1. Guardar Canales de Atención
  const handleSaveCanales = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingCanales(true)
    setFeedbackCanales(null)

    try {
      const res = await fetch(`/api/tienda/admin/contacto${effectiveQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'canales',
          whatsapp,
          emailContacto,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar canales de atención')

      setFeedbackCanales({ type: 'ok', message: '¡Canales de atención guardados correctamente!' })
      router.refresh()
      setTimeout(() => setFeedbackCanales(null), 4000)
    } catch (err: unknown) {
      setFeedbackCanales({ type: 'error', message: (err as Error)?.message || 'Error al guardar.' })
    } finally {
      setLoadingCanales(false)
    }
  }

  // 2. Guardar Horarios de Atención
  const handleSaveHorarios = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingHorarios(true)
    setFeedbackHorarios(null)

    try {
      const res = await fetch(`/api/tienda/admin/contacto${effectiveQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'horarios',
          horariosConfig,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar horarios')

      setFeedbackHorarios({ type: 'ok', message: '¡Horarios de atención guardados correctamente!' })
      router.refresh()
      setTimeout(() => setFeedbackHorarios(null), 4000)
    } catch (err: unknown) {
      setFeedbackHorarios({ type: 'error', message: (err as Error)?.message || 'Error al guardar.' })
    } finally {
      setLoadingHorarios(false)
    }
  }

  // 3. Guardar Ubicación del Taller
  const handleSaveUbicacion = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingUbicacion(true)
    setFeedbackUbicacion(null)

    if (codigoPostal.trim() && !isValidCodigoPostal(codigoPostal)) {
      setLoadingUbicacion(false)
      setFeedbackUbicacion({
        type: 'error',
        message: 'El código postal no es válido. Ingresá 4 dígitos (ej: 2000) o CPA (ej: S2000ABC).',
      })
      return
    }

    if (cuit.trim() && !isValidCuit(cuit)) {
      setLoadingUbicacion(false)
      setFeedbackUbicacion({
        type: 'error',
        message: 'El CUIT no es válido. Revisá los 11 dígitos verificadores.',
      })
      return
    }

    try {
      const res = await fetch(`/api/tienda/admin/contacto${effectiveQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'ubicacion',
          calle,
          altura,
          pisoDepto,
          localidad,
          provincia,
          codigoPostal,
          cuit,
          razonSocial,
          googleMapsEmbedUrl,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar ubicación')

      setFeedbackUbicacion({
        type: 'ok',
        message: '¡Ubicación del taller y origen de envíos guardados correctamente!',
      })
      router.refresh()
      setTimeout(() => setFeedbackUbicacion(null), 4000)
    } catch (err: unknown) {
      setFeedbackUbicacion({ type: 'error', message: (err as Error)?.message || 'Error al guardar.' })
    } finally {
      setLoadingUbicacion(false)
    }
  }

  // 4. Guardar Redes Sociales
  const handleSaveRedes = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingRedes(true)
    setFeedbackRedes(null)

    try {
      const res = await fetch(`/api/tienda/admin/contacto${effectiveQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'redes',
          instagramUrl,
          facebookUrl,
          tiktokUrl,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar redes sociales')

      setFeedbackRedes({ type: 'ok', message: '¡Redes sociales guardadas correctamente!' })
      router.refresh()
      setTimeout(() => setFeedbackRedes(null), 4000)
    } catch (err: unknown) {
      setFeedbackRedes({ type: 'error', message: (err as Error)?.message || 'Error al guardar.' })
    } finally {
      setLoadingRedes(false)
    }
  }

  const inputClass =
    'w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto)] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#FACC15] transition-all'
  const labelClass = 'block text-xs font-semibold mb-1.5 opacity-80'

  return (
    <div className="space-y-8 w-full max-w-4xl pb-12">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-texto)] font-[var(--font-heading)]">
            Contacto, Horarios & Ubicación
          </h1>
          <p className="text-xs sm:text-sm opacity-70 mt-1">
            Configurá de forma independiente los canales de atención, horarios semanales, ubicación del taller y redes sociales.
          </p>
        </div>

        <Link
          href={`/tienda/contacto${effectiveQuery}`}
          target="_blank"
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--color-borde)] text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors self-start"
        >
          <ExternalLink className="w-4 h-4 opacity-70" />
          <span>Ver Página Pública de Contacto</span>
        </Link>
      </div>

      {/* TARJETA 1: Canales de Atención Directa */}
      <form
        onSubmit={handleSaveCanales}
        className="bg-[var(--color-superficie)] p-5 sm:p-6 rounded-3xl border border-[var(--color-borde)] space-y-5 shadow-xs"
      >
        <div className="flex items-center gap-2 text-sm font-bold opacity-90 border-b border-[var(--color-borde)] pb-3">
          <Phone className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
          <span>Canales de Atención Directa</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* WhatsApp */}
          <div>
            <label className={labelClass}>Número de WhatsApp (con código de país)</label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="5491112345678"
              className={inputClass}
            />
            <p className="text-[11px] opacity-60 mt-1">
              Sin espacios ni guiones. Recibirá las consultas y pedidos de tu catálogo.
            </p>
          </div>

          {/* Email de Contacto */}
          <div>
            <label className={labelClass}>Email de Contacto</label>
            <input
              type="email"
              value={emailContacto}
              onChange={(e) => setEmailContacto(e.target.value)}
              placeholder="contacto@mitaller.com.ar"
              className={inputClass}
            />
            <p className="text-[11px] opacity-60 mt-1">
              Email visible en la ficha de contacto para presupuestos y clientes.
            </p>
          </div>
        </div>

        {/* Feedback y Botón Guardar propio */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--color-borde)]">
          {feedbackCanales ? (
            <div
              className={`p-2.5 px-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                feedbackCanales.type === 'ok'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
              }`}
            >
              {feedbackCanales.type === 'ok' ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedbackCanales.message}</span>
            </div>
          ) : (
            <div />
          )}

          <button
            type="submit"
            disabled={loadingCanales}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] text-xs font-semibold hover:bg-[#eab308] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 self-end sm:self-auto shrink-0"
          >
            {loadingCanales ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#1F2937]" />
                <span>Guardar Canales de Atención</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* TARJETA 2: Horarios de Atención del Taller */}
      <form
        onSubmit={handleSaveHorarios}
        className="bg-[var(--color-superficie)] p-5 sm:p-6 rounded-3xl border border-[var(--color-borde)] space-y-5 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-borde)] pb-3">
          <div className="flex items-center gap-2 text-sm font-bold opacity-90">
            <Clock className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
            <span>Horarios de Atención del Taller</span>
          </div>

          {/* Switch de visibilidad en la tienda pública */}
          <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={horariosConfig.mostrar}
              onChange={(e) =>
                setHorariosConfig((prev) => ({ ...prev, mostrar: e.target.checked }))
              }
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
            />
            <span className="text-[var(--color-texto)]">
              Mostrar horarios de atención en la tienda
            </span>
          </label>
        </div>

        <p className="text-xs opacity-70">
          Configurá los días y horarios en que atendés a tus clientes o realizás entregas en el taller. Podés definir hasta dos franjas por día (por ejemplo, turno mañana y turno tarde).
        </p>

        {/* Barra de atajos y vista previa */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold opacity-70">Acciones rápidas:</span>
            <button
              type="button"
              onClick={copiarLunesALunVie}
              className="min-h-[36px] px-3 py-1 text-xs rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <Copy className="w-3 h-3 text-amber-500" />
              <span>Copiar Lunes a Lun-Vie</span>
            </button>
            <button
              type="button"
              onClick={copiarLunesATodaLaSemana}
              className="min-h-[36px] px-3 py-1 text-xs rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <Copy className="w-3 h-3 text-amber-500" />
              <span>Copiar Lunes a toda la semana</span>
            </button>
          </div>

          {/* Badge simulado de estado en vivo */}
          <div className="flex items-center gap-2 text-xs self-start sm:self-auto">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-[11px] ${
                estadoEnVivoSimulado.abierto
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  estadoEnVivoSimulado.abierto ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>{estadoEnVivoSimulado.mensaje}</span>
            </span>
          </div>
        </div>

        {/* Grilla de los 7 días de la semana */}
        <div className="space-y-2.5 pt-1">
          {DIAS_SEMANA.map((dia) => {
            const configDia = horariosConfig.dias[dia.key]
            return (
              <div
                key={dia.key}
                className={`p-3 sm:px-4 sm:py-3 rounded-2xl border transition-all ${
                  configDia.activo
                    ? 'border-[var(--color-borde)] bg-[var(--color-fondo)]'
                    : 'border-dashed border-black/10 dark:border-white/10 opacity-60 bg-transparent'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Selector Activo / Cerrado (Columna fija para que todos los días y badges queden alineados parejos) */}
                  <div className="w-full sm:w-48 shrink-0 flex items-center justify-between sm:justify-start gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={configDia.activo}
                        onChange={() => toggleDiaActivo(dia.key)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-[var(--color-texto)] min-w-[76px]">
                        {dia.label}
                      </span>
                    </label>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full w-14 text-center ${
                        configDia.activo
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-zinc-500/15 text-zinc-500'
                      }`}
                    >
                      {configDia.activo ? 'Abierto' : 'Cerrado'}
                    </span>
                  </div>

                  {/* Franjas Horarias si está abierto */}
                  {configDia.activo ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1 justify-start md:justify-end">
                      {/* Franja 1: Turno Mañana */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-xs opacity-70 text-[11px] font-medium mr-1">Turno 1:</span>
                        <TimeSelect24h
                          value={configDia.turno1.desde}
                          onChange={(val) => updateTurno1(dia.key, 'desde', val)}
                          ariaLabel={`Hora apertura turno 1 ${dia.label}`}
                        />
                        <span className="text-xs opacity-50 px-0.5">a</span>
                        <TimeSelect24h
                          value={configDia.turno1.hasta}
                          onChange={(val) => updateTurno1(dia.key, 'hasta', val)}
                          ariaLabel={`Hora cierre turno 1 ${dia.label}`}
                        />
                      </div>

                      {/* Separador sutil */}
                      <div className="hidden sm:block w-px h-5 bg-[var(--color-borde)] shrink-0" />

                      {/* Franja 2: Turno Tarde (Opcional) */}
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="flex items-center gap-1.5 text-[11px] font-medium opacity-80 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={configDia.dobleTurno}
                            onChange={() => toggleDobleTurno(dia.key)}
                            className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                          />
                          <Moon className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span>Turno tarde:</span>
                        </label>

                        {configDia.dobleTurno ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                            <TimeSelect24h
                              value={configDia.turno2.desde}
                              onChange={(val) => updateTurno2(dia.key, 'desde', val)}
                              ariaLabel={`Hora apertura turno tarde ${dia.label}`}
                            />
                            <span className="text-xs opacity-50 px-0.5">a</span>
                            <TimeSelect24h
                              value={configDia.turno2.hasta}
                              onChange={(val) => updateTurno2(dia.key, 'hasta', val)}
                              ariaLabel={`Hora cierre turno tarde ${dia.label}`}
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] opacity-40 italic py-1 px-1.5">Sin turno tarde</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs opacity-50 italic md:text-right py-1">
                      Cerrado todo el día (sin atención ni retiros).
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Resumen textual generado */}
        <div className="pt-2 text-xs opacity-75 border-t border-[var(--color-borde)]">
          <span className="font-semibold text-[var(--color-texto)]">Resumen público: </span>
          <span>{resumenTexto}</span>
        </div>

        {/* Feedback y Botón Guardar propio */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--color-borde)]">
          {feedbackHorarios ? (
            <div
              className={`p-2.5 px-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                feedbackHorarios.type === 'ok'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
              }`}
            >
              {feedbackHorarios.type === 'ok' ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedbackHorarios.message}</span>
            </div>
          ) : (
            <div />
          )}

          <button
            type="submit"
            disabled={loadingHorarios}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] text-xs font-semibold hover:bg-[#eab308] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 self-end sm:self-auto shrink-0"
          >
            {loadingHorarios ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#1F2937]" />
                <span>Guardar Horarios de Atención</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* TARJETA 3: Ubicación del Taller / Showroom & Origen Logístico */}
      <form
        onSubmit={handleSaveUbicacion}
        className="bg-[var(--color-superficie)] p-5 sm:p-6 rounded-3xl border border-[var(--color-borde)] space-y-5 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-borde)] pb-3">
          <div className="flex items-center gap-2 text-sm font-bold opacity-90">
            <MapPin className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
            <span>Ubicación del Taller / Showroom & Origen de Envíos</span>
          </div>
          <span className="text-[11px] font-medium opacity-60 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-amber-500" />
            <span>Alimenta automáticamente las cotizaciones de logística</span>
          </span>
        </div>

        <p className="text-xs opacity-70">
          Ingresá la dirección física de tu taller o showroom. Se mostrará a tus compradores para retiros presenciales y se utilizará como punto de origen para calcular tarifas de paquetería (Correo Argentino, Andreani, etc.).
        </p>

        {/* Asistente de normalización y prefiltro con Georef AR (IGN) */}
        <div className="pt-0.5">
          <GeorefNormalizer
            calle={calle}
            altura={altura}
            localidad={localidad}
            provincia={provincia}
            label="Normalizar con Georef (IGN)"
            onSelectAddress={(data) => {
              setCalle(data.calle)
              setAltura(data.altura)
              setLocalidad(data.localidad)
              setProvincia(data.provincia)
              if (data.codigoPostal && !codigoPostal) {
                setCodigoPostal(data.codigoPostal)
              }
            }}
          />
        </div>

        {/* Campos estructurados de dirección */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-1">
          <div className="sm:col-span-6">
            <label className={labelClass}>Calle</label>
            <input
              type="text"
              value={calle}
              onChange={(e) => setCalle(e.target.value)}
              placeholder="Ej: Lamadrid"
              className={inputClass}
              maxLength={120}
              required
            />
          </div>

          <div className="sm:col-span-3">
            <label className={labelClass}>Altura / Número</label>
            <input
              type="text"
              value={altura}
              onChange={(e) => setAltura(e.target.value)}
              placeholder="Ej: 650"
              className={inputClass}
              maxLength={10}
              required
            />
          </div>

          <div className="sm:col-span-3">
            <label className={labelClass}>Piso / Depto (Opcional)</label>
            <input
              type="text"
              value={pisoDepto}
              onChange={(e) => setPisoDepto(e.target.value)}
              placeholder="Ej: 2 B"
              className={inputClass}
              maxLength={20}
            />
          </div>

          <div className="sm:col-span-5">
            <label className={labelClass}>Localidad / Ciudad</label>
            <input
              type="text"
              value={localidad}
              onChange={(e) => setLocalidad(e.target.value)}
              placeholder="Ej: Rosario"
              className={inputClass}
              maxLength={80}
              required
            />
          </div>

          <div className="sm:col-span-4">
            <label className={labelClass}>Provincia</label>
            <select
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Seleccionar provincia...</option>
              {PROVINCIAS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className={labelClass}>
              Código Postal <span className="text-amber-500">*</span>
            </label>
            <input
              type="text"
              value={codigoPostal}
              onChange={(e) => setCodigoPostal(e.target.value)}
              placeholder="Ej: 2000"
              className={inputClass}
              maxLength={8}
              required
            />
          </div>
        </div>

        {/* Mapa interactivo opcional */}
        <div className="pt-2">
          <label className={labelClass}>Enlace o Embed de Google Maps (Opcional)</label>
          <input
            type="text"
            value={googleMapsEmbedUrl}
            onChange={(e) => setGoogleMapsEmbedUrl(e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
            className={inputClass}
          />
          <p className="text-[11px] opacity-60 mt-1">
            Pega el enlace o código de inserción para mostrar el mapa interactivo en tu página de contacto.
          </p>
        </div>

        {/* Acordeón de datos fiscales y etiquetado oficial de envíos (opcional) */}
        <div className="pt-3 border-t border-[var(--color-borde)]">
          <button
            type="button"
            onClick={() => setShowFiscal(!showFiscal)}
            className="flex items-center justify-between w-full text-xs font-semibold opacity-80 hover:opacity-100 transition-opacity py-1 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Datos fiscales para despacho y etiquetas de correo (Opcional)</span>
            </div>
            {showFiscal ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showFiscal && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 mt-1 animate-in fade-in duration-200">
              <div>
                <label className={labelClass}>CUIT / CUIL del Remitente</label>
                <input
                  type="text"
                  value={cuit}
                  onChange={(e) => setCuit(e.target.value)}
                  placeholder="20-12345678-9"
                  className={inputClass}
                  maxLength={13}
                />
                <p className="text-[11px] opacity-60 mt-1">
                  Requerido por algunos servicios postales para la imposición de bultos.
                </p>
              </div>

              <div>
                <label className={labelClass}>Razón Social o Nombre del Remitente</label>
                <input
                  type="text"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder="Nombre de tu taller o empresa"
                  className={inputClass}
                  maxLength={120}
                />
                <p className="text-[11px] opacity-60 mt-1">
                  Nombre que figurará en el rótulo de despacho como remitente.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Feedback y Botón Guardar propio */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--color-borde)]">
          {feedbackUbicacion ? (
            <div
              className={`p-2.5 px-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                feedbackUbicacion.type === 'ok'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
              }`}
            >
              {feedbackUbicacion.type === 'ok' ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedbackUbicacion.message}</span>
            </div>
          ) : (
            <div />
          )}

          <button
            type="submit"
            disabled={loadingUbicacion}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] text-xs font-semibold hover:bg-[#eab308] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 self-end sm:self-auto shrink-0"
          >
            {loadingUbicacion ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#1F2937]" />
                <span>Guardar Ubicación del Taller</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* TARJETA 4: Redes Sociales */}
      <form
        onSubmit={handleSaveRedes}
        className="bg-[var(--color-superficie)] p-5 sm:p-6 rounded-3xl border border-[var(--color-borde)] space-y-5 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm font-bold opacity-90 border-b border-[var(--color-borde)] pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
            <span>Redes Sociales de la Marca</span>
          </div>
          <span className="text-[11px] font-normal opacity-60">
            Se mostrarán en el pie de página de tu tienda
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Instagram</label>
            <input
              type="text"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/mitaller"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Facebook</label>
            <input
              type="text"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="https://facebook.com/mitaller"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>TikTok</label>
            <input
              type="text"
              value={tiktokUrl}
              onChange={(e) => setTiktokUrl(e.target.value)}
              placeholder="https://tiktok.com/@mitaller"
              className={inputClass}
            />
          </div>
        </div>

        {/* Feedback y Botón Guardar propio */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--color-borde)]">
          {feedbackRedes ? (
            <div
              className={`p-2.5 px-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                feedbackRedes.type === 'ok'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
              }`}
            >
              {feedbackRedes.type === 'ok' ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedbackRedes.message}</span>
            </div>
          ) : (
            <div />
          )}

          <button
            type="submit"
            disabled={loadingRedes}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] text-xs font-semibold hover:bg-[#eab308] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 self-end sm:self-auto shrink-0"
          >
            {loadingRedes ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#1F2937]" />
                <span>Guardar Redes Sociales</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
