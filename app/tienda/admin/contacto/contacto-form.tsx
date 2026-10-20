// =============================================================================
// PORTALMAKER — Formulario Unificado de Contacto, Ubicación del Taller,
// Horarios de Atención Semanales y Redes
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
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
  Sparkles,
} from 'lucide-react'
import { StickySaveBar } from '../components/sticky-save-bar'
import {
  isValidCuit,
  formatCuit,
  isValidCodigoPostal,
  normalizeCodigoPostal,
} from '@/lib/shipping-validators'
import {
  parseHorarios,
  serializeHorarioPayload,
  generarTextoHorarios,
  getEstadoTienda,
  DIAS_SEMANA,
  type HorariosConfig,
  type DiaSemana,
  type DiaHorario,
} from '@/lib/horarios'

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

interface ContactoFormProps {
  store: Store
  tenantQuery: string
}

export default function ContactoForm({ store, tenantQuery }: ContactoFormProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  // 1. Canales de atención
  const [whatsapp, setWhatsapp] = useState(store.whatsapp_numero ?? '')
  const [emailContacto, setEmailContacto] = useState(store.email_contacto ?? '')

  // 2. Horarios de atención estructurados (Lunes a Domingo, hasta 2 turnos por día)
  const [horariosConfig, setHorariosConfig] = useState<HorariosConfig>(() => parseHorarios(store))

  // 3. Ubicación estructurada del taller y origen logístico
  const [calle, setCalle] = useState(store.origen_calle ?? '')
  const [altura, setAltura] = useState(store.origen_altura ?? '')
  const [pisoDepto, setPisoDepto] = useState(store.origen_piso_depto ?? '')
  const [localidad, setLocalidad] = useState(store.origen_localidad ?? '')
  const [provincia, setProvincia] = useState(store.origen_provincia ?? '')
  const [codigoPostal, setCodigoPostal] = useState(store.origen_codigo_postal ?? '')
  const [googleMapsEmbedUrl, setGoogleMapsEmbedUrl] = useState(store.google_maps_embed_url ?? '')

  // Datos fiscales de imposición de paquetes (opcionales)
  const [showFiscal, setShowFiscal] = useState(Boolean(store.origen_cuit || store.origen_razon_social))
  const [cuit, setCuit] = useState(store.origen_cuit ?? '')
  const [razonSocial, setRazonSocial] = useState(store.origen_razon_social ?? '')

  // 4. Redes sociales
  const [instagramUrl, setInstagramUrl] = useState(store.instagram_url ?? '')
  const [facebookUrl, setFacebookUrl] = useState(store.facebook_url ?? '')
  const [tiktokUrl, setTiktokUrl] = useState(store.tiktok_url ?? '')

  // Estados de carga y feedback
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Modificadores de estado de horarios
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

  // Atajos rápidos
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    // Validaciones preventivas de formato de código postal y CUIT si se completan
    if (codigoPostal.trim() && !isValidCodigoPostal(codigoPostal)) {
      setLoading(false)
      setErrorMsg('El código postal no es válido. Ingresá 4 dígitos (ej: 2000) o CPA (ej: S2000ABC).')
      return
    }

    if (cuit.trim() && !isValidCuit(cuit)) {
      setLoading(false)
      setErrorMsg('El CUIT ingresado no es válido. Revisá los 11 dígitos verificadores.')
      return
    }

    try {
      // Construir la dirección amigable para la vista pública a partir de los campos estructurados
      const partesDireccion = [
        [calle.trim(), altura.trim(), pisoDepto.trim()].filter(Boolean).join(' '),
        localidad.trim(),
        provincia.trim(),
      ].filter(Boolean)

      const direccionPublicaGenerada = partesDireccion.length > 0 ? partesDireccion.join(', ') : null

      const { payloadCompleto } = serializeHorarioPayload(horariosConfig)

      const baseUpdate: Record<string, any> = {
        // Canales de contacto
        whatsapp_numero: whatsapp.trim() || null,
        email_contacto: emailContacto.trim() || null,
        horario_atencion: payloadCompleto,

        // Ubicación física y mapa
        direccion: direccionPublicaGenerada || store.direccion || null,
        google_maps_embed_url: googleMapsEmbedUrl.trim() || null,

        // Origen logístico unificado (utilizado por cotizadores de Zipnova y carriers)
        origen_calle: calle.trim() || null,
        origen_altura: altura.trim() || null,
        origen_piso_depto: pisoDepto.trim() || null,
        origen_localidad: localidad.trim() || null,
        origen_provincia: provincia || null,
        origen_codigo_postal: codigoPostal.trim() ? normalizeCodigoPostal(codigoPostal) : null,
        origen_cuit: cuit.trim() ? formatCuit(cuit) : null,
        origen_razon_social: razonSocial.trim() || null,

        // Redes sociales
        instagram_url: instagramUrl.trim() || null,
        facebook_url: facebookUrl.trim() || null,
        tiktok_url: tiktokUrl.trim() || null,
        updated_at: new Date().toISOString(),
      }

      // Guardar intentando incluir las columnas dedicadas mostrar_horarios y horarios_semanales
      try {
        const { error: fullError } = await supabase
          .from('stores')
          .update({
            ...baseUpdate,
            mostrar_horarios: horariosConfig.mostrar,
            horarios_semanales: horariosConfig.dias,
          })
          .eq('id', store.id)

        if (fullError) {
          // Si la columna aún no está en cache de Supabase, guardamos con baseUpdate (que contiene el payload estructurado embebido)
          const { error: fallbackError } = await supabase
            .from('stores')
            .update(baseUpdate)
            .eq('id', store.id)
          if (fallbackError) throw fallbackError
        }
      } catch {
        const { error: fallbackError } = await supabase
          .from('stores')
          .update(baseUpdate)
          .eq('id', store.id)
        if (fallbackError) throw fallbackError
      }

      setSuccessMsg('Datos de contacto, horarios y ubicación guardados correctamente.')
      router.refresh()
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: unknown) {
      console.error('Error al guardar contacto y horarios:', err)
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado al guardar los cambios.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto)] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#FACC15] transition-all'
  const timeInputClass =
    'min-h-[40px] px-2.5 py-1.5 rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto)] text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-[#FACC15]'
  const labelClass = 'block text-xs font-semibold mb-1.5 opacity-80'

  return (
    <form onSubmit={handleSave} className="space-y-6 w-full pb-24">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-texto)] font-[var(--font-heading)]">
            Contacto, Horarios & Ubicación
          </h1>
          <p className="text-xs sm:text-sm opacity-70 mt-1">
            Configurá los canales de atención de tu taller, horarios semanales, redes y dirección física para retiros y cotización de envíos.
          </p>
        </div>

        <Link
          href={`/tienda/contacto${tenantQuery}`}
          target="_blank"
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--color-borde)] text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors self-start"
        >
          <ExternalLink className="w-4 h-4 opacity-70" />
          <span>Ver Página Pública de Contacto</span>
        </Link>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-3">
          <Check className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Canales de Atención Directa */}
      <div className="bg-[var(--color-superficie)] p-5 sm:p-6 rounded-3xl border border-[var(--color-borde)] space-y-4 shadow-xs">
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
      </div>

      {/* 2. Horarios de Atención del Taller (Lunes a Domingo con 2 franjas) */}
      <div className="bg-[var(--color-superficie)] p-5 sm:p-6 rounded-3xl border border-[var(--color-borde)] space-y-5 shadow-xs">
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
          Configurá los días y horarios en que atendés a tus clientes o realizás entregas en el taller. Podés definir dos franjas por día (por ejemplo, mañana y tarde).
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
            {estadoEnVivoSimulado.detalleTurno && (
              <span className="text-[11px] opacity-60 hidden md:inline">
                ({estadoEnVivoSimulado.detalleTurno})
              </span>
            )}
          </div>
        </div>

        {/* Grilla de los 7 días de la semana */}
        <div className="space-y-3 pt-1">
          {DIAS_SEMANA.map((dia) => {
            const configDia = horariosConfig.dias[dia.key]
            return (
              <div
                key={dia.key}
                className={`p-3 sm:p-4 rounded-2xl border transition-all ${
                  configDia.activo
                    ? 'border-[var(--color-borde)] bg-[var(--color-fondo)]'
                    : 'border-dashed border-black/10 dark:border-white/10 opacity-60 bg-transparent'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Selector Activo / Cerrado */}
                  <div className="flex items-center gap-3 min-w-[130px]">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={configDia.activo}
                        onChange={() => toggleDiaActivo(dia.key)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-[var(--color-texto)]">
                        {dia.label}
                      </span>
                    </label>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
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
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1 justify-end">
                      {/* Franja 1: Turno Mañana */}
                      <div className="flex items-center gap-2">
                        <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-xs opacity-70 text-[11px]">Turno 1:</span>
                        <input
                          type="time"
                          value={configDia.turno1.desde}
                          onChange={(e) => updateTurno1(dia.key, 'desde', e.target.value)}
                          className={timeInputClass}
                        />
                        <span className="text-xs opacity-50">a</span>
                        <input
                          type="time"
                          value={configDia.turno1.hasta}
                          onChange={(e) => updateTurno1(dia.key, 'hasta', e.target.value)}
                          className={timeInputClass}
                        />
                      </div>

                      {/* Separador sutil */}
                      <div className="hidden sm:block w-px h-6 bg-[var(--color-borde)]" />

                      {/* Franja 2: Turno Tarde (Opcional) */}
                      <div className="flex items-center gap-2">
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
                            <input
                              type="time"
                              value={configDia.turno2.desde}
                              onChange={(e) => updateTurno2(dia.key, 'desde', e.target.value)}
                              className={timeInputClass}
                            />
                            <span className="text-xs opacity-50">a</span>
                            <input
                              type="time"
                              value={configDia.turno2.hasta}
                              onChange={(e) => updateTurno2(dia.key, 'hasta', e.target.value)}
                              className={timeInputClass}
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] opacity-40 italic">Solo un turno</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs opacity-50 italic">
                      No hay atención al público ni retiros en este día.
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
      </div>

      {/* 3. Ubicación del Taller & Origen de Despacho Logístico (UNIFICADO) */}
      <div className="bg-[var(--color-superficie)] p-5 sm:p-6 rounded-3xl border border-[var(--color-borde)] space-y-4 shadow-xs">
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
            />
          </div>

          <div className="sm:col-span-4">
            <label className={labelClass}>Provincia</label>
            <select
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
              className={inputClass}
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
      </div>

      {/* 4. Redes Sociales */}
      <div className="bg-[var(--color-superficie)] p-5 sm:p-6 rounded-3xl border border-[var(--color-borde)] space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm font-bold opacity-90 border-b border-[var(--color-borde)] pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
            <span>Redes Sociales de la Marca</span>
          </div>
          <span className="text-[11px] font-normal opacity-60">
            Se mostrarán con sus respectivos íconos en el pie de página de tu tienda
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
      </div>

      {/* Botón Guardar y Feedback al lado */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4">
        {successMsg && (
          <div className="p-3 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 px-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="min-h-[44px] px-8 py-3 rounded-2xl bg-[#FACC15] text-[#1F2937] text-sm font-semibold hover:bg-[#eab308] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 text-[#1F2937]" />
              <span>Guardar Configuración Completa</span>
            </>
          )}
        </button>
      </div>

      {/* Barra de Guardado Flotante Estandarizada */}
      <StickySaveBar
        loading={loading}
        saveText="Guardar Configuración Completa"
        savingText="Guardando..."
        successMsg={successMsg}
        errorMsg={errorMsg}
        message="Canales de contacto, horarios, taller y logística"
        hasChanges={true}
      />
    </form>
  )
}
