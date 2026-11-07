// =============================================================================
// PORTALMAKER — Seña de turnos (función pura, sin dependencias de servidor)
// Se usa en el servidor (al crear el turno) y en la página del servicio (para
// mostrar cuánto se paga antes de confirmar).
// =============================================================================

import type { SenaModo } from '@/types/database'

/**
 * Minutos que se reserva el horario mientras el cliente paga la seña.
 * Pasado ese tiempo sin pago, el turno vence y el horario se libera.
 */
export const SENA_MINUTOS_PARA_PAGAR = 20

/**
 * Monto de la seña según la configuración de la tienda.
 * - porcentaje: X% del precio del servicio
 * - monto: monto fijo, nunca mayor al precio (si el precio es 0, se cobra el monto)
 * - total: el precio completo
 * - ninguna: 0
 */
export function calcularSena(precio: number, modo: SenaModo, valor: number): number {
  const p = Math.max(0, Number(precio) || 0)
  const v = Math.max(0, Number(valor) || 0)
  let monto = 0
  switch (modo) {
    case 'porcentaje':
      monto = (p * Math.min(v, 100)) / 100
      break
    case 'monto':
      monto = p > 0 ? Math.min(v, p) : v
      break
    case 'total':
      monto = p
      break
    default:
      monto = 0
  }
  return Math.round(monto * 100) / 100
}
