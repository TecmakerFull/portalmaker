// =============================================================================
// PORTALMAKER — Origen de despacho (dirección desde donde salen los envíos)
// Solo se muestra si stores.envios_activo = true (flag maestro de envíos).
// Los carriers exigen CP de origen para cotizar y CUIT/razón social para imponer.
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Store } from '@/types/database'
import { PackageOpen, Loader2, Check, AlertCircle, CircleCheck, CircleAlert } from 'lucide-react'
import {
  isValidCuit,
  formatCuit,
  isValidCodigoPostal,
  normalizeCodigoPostal,
} from '@/lib/shipping-validators'
import GeorefAddressInput from '@/components/georef-address-input'

// Provincias argentinas (nombres tal cual los esperan los carriers, sin abreviar)
const PROVINCIAS = [
  'Ciudad Autónoma de Buenos Aires', 'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut',
  'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis',
  'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
]

const inputClass =
  'w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all shadow-xs'
const labelClass = 'block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5'

export default function OrigenDespachoForm({ store }: { store: Store }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [calle, setCalle] = useState(store.origen_calle ?? '')
  const [altura, setAltura] = useState(store.origen_altura ?? '')
  const [pisoDepto, setPisoDepto] = useState(store.origen_piso_depto ?? '')
  const [localidad, setLocalidad] = useState(store.origen_localidad ?? '')
  const [provincia, setProvincia] = useState(store.origen_provincia ?? '')
  const [codigoPostal, setCodigoPostal] = useState(store.origen_codigo_postal ?? '')
  const [cuit, setCuit] = useState(store.origen_cuit ?? '')
  const [razonSocial, setRazonSocial] = useState(store.origen_razon_social ?? '')
  const [telefono, setTelefono] = useState(store.origen_telefono ?? '')
  const [email, setEmail] = useState(store.origen_email ?? '')

  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Origen "completo" = lo mínimo que necesita un carrier para cotizar e imponer
  const origenCompleto =
    calle.trim() !== '' &&
    altura.trim() !== '' &&
    localidad.trim() !== '' &&
    provincia !== '' &&
    isValidCodigoPostal(codigoPostal)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    // Validaciones en cliente (la RLS ya limita el UPDATE al dueño; esto es solo UX)
    if (!codigoPostal.trim()) {
      setErrorMsg('El código postal de origen es obligatorio para poder cotizar envíos.')
      return
    }
    if (!isValidCodigoPostal(codigoPostal)) {
      setErrorMsg('Código postal inválido. Usá 4 dígitos (ej: 2000) o formato CPA (ej: S2000ABC).')
      return
    }
    if (cuit.trim() && !isValidCuit(cuit)) {
      setErrorMsg('El CUIT no es válido: revisá los 11 dígitos (el último es un dígito verificador).')
      return
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('El email de origen no tiene un formato válido.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('stores')
        .update({
          origen_calle: calle.trim() || null,
          origen_altura: altura.trim() || null,
          origen_piso_depto: pisoDepto.trim() || null,
          origen_localidad: localidad.trim() || null,
          origen_provincia: provincia || null,
          origen_codigo_postal: normalizeCodigoPostal(codigoPostal),
          origen_cuit: cuit.trim() ? formatCuit(cuit) : null,
          origen_razon_social: razonSocial.trim() || null,
          origen_telefono: telefono.trim() || null,
          origen_email: email.trim().toLowerCase() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', store.id)

      if (error) throw error

      setSuccessMsg('Origen de despacho guardado correctamente.')
      router.refresh()
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: unknown) {
      console.error('Error al guardar origen de despacho:', err)
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado al guardar el origen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <PackageOpen className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
            <span>Origen de despacho</span>
          </h2>
          <p className="text-xs opacity-70 mt-0.5">
            Dirección desde donde salen tus paquetes. Se usa para cotizar y generar las etiquetas de envío.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 self-start text-[11px] font-semibold px-2.5 py-1 rounded-full ${
            origenCompleto
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-400/20 text-amber-800 dark:text-amber-300'
          }`}
        >
          {origenCompleto ? <CircleCheck className="w-3.5 h-3.5" /> : <CircleAlert className="w-3.5 h-3.5" />}
          {origenCompleto ? 'Origen completo' : 'Origen incompleto'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
        <div className="sm:col-span-6">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider opacity-75">Calle</label>
            <span className="text-[10px] opacity-60 font-medium">Autocompletado oficial (IGN)</span>
          </div>
          <GeorefAddressInput
            value={calle}
            onChange={setCalle}
            altura={altura}
            localidad={localidad}
            provincia={provincia}
            className={inputClass}
            placeholder="Ej: Av. Pellegrini"
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
        <div className="sm:col-span-3">
          <label className={labelClass}>Altura</label>
          <input className={inputClass} value={altura} onChange={(e) => setAltura(e.target.value)} placeholder="1234" maxLength={10} inputMode="numeric" />
        </div>
        <div className="sm:col-span-3">
          <label className={labelClass}>Piso / Depto</label>
          <input className={inputClass} value={pisoDepto} onChange={(e) => setPisoDepto(e.target.value)} placeholder="Opcional" maxLength={20} />
        </div>

        <div className="sm:col-span-5">
          <label className={labelClass}>Localidad</label>
          <input className={inputClass} value={localidad} onChange={(e) => setLocalidad(e.target.value)} placeholder="Ej: Rosario" maxLength={80} />
        </div>
        <div className="sm:col-span-4">
          <label className={labelClass}>Provincia</label>
          <select className={inputClass} value={provincia} onChange={(e) => setProvincia(e.target.value)}>
            <option value="">Seleccionar…</option>
            {PROVINCIAS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className={labelClass}>Código postal *</label>
          <input
            className={inputClass}
            value={codigoPostal}
            onChange={(e) => setCodigoPostal(e.target.value)}
            placeholder="2000"
            maxLength={8}
            required
          />
        </div>

        <div className="sm:col-span-6">
          <label className={labelClass}>Razón social</label>
          <input className={inputClass} value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} placeholder="Nombre o razón social" maxLength={120} />
        </div>
        <div className="sm:col-span-6">
          <label className={labelClass}>CUIT</label>
          <input className={inputClass} value={cuit} onChange={(e) => setCuit(e.target.value)} placeholder="20-12345678-6" maxLength={13} inputMode="numeric" />
        </div>

        <div className="sm:col-span-6">
          <label className={labelClass}>Teléfono de contacto</label>
          <input className={inputClass} value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="341 555 1234" maxLength={30} inputMode="tel" />
        </div>
        <div className="sm:col-span-6">
          <label className={labelClass}>Email de contacto</label>
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="envios@mitienda.com" maxLength={150} />
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 text-red-700 dark:text-red-300 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="min-h-[44px] px-6 rounded-xl bg-[#CA8A04] hover:bg-[#A16207] text-white text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span>Guardar origen de despacho</span>
        </button>
      </div>
    </form>
  )
}
