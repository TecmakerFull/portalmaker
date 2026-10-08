// =============================================================================
// PORTALMAKER — Formulario y Vista Pública de Contacto (Client Component)
// =============================================================================

'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Store } from '@/types/database'
import {
  MapPin,
  Mail,
  Phone,
  Clock,
  Send,
  MessageSquare,
  Camera,
  Share2,
  Video,
  ExternalLink,
  CheckCircle2,
  ArrowLeft,
  Navigation,
} from 'lucide-react'
import WhatsAppIcon from '../sections/whatsapp-icon'

interface ContactoClientProps {
  store: Store
  tenantQuery: string
}

export default function ContactoClient({ store, tenantQuery }: ContactoClientProps) {
  // Estados del formulario
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [tipoConsulta, setTipoConsulta] = useState('Presupuesto / Cotización')
  const [mensaje, setMensaje] = useState('')
  const [enviado, setEnviado] = useState(false)

  const cleanPhone = store.whatsapp_numero ? store.whatsapp_numero.replace(/[^0-9]/g, '') : null

  // Enviar consulta por WhatsApp
  const handleSendWhatsapp = (e: React.FormEvent) => {
    e.preventDefault()
    if (!mensaje.trim()) return

    const textoFormateado = `*Consulta desde la tienda web - ${store.nombre}*\n` +
      `*Nombre:* ${nombre.trim() || 'No especificado'}\n` +
      `*Contacto:* ${contacto.trim() || 'No especificado'}\n` +
      `*Motivo:* ${tipoConsulta}\n` +
      `*Mensaje:* ${mensaje.trim()}`

    if (cleanPhone) {
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textoFormateado)}`
      window.open(url, '_blank')
      setEnviado(true)
    } else if (store.email_contacto) {
      const mailtoUrl = `mailto:${store.email_contacto}?subject=${encodeURIComponent(
        `Consulta Web: ${tipoConsulta}`
      )}&body=${encodeURIComponent(textoFormateado)}`
      window.location.href = mailtoUrl
      setEnviado(true)
    }
  }

  // Generar link de Google Maps
  const mapsSearchUrl = store.google_maps_embed_url && !store.google_maps_embed_url.includes('<iframe')
    ? store.google_maps_embed_url
    : store.direccion
    ? `https://maps.google.com/?q=${encodeURIComponent(store.direccion)}`
    : null

  return (
    <div className="space-y-8">
      {/* Botón Volver al Catálogo */}
      <div>
        <Link
          href={`/tienda${tenantQuery}`}
          className="min-h-[44px] inline-flex items-center gap-2 text-sm font-semibold opacity-70 hover:opacity-100 hover:text-[var(--color-primario)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Catálogo</span>
        </Link>
      </div>

      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold font-[var(--font-heading)] text-[var(--color-primario)]">
          Contacto & Taller
        </h1>
        <p className="text-sm sm:text-base opacity-75">
          Escríbenos para consultas de piezas personalizadas, cotizaciones por volumen o retiros en taller.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Columna Izquierda: Formulario de Contacto (7 cols) */}
        <div className="lg:col-span-7 bg-black/[0.02] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-6 border-b border-black/10 dark:border-white/10 pb-4">
            <MessageSquare className="w-5 h-5 text-[var(--color-primario)]" />
            <h2 className="text-lg font-bold font-[var(--font-heading)]">
              Envíanos un Mensaje
            </h2>
          </div>

          {enviado ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">¡Mensaje Preparado!</h3>
              <p className="text-sm opacity-70 max-w-md mx-auto">
                Se ha generado el mensaje con tus datos para contactarnos inmediatamente.
              </p>
              <button
                type="button"
                onClick={() => setEnviado(false)}
                className="min-h-[44px] px-6 py-2.5 rounded-xl border border-black/15 dark:border-white/15 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Enviar otra consulta
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendWhatsapp} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                    Tu Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:border-[var(--color-primario)] focus:ring-2 focus:ring-[var(--color-primario)]/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                    Tu Teléfono / Email *
                  </label>
                  <input
                    type="text"
                    required
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    placeholder="Ej: 11 2345-6789 o email"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:border-[var(--color-primario)] focus:ring-2 focus:ring-[var(--color-primario)]/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                  Tipo de Consulta
                </label>
                <div className="relative">
                  <select
                    value={tipoConsulta}
                    onChange={(e) => setTipoConsulta(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-[var(--color-primario)] focus:ring-2 focus:ring-[var(--color-primario)]/20 transition-all cursor-pointer"
                  >
                    <option value="Presupuesto / Cotización" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1.5">
                      Presupuesto / Cotización de Impresión o Corte
                    </option>
                    <option value="Consulta sobre Producto" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1.5">
                      Consulta sobre un Producto del Catálogo
                    </option>
                    <option value="Pedido Especial / Prototipado" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1.5">
                      Pedido Especial / Modelado 3D / Prototipado
                    </option>
                    <option value="Estado de Pedido / Retiro" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1.5">
                      Estado de Pedido / Coordinación de Retiro
                    </option>
                    <option value="Otra Consulta" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1.5">
                      Otra Consulta
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                  Mensaje o Especificaciones *
                </label>
                <textarea
                  required
                  rows={4}
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Detalla tu consulta, medidas de la pieza, material deseado o cantidad de unidades..."
                  className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:border-[var(--color-primario)] focus:ring-2 focus:ring-[var(--color-primario)]/20 transition-all resize-y min-h-[110px]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[var(--color-primario)] text-white text-sm font-bold hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  {cleanPhone ? (
                    <>
                      <WhatsAppIcon className="w-4 h-4 shrink-0" />
                      <span>Enviar Consulta por WhatsApp</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Mensaje</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Columna Derecha: Información del Taller y Ubicación (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Tarjeta de Información */}
          <div className="bg-black/[0.02] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold font-[var(--font-heading)] border-b border-black/10 dark:border-white/10 pb-4">
              Información de Atención
            </h2>

            <div className="space-y-4">
              {/* WhatsApp */}
              {cleanPhone && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <WhatsAppIcon className="w-5 h-5 shrink-0" />
                  </div>
                  <div>
                    <span className="text-xs opacity-60 font-semibold uppercase tracking-wider block">
                      WhatsApp Directo
                    </span>
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold hover:text-[var(--color-primario)] transition-colors inline-flex items-center gap-1.5"
                    >
                      <span>+{store.whatsapp_numero}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                    </a>
                  </div>
                </div>
              )}

              {/* Email */}
              {store.email_contacto && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--color-primario)]/15 text-[var(--color-primario)] flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs opacity-60 font-semibold uppercase tracking-wider block">
                      Email
                    </span>
                    <a
                      href={`mailto:${store.email_contacto}`}
                      className="text-sm font-bold hover:text-[var(--color-primario)] transition-colors break-all inline-flex items-center gap-1.5"
                    >
                      <span>{store.email_contacto}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                    </a>
                  </div>
                </div>
              )}

              {/* Horario */}
              {store.horario_atencion && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--color-primario)]/15 text-[var(--color-primario)] flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs opacity-60 font-semibold uppercase tracking-wider block">
                      Horarios de Atención
                    </span>
                    <p className="text-sm font-medium opacity-90 leading-relaxed">
                      {store.horario_atencion}
                    </p>
                  </div>
                </div>
              )}

              {/* Dirección / Ubicación */}
              {store.direccion && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--color-primario)]/15 text-[var(--color-primario)] flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs opacity-60 font-semibold uppercase tracking-wider block">
                      Ubicación / Taller
                    </span>
                    <p className="text-sm font-medium opacity-90 leading-relaxed">
                      {store.direccion}
                    </p>
                    {mapsSearchUrl && (
                      <a
                        href={mapsSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[36px] inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primario)] hover:underline mt-1.5"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Abrir en Google Maps</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Redes Sociales */}
            {(store.instagram_url || store.facebook_url || store.tiktok_url) && (
              <div className="pt-4 border-t border-black/10 dark:border-white/10">
                <span className="text-xs opacity-60 font-semibold uppercase tracking-wider block mb-3">
                  Seguinos en Redes
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {store.instagram_url && (
                    <a
                      href={store.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-3.5 py-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-2 transition-colors"
                    >
                      <Camera className="w-4 h-4 text-pink-500" />
                      <span>Instagram</span>
                    </a>
                  )}
                  {store.facebook_url && (
                    <a
                      href={store.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-3.5 py-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-2 transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-blue-500" />
                      <span>Facebook</span>
                    </a>
                  )}
                  {store.tiktok_url && (
                    <a
                      href={store.tiktok_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-3.5 py-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-2 transition-colors"
                    >
                      <Video className="w-4 h-4 text-violet-500" />
                      <span>TikTok</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
