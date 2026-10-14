// =============================================================================
// PORTALMAKER — Sección: Propuesta de Valor / Manifiesto Maker (Estilo TiendaDemo)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import Link from 'next/link'
import { ArrowRight, PackageCheck, Check } from 'lucide-react'

interface StorySectionProps {
  storeName?: string
  slogan?: string | null
  tenantQuery?: string
}

export default function StorySection({
  storeName = 'nuestra tienda',
  slogan,
  tenantQuery = '',
}: StorySectionProps) {
  const withTenant = (path: string) => {
    if (!tenantQuery) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}${tenantQuery.replace('?', '')}`
  }

  const pillars = [
    {
      icon: PackageCheck,
      title: 'Calidad en cada detalle',
      text: 'Materiales nobles y acabados realizados con precisión de taller.',
    },
    {
      icon: Check,
      title: 'Diseño atemporal',
      text: 'Piezas creadas con dedicación para acompañarte en tu día a día.',
    },
  ]

  return (
    <section className="wrap mt-16 sm:mt-24 grid gap-8 sm:gap-12 border-t border-black/10 dark:border-white/10 py-12 sm:py-16 md:grid-cols-[1fr_1fr] items-center">
      {/* Columna Izquierda: Manifiesto */}
      <div>
        <p className="eyebrow text-[var(--color-primario)]">
          MENOS, PERO MEJOR
        </p>
        <h2 className="text-2xl sm:text-4xl font-medium font-[var(--font-heading)] mt-3 leading-tight text-[var(--color-texto)]">
          Lo esencial nunca<br className="hidden sm:inline" /> pasa de moda.
        </h2>
        <p className="mt-4 max-w-md text-xs sm:text-sm leading-relaxed opacity-75 text-[var(--color-texto)]">
          {slogan
            ? `${slogan}. Creemos en los objetos que perduran, en el diseño que resuelve y en una forma más consciente y honesta de producir.`
            : 'Creemos en los objetos que se quedan. En el diseño que resuelve, en los materiales que duran y en una forma más consciente de elegir.'}
        </p>
        <div className="mt-4">
          <Link
            href={withTenant('/tienda/sobre-nosotros')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--color-primario)] hover:underline cursor-pointer"
          >
            <span>Conoce nuestra historia</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Columna Derecha: Pilares */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
        {pillars.map(({ icon: Icon, title, text }) => (
          <div key={title} className="p-4 sm:p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
            <Icon className="mb-3 w-6 h-6 text-[var(--color-primario)] stroke-[1.4]" />
            <h3 className="text-xs sm:text-sm font-semibold text-[var(--color-texto)]">
              {title}
            </h3>
            <p className="mt-1.5 text-[11px] sm:text-xs leading-relaxed opacity-70 text-[var(--color-texto)]">
              {text}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
