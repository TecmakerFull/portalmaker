// =============================================================================
// PORTALMAKER — Botón Flotante de WhatsApp (Zona Inferior Derecha)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState } from 'react'
import Link from 'next/link'
import WhatsAppIcon from './sections/whatsapp-icon'
import { X, MessageSquare, ArrowRight } from 'lucide-react'

export default function FloatingWhatsApp({
  phone,
  storeName,
  tenantQuery = '',
}: {
  phone: string | null | undefined
  storeName: string
  tenantQuery?: string
}) {
  const [showDialog, setShowDialog] = useState(false)

  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : null
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Hola ${storeName}! Vengo de ver tu tienda online y me gustaría hacerte una consulta.`
      )}`
    : null

  const handleClick = (e: React.MouseEvent) => {
    if (waUrl) {
      window.open(waUrl, '_blank', 'noopener,noreferrer')
    } else {
      setShowDialog(!showDialog)
    }
  }

  const withTenant = (path: string) => {
    if (!tenantQuery) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}${tenantQuery.replace('?', '')}`
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Contactar a ${storeName} por WhatsApp`}
        title="WhatsApp"
        className="whatsapp-float cursor-pointer"
      >
        <WhatsAppIcon className="w-7 h-7 sm:w-8 sm:h-8" />
      </button>

      {showDialog && (
        <div className="fixed bottom-24 right-5 sm:right-7 z-50 w-72 rounded-2xl border border-black/10 dark:border-white/10 bg-[var(--color-superficie)] p-5 shadow-2xl text-[var(--color-texto)] animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Hablemos por WhatsApp</h4>
            <button
              type="button"
              onClick={() => setShowDialog(false)}
              aria-label="Cerrar diálogo de WhatsApp"
              className="w-7 h-7 rounded-lg flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-2 text-xs opacity-70 leading-relaxed">
            El canal de WhatsApp directo está en configuración. Puedes escribirnos a través del formulario de contacto.
          </p>
          <Link
            href={withTenant('/tienda/contacto')}
            onClick={() => setShowDialog(false)}
            className="mt-4 w-full h-10 px-3 rounded-xl bg-[var(--color-primario)] text-white text-xs font-semibold flex items-center justify-center gap-2 hover:opacity-95 shadow-xs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Ir a contacto</span>
          </Link>
        </div>
      )}
    </>
  )
}
