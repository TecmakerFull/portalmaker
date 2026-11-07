// =============================================================================
// PORTALMAKER — Catálogo de servicios en la portada (tiendas con turnos)
// Cada tarjeta lleva a la página del servicio, donde se elige día y horario.
// =============================================================================

import Link from 'next/link'
import { CalendarCheck, Clock, ImageIcon } from 'lucide-react'
import type { Service } from '@/types/database'
import { formatDuracion } from '@/lib/booking/format'

interface ServicesCatalogProps {
  services: Service[]
  tenantQuery: string
  etiqueta?: string
  titulo?: string
  subtitulo?: string
}

export default function ServicesCatalog({ services, tenantQuery, etiqueta, titulo, subtitulo }: ServicesCatalogProps) {
  const withTenant = (path: string) => (tenantQuery ? `${path}${tenantQuery}` : path)

  return (
    <section id="servicios" className="wrap pt-12 sm:pt-16 scroll-mt-24">
      <div>
        {etiqueta && <p className="eyebrow text-muted-foreground opacity-60">{etiqueta}</p>}
        <h2 className="text-2xl sm:text-3xl font-medium font-[var(--font-heading)] mt-1.5 text-[var(--color-texto)]">
          {titulo || 'Reservá tu turno'}
        </h2>
        {subtitulo && <p className="mt-2 text-xs sm:text-sm opacity-70 text-[var(--color-texto)]">{subtitulo}</p>}
      </div>

      {services.length === 0 ? (
        <div className="mt-8 py-16 text-center border border-dashed border-black/15 dark:border-white/15 rounded-2xl text-[var(--color-texto)]">
          <CalendarCheck className="w-8 h-8 mx-auto opacity-40" />
          <p className="mt-3 text-sm opacity-70">Pronto vas a poder reservar tus turnos online.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <Link
              key={s.id}
              href={withTenant(`/tienda/servicios/${s.slug}`)}
              className="group flex flex-col rounded-2xl border border-black/10 dark:border-white/10 bg-[var(--color-fondo)] overflow-hidden hover:border-[var(--color-primario)] transition-colors"
            >
              <div className="aspect-[4/3] bg-black/[0.03] dark:bg-white/[0.04] overflow-hidden">
                {s.imagenes?.[0] ? (
                  <img src={s.imagenes[0]} alt={s.nombre} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 opacity-30" />
                  </div>
                )}
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1 text-[var(--color-texto)]">
                <h3 className="text-sm sm:text-base font-semibold leading-snug">{s.nombre}</h3>
                {s.descripcion && <p className="text-xs opacity-70 line-clamp-2">{s.descripcion}</p>}
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <span className="text-xs opacity-70 inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {formatDuracion(s.duracion_minutos)}
                  </span>
                  {Number(s.precio) > 0 && (
                    <span className="text-sm font-semibold">
                      {s.precio_desde ? 'Desde ' : ''}${Number(s.precio).toLocaleString('es-AR')}
                    </span>
                  )}
                </div>
                <span className="mt-1 min-h-11 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-sm font-semibold inline-flex items-center justify-center gap-2">
                  <CalendarCheck className="w-4 h-4" /> Reservar
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
