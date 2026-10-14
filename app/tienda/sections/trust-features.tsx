// =============================================================================
// PORTALMAKER — Barra de Confianza & Beneficios (Estilo TiendaDemo)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import { Truck, RotateCcw, ShieldCheck, Headphones } from 'lucide-react'

export default function TrustFeatures() {
  const features = [
    {
      icon: Truck,
      title: 'Envíos a todo el país',
      text: 'Tu pedido, donde estés',
    },
    {
      icon: RotateCcw,
      title: 'Devoluciones sencillas',
      text: 'Compra sin preocupaciones',
    },
    {
      icon: ShieldCheck,
      title: 'Pago 100% seguro',
      text: 'Tus datos, siempre protegidos',
    },
    {
      icon: Headphones,
      title: 'Atención personalizada',
      text: 'Estamos para ayudarte',
    },
  ]

  return (
    <section className="border-b border-black/10 dark:border-white/10 bg-[var(--color-fondo)]">
      <div className="wrap grid grid-cols-2 gap-4 sm:gap-6 py-6 md:grid-cols-4">
        {features.map(({ icon: Icon, title, text }) => (
          <div
            className="flex items-center gap-3 md:justify-center"
            key={title}
          >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 stroke-[1.4] text-[var(--color-primario)]" />
            <div>
              <h3 className="text-[11px] sm:text-xs font-semibold text-[var(--color-texto)] leading-snug">
                {title}
              </h3>
              <p className="mt-0.5 text-[10px] opacity-70 text-[var(--color-texto)]">
                {text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
