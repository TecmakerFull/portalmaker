// =============================================================================
// PORTALMAKER — Sección "Por qué elegirnos" de la portada
//
// Antes era un manifiesto fijo ("Menos, pero mejor / Lo esencial nunca pasa de
// moda") que no encajaba con muchos rubros. Ahora los textos y los puntos
// destacados se editan en Diseño → Por qué elegirnos, y la sección se puede ocultar.
// =============================================================================

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { StoreSection, StorySettings, StoryPillar } from '@/types/database'
import { getTrustIcon } from '@/lib/trust-icons'

interface StorySectionProps {
  section: StoreSection<StorySettings, StoryPillar[]>
  tenantQuery?: string
}

export default function StorySection({ section, tenantQuery = '' }: StorySectionProps) {
  const withTenant = (path: string) => {
    if (!tenantQuery) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}${tenantQuery.replace('?', '')}`
  }

  const { etiqueta, titulo, texto, mostrar_link_historia } = section.settings
  const pillars = (section.content || []).filter((p) => p.titulo?.trim()).slice(0, 4)

  // Si el dueño vació todo, no se dibuja un bloque en blanco.
  if (!titulo?.trim() && !texto?.trim() && pillars.length === 0) return null

  return (
    <section
      className={`wrap mt-16 sm:mt-24 grid gap-8 sm:gap-12 border-t border-black/10 dark:border-white/10 py-12 sm:py-16 items-center ${
        pillars.length > 0 ? 'md:grid-cols-[1fr_1fr]' : ''
      }`}
    >
      <div>
        {etiqueta?.trim() && <p className="eyebrow text-[var(--color-primario)]">{etiqueta}</p>}
        {titulo?.trim() && (
          <h2 className="text-2xl sm:text-4xl font-medium font-[var(--font-heading)] mt-3 leading-tight text-[var(--color-texto)]">
            {titulo}
          </h2>
        )}
        {texto?.trim() && (
          <p className="mt-4 max-w-md text-xs sm:text-sm leading-relaxed opacity-75 text-[var(--color-texto)] whitespace-pre-line">
            {texto}
          </p>
        )}
        {mostrar_link_historia && (
          <div className="mt-4">
            <Link
              href={withTenant('/tienda/sobre-nosotros')}
              className="inline-flex items-center gap-1.5 min-h-11 text-xs sm:text-sm font-semibold text-[var(--color-primario)] hover:underline cursor-pointer"
            >
              <span>Conocé nuestra historia</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {pillars.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          {pillars.map((pilar) => {
            const Icon = getTrustIcon(pilar.icono)
            return (
              <div
                key={pilar.id}
                className="p-4 sm:p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5"
              >
                <Icon className="mb-3 w-6 h-6 text-[var(--color-primario)] stroke-[1.4]" />
                <h3 className="text-xs sm:text-sm font-semibold text-[var(--color-texto)]">{pilar.titulo}</h3>
                {pilar.texto?.trim() && (
                  <p className="mt-1.5 text-[11px] sm:text-xs leading-relaxed opacity-70 text-[var(--color-texto)]">
                    {pilar.texto}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
