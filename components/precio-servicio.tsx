// Precio de un servicio para mostrar al cliente. Con oferta activa: el precio
// normal tachado y el de oferta destacado. Sin comportamiento de cliente: sirve
// en páginas de servidor y de cliente.
import { precioVigente, formatPesos } from '@/lib/booking/format'
import type { Service } from '@/types/database'

export default function PrecioServicio({
  servicio,
  className = '',
}: {
  servicio: Pick<Service, 'precio' | 'precio_oferta' | 'oferta_activa' | 'precio_desde'>
  className?: string
}) {
  const { vigente, normal, enOferta } = precioVigente(servicio)
  if (vigente <= 0) return null
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      {enOferta && <span className="text-[0.8em] font-normal opacity-60 line-through">{formatPesos(normal)}</span>}
      <span className="font-semibold">
        {servicio.precio_desde ? 'Desde ' : ''}
        {formatPesos(vigente)}
      </span>
    </span>
  )
}
