// =============================================================================
// PORTALMAKER — Botón Flotante de WhatsApp (Zona Inferior Derecha)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import WhatsAppIcon from './sections/whatsapp-icon'

export default function FloatingWhatsApp({
  phone,
  storeName,
}: {
  phone: string | null | undefined
  storeName: string
}) {
  if (!phone) return null

  const cleanPhone = phone.replace(/[^0-9]/g, '')
  if (!cleanPhone) return null

  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Hola ${storeName}! Vengo de ver tu tienda online y me gustaría hacerte una consulta.`
  )}`

  return (
    <aside aria-label="Contacto rápido por WhatsApp">
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Escribir a ${storeName} por WhatsApp`}
        title="Consultar por WhatsApp"
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 min-w-[52px] min-h-[52px] w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer ring-4 ring-black/5 dark:ring-white/10"
      >
        <WhatsAppIcon className="w-8 h-8 sm:w-9 sm:h-9" />
        <span className="sr-only">WhatsApp</span>
      </a>
    </aside>
  )
}
