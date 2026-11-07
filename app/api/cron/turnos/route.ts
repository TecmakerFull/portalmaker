// =============================================================================
// PORTALMAKER — GET /api/cron/turnos (tarea programada cada 10 minutos)
// La dispara Supabase pg_cron (supabase/migrations/20261107_turnos_cron.sql)
// con Authorization: Bearer CRON_SECRET.
//
//   1. Vence las señas sin pagar: libera el horario y avisa a la lista de espera.
//   2. Manda los recordatorios por email X horas antes de cada turno.
//
// Idempotente: puede correr dos veces seguidas sin duplicar nada (las
// actualizaciones son condicionales y cada envío se marca antes de hacerse).
// =============================================================================

import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getStorePublicOrigin } from '@/lib/booking/links'
import { notificarListaEspera } from '@/lib/booking/waitlist'
import { sendBookingReminderEmail } from '@/lib/booking/emails'
import type { Booking, Store, StoreBookingSettings } from '@/types/database'

export const maxDuration = 60

const TZ_DEFAULT = 'America/Argentina/Buenos_Aires'
const LOTE = 200

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 })
  }

  const supabaseAdmin = createSupabaseAdminClient()
  const ahora = new Date()
  const ahoraIso = ahora.toISOString()
  const resultado = { senasVencidas: 0, avisadosEspera: 0, recordatorios: 0, errores: 0 }

  // Tiendas y reglas involucradas, cargadas una sola vez por corrida.
  const tiendas = new Map<string, Store>()
  const reglas = new Map<string, StoreBookingSettings | null>()
  const cargarTiendas = async (ids: string[]) => {
    const faltantes = Array.from(new Set(ids)).filter((id) => !tiendas.has(id))
    if (faltantes.length === 0) return
    const [{ data: stores }, { data: settings }] = await Promise.all([
      supabaseAdmin.from('stores').select('*').in('id', faltantes),
      supabaseAdmin.from('store_booking_settings').select('*').in('store_id', faltantes),
    ])
    for (const s of stores ?? []) tiendas.set(s.id, s as Store)
    for (const id of faltantes) reglas.set(id, ((settings ?? []).find((x) => x.store_id === id) as StoreBookingSettings) ?? null)
  }

  // ------------------------------------------------- 1. Señas sin pagar vencidas
  const { data: vencidas } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('estado', 'pendiente')
    .not('pendiente_expira_at', 'is', null)
    .lt('pendiente_expira_at', ahoraIso)
    .limit(LOTE)

  await cargarTiendas((vencidas ?? []).map((b) => b.store_id))

  for (const b of (vencidas ?? []) as Booking[]) {
    try {
      const { data: actualizado } = await supabaseAdmin
        .from('bookings')
        .update({ estado: 'expirado', updated_at: ahoraIso })
        .eq('id', b.id)
        .eq('estado', 'pendiente')
        .select('*')
        .maybeSingle()
      if (!actualizado) continue
      resultado.senasVencidas++

      await supabaseAdmin.from('booking_events').insert({
        booking_id: b.id,
        store_id: b.store_id,
        tipo: 'expirado',
        detalle: 'No se pagó la seña a tiempo',
        actor: 'sistema',
      })

      const store = tiendas.get(b.store_id)
      if (store) {
        resultado.avisadosEspera += await notificarListaEspera({
          store,
          booking: actualizado as Booking,
          zona: reglas.get(b.store_id)?.zona_horaria || TZ_DEFAULT,
          origin: getStorePublicOrigin(store),
          tenantQs: '',
        })
      }
    } catch (err) {
      resultado.errores++
      console.error(`cron/turnos: error venciendo seña del turno ${b.id}:`, err)
    }
  }

  // ------------------------------------------------- 2. Recordatorios por email
  // Turnos confirmados de los próximos 7 días (el máximo configurable) sin recordatorio.
  const limite = new Date(ahora.getTime() + 7 * 24 * 3600000).toISOString()
  const { data: proximos } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('estado', 'confirmado')
    .is('recordatorio_enviado_at', null)
    .gt('starts_at', ahoraIso)
    .lt('starts_at', limite)
    .order('starts_at', { ascending: true })
    .limit(LOTE)

  await cargarTiendas((proximos ?? []).map((b) => b.store_id))

  for (const b of (proximos ?? []) as Booking[]) {
    try {
      const regla = reglas.get(b.store_id)
      const horas = regla?.recordatorio_horas_antes ?? 24
      if (horas <= 0) continue // la tienda desactivó los recordatorios

      const inicio = new Date(b.starts_at).getTime()
      const momentoRecordatorio = inicio - horas * 3600000
      if (ahora.getTime() < momentoRecordatorio) continue // todavía no es momento

      // Se marca antes de enviar: si dos corridas se pisan, solo una gana la marca.
      const { data: marcado } = await supabaseAdmin
        .from('bookings')
        .update({ recordatorio_enviado_at: ahoraIso })
        .eq('id', b.id)
        .is('recordatorio_enviado_at', null)
        .select('id')
        .maybeSingle()
      if (!marcado) continue

      // Si reservó cuando ya faltaba menos que el plazo del recordatorio, acaba
      // de recibir la confirmación: no tiene sentido otro email.
      if (new Date(b.created_at).getTime() >= momentoRecordatorio) continue

      const store = tiendas.get(b.store_id)
      if (!store) continue
      const enviado = await sendBookingReminderEmail({
        store,
        booking: b,
        zona: regla?.zona_horaria || TZ_DEFAULT,
        enlaceTurno: `${getStorePublicOrigin(store)}/tienda/turno/${b.public_token}`,
      })
      if (enviado) {
        resultado.recordatorios++
        await supabaseAdmin.from('booking_events').insert({ booking_id: b.id, store_id: b.store_id, tipo: 'recordatorio', actor: 'sistema' })
      } else {
        // Falló el envío: se desmarca para reintentar en la próxima corrida.
        await supabaseAdmin.from('bookings').update({ recordatorio_enviado_at: null }).eq('id', b.id)
      }
    } catch (err) {
      resultado.errores++
      console.error(`cron/turnos: error enviando recordatorio del turno ${b.id}:`, err)
    }
  }

  return NextResponse.json({ ok: true, ...resultado })
}
