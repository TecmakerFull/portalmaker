// =============================================================================
// PORTALMAKER — Formulario de Configuración de Contacto, Ubicación y Redes
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
  Camera,
  Share2,
  Video,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle,
  MessageSquare,
  Navigation,
} from 'lucide-react'

interface ContactoFormProps {
  store: Store
  tenantQuery: string
}

export default function ContactoForm({ store, tenantQuery }: ContactoFormProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  // Estados de datos de contacto
  const [whatsapp, setWhatsapp] = useState(store.whatsapp_numero ?? '')
  const [emailContacto, setEmailContacto] = useState(store.email_contacto ?? '')
  const [horarioAtencion, setHorarioAtencion] = useState(store.horario_atencion ?? '')

  // Estados de ubicación
  const [direccion, setDireccion] = useState(store.direccion ?? '')
  const [googleMapsEmbedUrl, setGoogleMapsEmbedUrl] = useState(store.google_maps_embed_url ?? '')

  // Redes sociales
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

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          whatsapp_numero: whatsapp.trim() || null,
          email_contacto: emailContacto.trim() || null,
          horario_atencion: horarioAtencion.trim() || null,
          direccion: direccion.trim() || null,
          google_maps_embed_url: googleMapsEmbedUrl.trim() || null,
          instagram_url: instagramUrl.trim() || null,
          facebook_url: facebookUrl.trim() || null,
          tiktok_url: tiktokUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', store.id)

      if (error) throw error

      setSuccessMsg('¡Datos de contacto y ubicación actualizados correctamente!')
      router.refresh()
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: unknown) {
      console.error('Error al guardar contacto:', err)
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado al guardar los cambios.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 w-full">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-texto)] font-[var(--font-heading)]">
            Contacto & Ubicación
          </h1>
          <p className="text-xs sm:text-sm opacity-70 mt-1">
            Configura los canales de atención, dirección de tu taller y redes para tus clientes.
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
      <div className="bg-[var(--color-superficie)] p-5 sm:p-6 rounded-3xl border border-[var(--color-borde)] space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold opacity-90 border-b border-[var(--color-borde)] pb-3">
          <Phone className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
          <span>Canales de Atención Directa</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* WhatsApp */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 opacity-80">
              Número de WhatsApp (con código de país)
            </label>
            <div className="relative">
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="5491112345678"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
              />
            </div>
            <p className="text-[11px] opacity-60 mt-1">
              Sin guiones ni espacios. Recibirá las consultas y encargos directos del catálogo.
            </p>
          </div>

          {/* Email de Contacto */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 opacity-80">
              Email Público de Contacto
            </label>
            <input
              type="email"
              value={emailContacto}
              onChange={(e) => setEmailContacto(e.target.value)}
              placeholder="contacto@mitaller3d.com.ar"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
            />
            <p className="text-[11px] opacity-60 mt-1">
              Email visible en la ficha de contacto para presupuestos formales.
            </p>
          </div>

          {/* Horario de Atención */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold mb-1.5 opacity-80">
              Horario de Atención y Retiro de Pedidos
            </label>
            <div className="relative">
              <input
                type="text"
                value={horarioAtencion}
                onChange={(e) => setHorarioAtencion(e.target.value)}
                placeholder="Lunes a Viernes de 9:00 a 18:00 hs — Sábados de 10:00 a 13:00 hs"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Ubicación Física del Taller & Mapa */}
      <div className="bg-[var(--color-superficie)] p-5 sm:p-6 rounded-3xl border border-[var(--color-borde)] space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold opacity-90 border-b border-[var(--color-borde)] pb-3">
          <MapPin className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
          <span>Ubicación del Taller / Showroom</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 opacity-80">
              Dirección Física / Localidad / Provincia
            </label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Av. Santa Fe 1234, Palermo, Ciudad Autónoma de Buenos Aires"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
            />
            <p className="text-[11px] opacity-60 mt-1">
              Si trabajas a puertas cerradas, puedes colocar tu zona de referencia (ej: "Villa Urquiza, CABA - Punto de retiro").
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 opacity-80">
              Enlace o Embed de Google Maps (Opcional)
            </label>
            <input
              type="text"
              value={googleMapsEmbedUrl}
              onChange={(e) => setGoogleMapsEmbedUrl(e.target.value)}
              placeholder="https://maps.google.com/?q=..."
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
            />
            <p className="text-[11px] opacity-60 mt-1">
              Pega el enlace de Google Maps o el código de inserción para mostrar el mapa interactivo en tu página de contacto.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Redes Sociales */}
      <div className="bg-[var(--color-superficie)] p-5 sm:p-6 rounded-3xl border border-[var(--color-borde)] space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold opacity-90 border-b border-[var(--color-borde)] pb-3">
          <Globe className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
          <span>Redes Sociales de la Marca</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Instagram */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 opacity-80 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-pink-500" />
              <span>Instagram</span>
            </label>
            <input
              type="text"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/mitaller3d"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
            />
          </div>

          {/* Facebook */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 opacity-80 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Facebook</span>
            </label>
            <input
              type="text"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="https://facebook.com/mitaller3d"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
            />
          </div>

          {/* TikTok */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 opacity-80 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-violet-500" />
              <span>TikTok</span>
            </label>
            <input
              type="text"
              value={tiktokUrl}
              onChange={(e) => setTiktokUrl(e.target.value)}
              placeholder="https://tiktok.com/@mitaller3d"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
            />
          </div>
        </div>
      </div>

      {/* Botón Guardar y Feedback al lado */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4">
        {successMsg && (
          <div className="p-3 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 px-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="min-h-[44px] px-8 py-3 rounded-2xl bg-[#FACC15] text-[#1F2937] text-sm font-bold hover:bg-[#eab308] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 text-[#1F2937]" />
              <span>Guardar Configuración de Contacto</span>
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
  )
}
