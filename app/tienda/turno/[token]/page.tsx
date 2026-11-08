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
import { formatFechaTurno, formatDuracion, googleCalendarUrl, renglonesImporte } from '@/lib/booking/format'
import CancelarTurno from './cancelar-turno'
import PagarSena from './pagar-sena'
import type { Booking } from '@/types/database'
import { CalendarCheck, CalendarPlus, MessageCircle, MapPin, ArrowLeft, Store as StoreIcon } from 'lucide-react'

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

export default async function TurnoPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams?: Promise<{ pago?: string }>
}) {
  const { token } = await params
  const pagoParam = (searchParams ? await searchParams : {}).pago
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

  // Seña pendiente: el turno está retenido esperando el pago en Mercado Pago.
  const esperandoSena = booking.estado === 'pendiente' && Boolean(booking.pendiente_expira_at) && Boolean(booking.order_id)
  let ordenSena: { id: string; public_token: string; total: number } | null = null
  // Seña ya acreditada: se muestra el importe abonado y el saldo a pagar en el local
  let senaPagada = 0
  if (booking.order_id) {
    const { data: orden } = await supabaseAdmin
      .from('orders')
      .select('id, public_token, total, estado_pago')
      .eq('id', booking.order_id)
      .maybeSingle()
    if (orden && esperandoSena) {
      ordenSena = { id: orden.id, public_token: orden.public_token, total: Number(orden.total) }
    }
    if (orden && orden.estado_pago === 'aprobado') senaPagada = Number(orden.total) || 0
  }
  // Motivo que escribió la tienda al rechazar o cancelar (si lo hubo)
  let motivoTienda: string | null = null
  if (booking.estado === 'cancelado' && booking.cancelado_por === 'tienda') {
    const { data: evento } = await supabaseAdmin
      .from('booking_events')
      .select('detalle')
      .eq('booking_id', booking.id)
      .eq('tipo', 'cancelado')
      .eq('actor', 'tienda')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    motivoTienda = evento?.detalle ?? null
  }
  const importes = renglonesImporte(booking.precio, senaPagada)
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
            {importes.map((renglon) => (
              <p key={renglon} className="text-xs opacity-70">{renglon}</p>
            ))}
            {store.direccion && (
              <p className="text-xs opacity-70 flex items-center gap-1.5 pt-1">
                <MapPin className="w-3.5 h-3.5" /> {store.direccion}
              </p>
            )}
          </div>
          <p className={`text-sm font-semibold ${activo && !esperandoSena ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-70'}`}>
            {esperandoSena ? 'Esperando el pago de la seña' : (ESTADO_TEXTO[booking.estado] ?? booking.estado)}
          </p>

          {motivoTienda && (
            <p className="text-xs p-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.06]">
              <span className="font-semibold">Motivo: </span>
              {motivoTienda}
            </p>
          )}

          {/* Vuelta desde Mercado Pago: el webhook puede tardar unos segundos en confirmar */}
          {pagoParam === 'aprobado' && esperandoSena && (
            <p className="text-xs p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              Recibimos tu pago. Estamos confirmando el turno: actualizá esta página en unos segundos. Te llega también un email.
            </p>
          )}
          {pagoParam === 'rechazado' && esperandoSena && (
            <p className="text-xs p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              El pago no se completó. Podés intentarlo de nuevo antes de que se libere el horario.
            </p>
          )}

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
            {esperandoSena && ordenSena && pagoParam !== 'aprobado' && (
              <PagarSena orderId={ordenSena.id} publicToken={ordenSena.public_token} storeId={store.id} monto={ordenSena.total} tenantQuery={tenantQuery} />
            )}
            {puedeCancelar && <CancelarTurno token={token} tenantQuery={tenantQuery} />}
            {activo && !puedeCancelar && (
              <p className="text-xs opacity-70 text-center">
                Ya no se puede cancelar online (hasta {settings.cancelacion_hasta_horas} h antes). Escribile a la tienda.
              </p>
            )}
          </div>
        </div>

        {/* Salidas: esta página se abre desde "Mis turnos" o desde el email, y no tiene
            el menú de la tienda, así que sin esto la persona quedaba sin cómo volver. */}
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href={`/tienda/cuenta${tenantQuery}`}
            className="min-h-12 rounded-xl border border-black/15 dark:border-white/15 text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a mis turnos
          </Link>
          <Link
            href={`/tienda${tenantQuery}`}
            className="min-h-12 rounded-xl border border-black/15 dark:border-white/15 text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <StoreIcon className="w-4 h-4" /> Ir a la tienda
          </Link>
        </div>
      </div>
    </main>
  )
}
