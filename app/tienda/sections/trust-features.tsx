// =============================================================================
// PORTALMAKER — Franja de mensajes de confianza (debajo del hero)
//
// Los mensajes los configura cada tienda en Diseño → Mensajes de confianza.
// Antes eran fijos ("Devoluciones sencillas", "Pago 100% seguro"...) y algunas
// tiendas mostraban promesas que no ofrecían.
// =============================================================================

import type { TrustBarItem } from '@/types/database'
import { getTrustIcon } from '@/lib/trust-icons'

// Clases explícitas: Tailwind no detecta clases armadas dinámicamente.
const DESKTOP_COLS: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
}

export default function TrustFeatures({ items }: { items: TrustBarItem[] }) {
  const visibles = items.filter((item) => item.activo && item.titulo?.trim()).slice(0, 4)
  if (visibles.length === 0) return null

  const mobileCols = visibles.length === 1 ? 'grid-cols-1' : 'grid-cols-2'

  return (
    <section className="border-b border-black/10 dark:border-white/10 bg-[var(--color-fondo)]">
      <div className={`wrap grid ${mobileCols} ${DESKTOP_COLS[visibles.length]} gap-4 sm:gap-6 py-6`}>
        {visibles.map((item) => {
          const Icon = getTrustIcon(item.icono)
          return (
            <div className="flex items-center gap-3 md:justify-center" key={item.id}>
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 stroke-[1.4] text-[var(--color-primario)]" />
              <div>
                <h3 className="text-[11px] sm:text-xs font-semibold text-[var(--color-texto)] leading-snug">
                  {item.titulo}
                </h3>
                {item.texto?.trim() && (
                  <p className="mt-0.5 text-[10px] opacity-70 text-[var(--color-texto)]">{item.texto}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
