// =============================================================================
// PORTALMAKER — Formulario y Vista Pública de Contacto (Estilo TiendaDemo)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Store } from '@/types/database'
import {
  MessageCircle,
  Package,
  Mail,
  Check,
  ArrowRight,
  Clock,
  MapPin,
  ExternalLink,
} from 'lucide-react'

interface ContactoClientProps {
  store: Store
  tenantQuery: string
}

export default function ContactoClient({ store, tenantQuery }: ContactoClientProps) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [motivo, setMotivo] = useState('Información de un producto')
  const [mensaje, setMensaje] = useState('')
  const [privacidad, setPrivacidad] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const cleanPhone = store.whatsapp_numero ? store.whatsapp_numero.replace(/[^0-9]/g, '') : null

  const withTenant = (path: string) => {
    if (!tenantQuery) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}${tenantQuery.replace('?', '')}`
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!mensaje.trim()) return

    const textoFormateado =
      `*Consulta desde la tienda web - ${store.nombre}*\n` +
      `*Nombre:* ${nombre.trim() || 'No especificado'}\n` +
      `*Correo:* ${email.trim() || 'No especificado'}\n` +
      `*Motivo:* ${motivo}\n` +
      `*Mensaje:* ${mensaje.trim()}`

    if (cleanPhone) {
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textoFormateado)}`
      window.open(url, '_blank')
    } else if (store.email_contacto) {
      const mailtoUrl = `mailto:${store.email_contacto}?subject=${encodeURIComponent(
        `Consulta Web: ${motivo}`
      )}&body=${encodeURIComponent(textoFormateado)}`
      window.location.href = mailtoUrl
    }

    setEnviado(true)
  }

  // Google Maps URL
  const mapsSearchUrl =
    store.google_maps_embed_url && !store.google_maps_embed_url.includes('<iframe')
      ? store.google_maps_embed_url
      : store.direccion
      ? `https://maps.google.com/?q=${encodeURIComponent(store.direccion)}`
      : null

  return (
    <div className="space-y-10">
      {/* Encabezado */}
      <div>
        <p className="eyebrow text-[var(--color-primario)]">ESTAMOS CERCA</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium font-[var(--font-heading)] mt-3 text-[var(--color-texto)]">
          Hablemos.
        </h1>
        <p className="mt-3 text-xs sm:text-sm opacity-70 text-[var(--color-texto)] max-w-lg">
          Una pregunta, una idea o un poco de ayuda para tu proyecto. Te escuchamos.
        </p>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] items-start">
        {/* Columna Izquierda: Información de Contacto */}
        <div className="space-y-8">
          <div>
            <MessageCircle className="mb-3 w-6 h-6 text-[var(--color-primario)]" />
            <h2 className="text-base sm:text-lg font-semibold text-[var(--color-texto)]">
              Atención personalizada
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed opacity-75 text-[var(--color-texto)]">
              {cleanPhone
                ? `Escríbenos directamente por WhatsApp al +${cleanPhone} o utiliza el formulario.`
                : 'El correo, WhatsApp y los canales de atención están disponibles a través de este formulario.'}
            </p>

            {store.email_contacto && (
              <p className="mt-2 text-xs opacity-75 font-medium">
                Email: {store.email_contacto}
              </p>
            )}

            {store.horario_atencion && (
              <p className="mt-1 text-xs opacity-75 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 opacity-60" />
                <span>Horario: {store.horario_atencion}</span>
              </p>
            )}
          </div>

          <div>
            <Package className="mb-3 w-6 h-6 text-[var(--color-primario)]" />
            <h2 className="text-base sm:text-lg font-semibold text-[var(--color-texto)]">
              ¿Una duda sobre tu pedido?
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed opacity-75 text-[var(--color-texto)]">
              Consulta información de envíos, devoluciones y tiempos de producción.
            </p>
            <div className="mt-3">
              <Link
                href={withTenant('/tienda/ayuda')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primario)] hover:underline"
              >
                <span>Consulta nuestras preguntas frecuentes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Dirección física / Taller si existe */}
          {store.direccion && (
            <div>
              <MapPin className="mb-3 w-6 h-6 text-[var(--color-primario)]" />
              <h2 className="text-base sm:text-lg font-semibold text-[var(--color-texto)]">
                Ubicación del Taller
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm leading-relaxed opacity-75 text-[var(--color-texto)]">
                {store.direccion}
              </p>
              {mapsSearchUrl && (
                <a
                  href={mapsSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primario)] hover:underline"
                >
                  <span>Abrir en Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Columna Derecha: Formulario de Contacto */}
        <div>
          {enviado ? (
            <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold font-[var(--font-heading)]">
                Tu mensaje ha sido enviado
              </h2>
              <p className="text-xs sm:text-sm opacity-70 max-w-sm mx-auto leading-relaxed">
                Gracias por comunicarte con {store.nombre}. Nos pondremos en contacto contigo a la brevedad.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEnviado(false)
                  setMensaje('')
                }}
                className="mt-4 min-h-[40px] px-4 py-2 rounded-xl border border-black/15 dark:border-white/15 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                Escribir otro mensaje
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4 sm:gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="block text-xs font-medium mb-1.5 opacity-80">
                    Tu nombre
                  </span>
                  <input
                    required
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="w-full h-11 px-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-superficie)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] focus:ring-1 focus:ring-[var(--color-primario)] text-[var(--color-texto)]"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-medium mb-1.5 opacity-80">
                    Correo electrónico
                  </span>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@ejemplo.com"
                    className="w-full h-11 px-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-superficie)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] focus:ring-1 focus:ring-[var(--color-primario)] text-[var(--color-texto)]"
                  />
                </label>
              </div>

              <label className="block">
                <span className="block text-xs font-medium mb-1.5 opacity-80">
                  ¿En qué podemos ayudarte?
                </span>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-superficie)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] focus:ring-1 focus:ring-[var(--color-primario)] text-[var(--color-texto)]"
                >
                  <option value="Información de un producto">Información de un producto</option>
                  <option value="Presupuesto / Cotización especial">Presupuesto / Cotización especial</option>
                  <option value="Estado de mi pedido">Estado de mi pedido</option>
                  <option value="Envíos y devoluciones">Envíos y devoluciones</option>
                  <option value="Otro motivo">Otro motivo</option>
                </select>
              </label>

              <label className="block">
                <span className="block text-xs font-medium mb-1.5 opacity-80">
                  Tu mensaje
                </span>
                <textarea
                  required
                  rows={5}
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Escribe tu consulta o los detalles de la pieza que deseas fabricar..."
                  className="w-full p-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-superficie)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] focus:ring-1 focus:ring-[var(--color-primario)] text-[var(--color-texto)] resize-none"
                />
              </label>

              <label className="flex items-center gap-2.5 text-xs opacity-75 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={privacidad}
                  onChange={(e) => setPrivacidad(e.target.checked)}
                  className="accent-[var(--color-primario)] rounded w-4 h-4 cursor-pointer"
                />
                <span>Acepto la política de privacidad y condiciones de contacto.</span>
              </label>

              <button
                type="submit"
                className="h-12 w-full rounded-xl bg-[var(--color-primario)] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-98 transition-all cursor-pointer"
              >
                <span>Enviar mensaje</span>
                <Mail className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
