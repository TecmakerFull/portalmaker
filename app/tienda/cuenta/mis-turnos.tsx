// =============================================================================
// PORTALMAKER — "Mis turnos" en la cuenta del cliente (componente de servidor)
// La política client_read_own_bookings garantiza que cada cliente vea solo
// sus turnos; el filtro por tienda evita mezclar turnos de otras tiendas.
// =============================================================================

import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatFechaTurno } from '@/lib/booking/format'
import type { Booking } from '@/types/database'
import { CalendarCheck, ChevronRight } from 'lucide-react'

const ESTADO: Record<string, string> = {
  pendiente: 'Por confirmar',
  confirmado: 'Confirmado',
  completado: 'Realizado',
  ausente: 'No asististe',
  cancelado: 'Cancelado',
  expirado: 'Vencido',
}

// Fuera del componente porque depende de la hora actual (se renderiza en cada request).
function desdeAyer(): string {
  return new Date(Date.now() - 24 * 3600000).toISOString()
}

export default async function MisTurnos({ storeId, zona, tenantQuery }: { storeId: string; zona: string; tenantQuery: string }) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('store_id', storeId)
    .eq('cliente_user_id', user.id)
    .gte('starts_at', desdeAyer())
    .order('starts_at', { ascending: true })
    .limit(10)

  const turnos = (data as Booking[]) ?? []
  if (turnos.length === 0) return null

  return (
    <section className="mb-8 rounded-2xl border border-black/10 dark:border-white/10 p-5 space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <CalendarCheck className="w-5 h-5 text-[var(--color-primario)]" /> Mis turnos
      </h2>
      <ul className="space-y-2">
        {turnos.map((t) => {
          const esperandoSena = t.estado === 'pendiente' && Boolean(t.pendiente_expira_at)
          return (
            <li key={t.id}>
              <Link
                href={`/tienda/turno/${t.public_token}${tenantQuery}`}
                className="min-h-14 flex items-center justify-between gap-3 p-3 rounded-xl border border-black/10 dark:border-white/10 hover:border-[var(--color-primario)] transition-colors"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold truncate">{t.servicio_nombre}</span>
                  <span className="block text-xs opacity-70 capitalize">{formatFechaTurno(t.starts_at, zona)}</span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0 text-xs opacity-80">
                  {esperandoSena ? 'Falta pagar la seña' : (ESTADO[t.estado] ?? t.estado)}
                  <ChevronRight className="w-4 h-4" />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
