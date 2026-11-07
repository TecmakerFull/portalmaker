// =============================================================================
// PORTALMAKER — Página del turno (enlace secreto del email)
// El cliente ve su turno y puede cancelarlo sin iniciar sesión. El token es
// un UUID aleatorio, igual que el seguimiento de pedidos.
// =============================================================================

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getBookingConfig } from '@/lib/booking/setup'
import { formatFechaTurno, formatDuracion, googleCalendarUrl } from '@/lib/booking/format'
import CancelarTurno from './cancelar-turno'
import type { Booking } from '@/types/database'
import { CalendarCheck, CalendarPlus, MessageCircle, MapPin } from 'lucide-react'

const UUID_REGEX = /^[0-9a-f-]{36}$/i

// Página personal: no se indexa.
export const metadata: Metadata = { title: 'Tu turno', robots: { index: false, follow: false } }

const ESTADO_TEXTO: Record<string, string> = {
  pendiente: 'Esperando confirmación de la tienda',
  confirmado: 'Confirmado',
  completado: 'Realizado',
  ausente: 'No asististe',
  cancelado: 'Cancelado',
  expirado: 'Vencido',
}

// ¿Todavía se puede cancelar online? (hasta X horas antes del turno)
function dentroDelPlazo(inicioIso: string, horas: number): boolean {
  return Date.now() <= new Date(inicioIso).getTime() - horas * 3600000
}

export default async function TurnoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!UUID_REGEX.test(token)) notFound()

  const tenant = await getTenantStore()
  if (!tenant) notFound()
  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const supabaseAdmin = createSupabaseAdminClient()
  const { data } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('public_token', token)
    .eq('store_id', store.id)
    .maybeSingle()
  if (!data) notFound()

  const booking = data as Booking
  const { settings } = await getBookingConfig(store)
  const activo = booking.estado === 'pendiente' || booking.estado === 'confirmado'
  const puedeCancelar = activo && dentroDelPlazo(booking.starts_at, settings.cancelacion_hasta_horas)

  const whatsapp = (store.whatsapp_numero || '').replace(/[^0-9]/g, '')
  const waUrl = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola, te escribo por mi turno de ${booking.servicio_nombre} del ${formatFechaTurno(booking.starts_at, settings.zona_horaria)}.`)}`
    : null

  return (
    <main className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <Link href={`/tienda${tenantQuery}`} className="inline-block text-sm font-semibold text-[var(--color-primario)]">
          {store.nombre}
        </Link>

        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-[var(--color-primario)]" />
            <h1 className="text-lg font-semibold">Tu turno</h1>
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold">{booking.servicio_nombre}</p>
            <p className="text-sm capitalize">{formatFechaTurno(booking.starts_at, settings.zona_horaria)}</p>
            <p className="text-xs opacity-70">Duración: {formatDuracion(booking.servicio_duracion)}</p>
            {store.direccion && (
              <p className="text-xs opacity-70 flex items-center gap-1.5 pt-1">
                <MapPin className="w-3.5 h-3.5" /> {store.direccion}
              </p>
            )}
          </div>
          <p className={`text-sm font-semibold ${activo ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-70'}`}>
            {ESTADO_TEXTO[booking.estado] ?? booking.estado}
          </p>

          <div className="grid gap-2">
            {booking.estado === 'confirmado' && (
              <a
                href={googleCalendarUrl({ titulo: `${booking.servicio_nombre} — ${store.nombre}`, inicio: booking.starts_at, fin: booking.ends_at, ubicacion: store.direccion })}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-12 rounded-xl border border-black/15 dark:border-white/15 text-sm font-semibold inline-flex items-center justify-center gap-2"
              >
                <CalendarPlus className="w-4 h-4" /> Agregar a mi calendario
              </a>
            )}
            {waUrl && (
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="min-h-12 rounded-xl bg-[#25D366] text-white text-sm font-semibold inline-flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4" /> Escribirle a la tienda
              </a>
            )}
            {puedeCancelar && <CancelarTurno token={token} tenantQuery={tenantQuery} />}
            {activo && !puedeCancelar && (
              <p className="text-xs opacity-70 text-center">
                Ya no se puede cancelar online (hasta {settings.cancelacion_hasta_horas} h antes). Escribile a la tienda.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
