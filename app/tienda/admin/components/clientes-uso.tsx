// =============================================================================
// PORTALMAKER — Uso del cupo de clientes del plan
//
// Para reservar hay que ser cliente registrado, y cada plan tiene un tope. Este
// aviso muestra cuántos lleva la tienda y avisa antes de llegar al límite, para
// que la dueña se entere acá y no cuando una clienta le escribe por WhatsApp.
// Sin hooks: sirve en páginas de servidor y de cliente.
// =============================================================================

import Link from 'next/link'
import { Users, AlertTriangle, ArrowRight } from 'lucide-react'

// Los planes sin tope usan un número enorme: no hay nada que mostrar
const SIN_LIMITE = 9999

export const UMBRAL_AVISO_CLIENTES = 0.8

export function clientesCerca(usados: number, limite: number): boolean {
  return limite < SIN_LIMITE && usados >= Math.floor(limite * UMBRAL_AVISO_CLIENTES)
}

export default function ClientesUso({
  usados,
  limite,
  tenantQuery,
  /** 'completo' muestra la barra siempre; 'aviso' solo aparece cuando falta poco. */
  modo = 'completo',
  /** En la página de clientes no hace falta el enlace para ir a ella. */
  mostrarEnlaceClientes = false,
}: {
  usados: number
  limite: number
  tenantQuery: string
  modo?: 'completo' | 'aviso'
  mostrarEnlaceClientes?: boolean
}) {
  if (limite >= SIN_LIMITE) return null
  const lleno = usados >= limite
  const cerca = clientesCerca(usados, limite)
  if (modo === 'aviso' && !cerca) return null

  const porcentaje = Math.min(100, Math.round((usados / limite) * 100))
  const color = lleno ? 'bg-red-500' : cerca ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 space-y-3 ${
        lleno ? 'border-red-500/30 bg-red-500/5' : cerca ? 'border-amber-500/30 bg-amber-500/5' : 'border-[var(--color-borde)] bg-[var(--color-superficie)]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold flex items-center gap-2">
          {cerca ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Users className="w-4 h-4 shrink-0 opacity-60" />}
          Clientes registrados: {usados} de {limite}
        </p>
        <span className="text-xs opacity-70 shrink-0">{porcentaje}%</span>
      </div>

      <div className="w-full h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={usados} aria-valuemin={0} aria-valuemax={limite}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${porcentaje}%` }} />
      </div>

      {cerca && (
        <p className="text-xs leading-relaxed opacity-80">
          {lleno
            ? 'Llegaste al límite de tu plan: las personas nuevas ya no pueden reservar online (las que ya son clientes sí). Podés borrar clientes que no uses o pasar a un plan con más lugar.'
            : 'Te estás acercando al límite de tu plan. Cuando se complete, las personas nuevas no van a poder reservar online.'}
        </p>
      )}

      {(cerca || mostrarEnlaceClientes) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {!mostrarEnlaceClientes && (
            <Link
              href={`/tienda/admin/clientes${tenantQuery}`}
              className="min-h-11 px-4 rounded-xl border border-[var(--color-borde)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <Users className="w-3.5 h-3.5" /> Ver mis clientes
            </Link>
          )}
          {cerca && (
            <Link
              href={`/tienda/admin/suscripcion${tenantQuery}`}
              className="min-h-11 px-4 rounded-xl bg-[#FACC15] text-[#1F2937] text-xs font-semibold inline-flex items-center justify-center gap-1.5"
            >
              Ver planes <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
