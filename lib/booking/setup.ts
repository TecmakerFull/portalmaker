// =============================================================================
// PORTALMAKER — Configuración de turnos de una tienda (solo servidor)
//
// Toda tienda que da turnos necesita reglas de reserva y al menos un
// profesional. En lugar de crearlos en el alta (que se hace desde el
// navegador), se crean la primera vez que hacen falta. Así también funciona
// para tiendas que pasan de "Productos" a "Servicios" desde Perfil.
// =============================================================================

import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { parseHorarios } from '@/lib/horarios'
import type { Store, Staff, StoreBookingSettings } from '@/types/database'

export const DEFAULT_BOOKING_SETTINGS: Omit<StoreBookingSettings, 'store_id' | 'created_at' | 'updated_at'> = {
  zona_horaria: 'America/Argentina/Buenos_Aires',
  anticipacion_min_minutos: 120,
  anticipacion_max_dias: 60,
  intervalo_grilla_minutos: 15,
  requiere_aprobacion: false,
  cancelacion_hasta_horas: 24,
  sena_modo: 'ninguna',
  sena_valor: 0,
}

export interface BookingConfig {
  settings: StoreBookingSettings
  staff: Staff[]
}

/**
 * Lee la configuración de turnos sin modificar nada. Si falta algo, devuelve
 * valores por defecto en memoria (para la tienda pública).
 */
export async function getBookingConfig(store: Store): Promise<BookingConfig> {
  const supabaseAdmin = createSupabaseAdminClient()
  const [{ data: settings }, { data: staff }] = await Promise.all([
    supabaseAdmin.from('store_booking_settings').select('*').eq('store_id', store.id).maybeSingle(),
    supabaseAdmin.from('staff').select('*').eq('store_id', store.id).eq('activo', true).order('orden'),
  ])

  return {
    settings: (settings as StoreBookingSettings) ?? { store_id: store.id, ...DEFAULT_BOOKING_SETTINGS },
    staff: (staff as Staff[]) ?? [],
  }
}

/**
 * Garantiza que existan las reglas de reserva y el profesional principal.
 * Solo debe llamarse desde páginas o rutas que ya verificaron que el usuario
 * administra la tienda (usa service_role).
 */
export async function ensureBookingSetup(store: Store): Promise<BookingConfig> {
  const supabaseAdmin = createSupabaseAdminClient()

  const { data: existingSettings } = await supabaseAdmin
    .from('store_booking_settings')
    .select('*')
    .eq('store_id', store.id)
    .maybeSingle()

  let settings = existingSettings as StoreBookingSettings | null
  if (!settings) {
    const { data } = await supabaseAdmin
      .from('store_booking_settings')
      .upsert({ store_id: store.id, ...DEFAULT_BOOKING_SETTINGS }, { onConflict: 'store_id' })
      .select('*')
      .single()
    settings = (data as StoreBookingSettings) ?? { store_id: store.id, ...DEFAULT_BOOKING_SETTINGS }
  }

  const { data: existingStaff } = await supabaseAdmin
    .from('staff')
    .select('*')
    .eq('store_id', store.id)
    .order('orden')

  let staff = (existingStaff as Staff[]) ?? []
  if (staff.length === 0) {
    // La disponibilidad inicial son los horarios de atención que la tienda ya
    // cargó en Contacto (o el horario por defecto): el dueño no arranca de cero.
    const horarios = parseHorarios(store)
    const { data } = await supabaseAdmin
      .from('staff')
      .insert({ store_id: store.id, nombre: store.nombre, horarios: { dias: horarios.dias }, orden: 0 })
      .select('*')
    staff = (data as Staff[]) ?? []
  }

  return { settings, staff }
}
