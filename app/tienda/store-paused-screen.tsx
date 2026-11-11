// =============================================================================
// PORTALMAKER — Pantalla pública de tienda pausada (suscripcion_activa = false)
// La ven los visitantes cuando la tienda no está operativa (falta de pago o apagada
// por el equipo). A propósito no menciona facturación: al público solo se le dice que
// la tienda está en ajustes y se le ofrece contacto directo. Sirve para productos,
// servicios o ambos (no asume ningún rubro).
// =============================================================================

import { MessageSquare, Store as StoreIcon } from 'lucide-react'
import ThemeToggle from './theme-toggle'

interface Props {
  store: { nombre: string; whatsapp_numero?: string | null }
}

export default function StorePausedScreen({ store }: Props) {
  const cleanPhone = store.whatsapp_numero ? store.whatsapp_numero.replace(/[^0-9]/g, '') : null
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola ${store.nombre}! Vengo de ver tu tienda online.`)}`
    : null

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] flex flex-col justify-between transition-colors duration-200">
      <header className="border-b border-black/10 dark:border-white/10 p-4 sm:p-6 flex items-center justify-between max-w-6xl w-full mx-auto">
        <h1 className="text-xl sm:text-2xl font-semibold font-[var(--font-heading)] text-[var(--color-primario)]">
          {store.nombre}
        </h1>
        <ThemeToggle />
      </header>

      <main className="max-w-lg mx-auto p-6 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-[var(--color-primario)]/15 text-[var(--color-primario-legible)] flex items-center justify-center mx-auto shadow-xs">
          <StoreIcon className="w-8 h-8" />
        </div>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 mb-3 inline-block">
            Tienda en ajustes
          </span>
          <h2 className="text-2xl sm:text-3xl font-semibold font-[var(--font-heading)] mt-1">¡Volvemos muy pronto!</h2>
          <p className="text-sm opacity-70 mt-2 leading-relaxed">
            Estamos realizando ajustes y por ahora no recibimos pedidos ni reservas online. Si necesitás hacer una
            consulta, podés escribirnos directamente por WhatsApp.
          </p>
        </div>

        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[48px] px-6 py-3 rounded-2xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-sm font-semibold hover:opacity-90 active:scale-95 transition-all inline-flex items-center justify-center gap-2 shadow-sm"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Contactar por WhatsApp</span>
          </a>
        )}
      </main>

      <footer className="border-t border-black/10 dark:border-white/10 py-6 text-center text-xs opacity-50">
        <p>
          © {new Date().getFullYear()} {store.nombre} — Desarrollado sobre Portalmaker
        </p>
      </footer>
    </div>
  )
}
