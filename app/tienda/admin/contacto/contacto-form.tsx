// =============================================================================
// PORTALMAKER — Formulario Unificado de Contacto, Ubicación del Taller y Redes
// Integra la dirección física del taller con el origen logístico de envíos.
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
} from 'lucide-react'
import { StickySaveBar } from '../components/sticky-save-bar'
import {
  isValidCuit,
  formatCuit,
  isValidCodigoPostal,
  normalizeCodigoPostal,
} from '@/lib/shipping-validators'

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
  const [horarioAtencion, setHorarioAtencion] = useState(store.horario_atencion ?? '')

  // 2. Ubicación estructurada del taller y origen logístico
  // Si no hay calle pero hay una dirección libre previa, se precargan los campos
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

  // 3. Redes sociales
  const [instagramUrl, setInstagramUrl] = useState(store.instagram_url ?? '')
  const [facebookUrl, setFacebookUrl] = useState(store.facebook_url ?? '')
  const [tiktokUrl, setTiktokUrl] = useState(store.tiktok_url ?? '')

  // Estados de carga y feedback
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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

      const { error } = await supabase
        .from('stores')
        .update({
          // Canales de contacto
          whatsapp_numero: whatsapp.trim() || null,
          email_contacto: emailContacto.trim() || null,
          horario_atencion: horarioAtencion.trim() || null,

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
        })
        .eq('id', store.id)

      if (error) throw error

      setSuccessMsg('Datos de contacto, taller y logística guardados correctamente.')
      router.refresh()
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: unknown) {
      console.error('Error al guardar contacto y ubicación:', err)
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado al guardar los cambios.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto)] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#FACC15] transition-all'
  const labelClass = 'block text-xs font-semibold mb-1.5 opacity-80'

  return (
    <form onSubmit={handleSave} className="space-y-6 w-full pb-24">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-texto)] font-[var(--font-heading)]">
            Contacto & Ubicación
          </h1>
          <p className="text-xs sm:text-sm opacity-70 mt-1">
            Configurá los canales de atención de tu taller, redes y dirección física para retiros y cotización de envíos.
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

          {/* Horario de Atención */}
          <div className="md:col-span-2">
            <label className={labelClass}>Horario de Atención y Retiro de Pedidos</label>
            <input
              type="text"
              value={horarioAtencion}
              onChange={(e) => setHorarioAtencion(e.target.value)}
              placeholder="Lunes a Viernes de 9:00 a 18:00 hs — Sábados de 10:00 a 13:00 hs"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* 2. Ubicación del Taller & Origen de Despacho Logístico (UNIFICADO) */}
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

      {/* 3. Redes Sociales */}
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
              <span>Guardar Configuración de Contacto & Ubicación</span>
            </>
          )}
        </button>
      </div>

      {/* Barra de Guardado Flotante Estandarizada */}
      <StickySaveBar
        loading={loading}
        saveText="Guardar Configuración de Contacto & Ubicación"
        savingText="Guardando..."
        successMsg={successMsg}
        errorMsg={errorMsg}
        message="Canales de contacto, taller y logística"
        hasChanges={true}
      />
    </form>
  )
}
