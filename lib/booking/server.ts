// =============================================================================
// PORTALMAKER — Turnos: disponibilidad y alta de reservas (solo servidor)
//
// Usado por la API pública (/api/turnos) y por la carga manual del panel.
// Lee con service_role porque profesionales, bloqueos y turnos no son
// públicos; los llamadores validan permisos antes.
// =============================================================================

import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getBookingConfig } from '@/lib/booking/setup'
import {
  calcularHorariosDisponibles,
  esHorarioDisponible,
  fechaLocal,
  sumarDias,
  localAUtc,
  diaSemana,
  type DisponibilidadSemanal,
  type RangoOcupado,
  type ReglasReserva,
} from '@/lib/booking/availability'
import { calcularSena, SENA_MINUTOS_PARA_PAGAR } from '@/lib/booking/sena'
import { formatFechaTurno, precioVigente } from '@/lib/booking/format'
import { getEffectiveStoreConfig } from '@/lib/config/store-config'
import type { Booking, Service, Staff, Store, StoreBookingSettings } from '@/types/database'

export interface HorarioOfrecido {
  inicio: string // ISO UTC
  etiqueta: string // "HH:MM" local
  staff_id: string
}

function reglasDesde(settings: StoreBookingSettings): ReglasReserva {
  return {
    zonaHoraria: settings.zona_horaria || 'America/Argentina/Buenos_Aires',
    intervaloMinutos: settings.intervalo_grilla_minutos || 15,
    anticipacionMinMinutos: settings.anticipacion_min_minutos ?? 120,
    anticipacionMaxDias: settings.anticipacion_max_dias ?? 60,
  }
}

function disponibilidadDe(staff: Staff): DisponibilidadSemanal {
  return (staff.horarios?.dias ?? {}) as DisponibilidadSemanal
}

/** Turnos activos y bloqueos de los profesionales dentro de un rango. */
async function cargarOcupados(staffIds: string[], desde: Date, hasta: Date): Promise<Map<string, RangoOcupado[]>> {
  const supabaseAdmin = createSupabaseAdminClient()
  const mapa = new Map<string, RangoOcupado[]>(staffIds.map((id) => [id, []]))
  if (staffIds.length === 0) return mapa

  const [{ data: turnos }, { data: bloqueos }] = await Promise.all([
    supabaseAdmin
      .from('bookings')
      .select('staff_id, starts_at, ocupado_hasta, estado, pendiente_expira_at')
      .in('staff_id', staffIds)
      .in('estado', ['pendiente', 'confirmado'])
      .lt('starts_at', hasta.toISOString())
      .gt('ocupado_hasta', desde.toISOString()),
    supabaseAdmin
      .from('staff_blocks')
      .select('staff_id, starts_at, ends_at')
      .in('staff_id', staffIds)
      .lt('starts_at', hasta.toISOString())
      .gt('ends_at', desde.toISOString()),
  ])

  const ahora = Date.now()
  for (const t of turnos ?? []) {
    // Una seña sin pagar cuyo plazo venció ya no ocupa el horario, aunque la
    // tarea programada todavía no la haya marcado como vencida.
    if (t.estado === 'pendiente' && t.pendiente_expira_at && new Date(t.pendiente_expira_at).getTime() < ahora) continue
    mapa.get(t.staff_id)?.push({ inicio: new Date(t.starts_at), fin: new Date(t.ocupado_hasta) })
  }
  for (const b of bloqueos ?? []) {
    mapa.get(b.staff_id)?.push({ inicio: new Date(b.starts_at), fin: new Date(b.ends_at) })
  }
  return mapa
}

/**
 * Horarios libres para un servicio durante `dias` días desde `desde` (fecha
 * local "YYYY-MM-DD"). Con varios profesionales, cada horario se asigna al
 * primero que lo tenga libre ("cualquiera disponible").
 */
export async function getHorariosDisponibles(params: {
  store: Store
  service: Pick<Service, 'duracion_minutos' | 'buffer_despues_minutos'>
  desde: string
  dias: number
  ahora?: Date
}): Promise<{
  zonaHoraria: string
  dias: Record<string, HorarioOfrecido[]>
  completos: string[]
  /** Horarios del día que están ocupados: se muestran sombreados para anotarse en la lista de espera. */
  ocupados: Record<string, { inicio: string; etiqueta: string }[]>
}> {
  const { store, service } = params
  const ahora = params.ahora ?? new Date()
  const dias = Math.min(Math.max(params.dias, 1), 42)
  const { settings, staff } = await getBookingConfig(store)
  const reglas = reglasDesde(settings)

  const resultado: Record<string, HorarioOfrecido[]> = {}
  const ocupadosPorDia: Record<string, { inicio: string; etiqueta: string }[]> = {}
  // Días en que se atiende pero no queda lugar: ahí se ofrece la lista de espera.
  const completos: string[] = []
  if (staff.length === 0) return { zonaHoraria: reglas.zonaHoraria, dias: resultado, completos, ocupados: ocupadosPorDia }

  const rangoDesde = localAUtc(params.desde, '00:00', reglas.zonaHoraria)
  const rangoHasta = localAUtc(sumarDias(params.desde, dias), '00:00', reglas.zonaHoraria)
  const ocupados = await cargarOcupados(staff.map((s) => s.id), rangoDesde, rangoHasta)

  for (let i = 0; i < dias; i++) {
    const fecha = sumarDias(params.desde, i)
    const porInicio = new Map<number, HorarioOfrecido>()
    // Todos los horarios que la agenda ofrecería sin turnos ocupados (de cualquier profesional)
    const grilla = new Map<number, { inicio: string; etiqueta: string }>()

    for (const profesional of staff) {
      const horarios = calcularHorariosDisponibles({
        fecha,
        disponibilidad: disponibilidadDe(profesional),
        duracionMinutos: service.duracion_minutos,
        bufferMinutos: service.buffer_despues_minutos,
        ocupados: ocupados.get(profesional.id) ?? [],
        reglas,
        ahora,
      })
      // Misma cuenta sin ocupados: lo que falte en `horarios` es un horario tomado
      for (const h of calcularHorariosDisponibles({
        fecha,
        disponibilidad: disponibilidadDe(profesional),
        duracionMinutos: service.duracion_minutos,
        bufferMinutos: service.buffer_despues_minutos,
        ocupados: [],
        reglas,
        ahora,
      })) {
        if (!grilla.has(h.inicio.getTime())) grilla.set(h.inicio.getTime(), { inicio: h.inicio.toISOString(), etiqueta: h.etiqueta })
      }
      for (const h of horarios) {
        if (!porInicio.has(h.inicio.getTime())) {
          porInicio.set(h.inicio.getTime(), { inicio: h.inicio.toISOString(), etiqueta: h.etiqueta, staff_id: profesional.id })
        }
      }
    }

    const lista = Array.from(porInicio.values()).sort((a, b) => a.inicio.localeCompare(b.inicio))
    const tomados = Array.from(grilla.entries())
      .filter(([t]) => !porInicio.has(t))
      .map(([, h]) => h)
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
    if (tomados.length > 0) ocupadosPorDia[fecha] = tomados
    if (lista.length > 0) {
      resultado[fecha] = lista
    } else if (staff.some((p) => disponibilidadDe(p)[diaSemana(fecha)]?.activo)) {
      completos.push(fecha)
    }
  }

  return { zonaHoraria: reglas.zonaHoraria, dias: resultado, completos, ocupados: ocupadosPorDia }
}

export class BookingError extends Error {
  constructor(public code: 'horario_ocupado' | 'servicio_invalido' | 'sin_profesional' | 'datos_invalidos', message: string) {
    super(message)
  }
}

/**
 * Crea un turno validando todo en el servidor:
 * - el servicio pertenece a la tienda y está visible (salvo carga manual),
 * - el horario sigue libre según las reglas (no se confía en el navegador),
 * - la base rechaza igual cualquier superposición (exclusion constraint).
 */
export async function crearTurno(params: {
  store: Store
  serviceId: string
  inicioIso: string
  staffId?: string | null
  cliente: { userId: string | null; nombre: string; email: string | null; telefono: string | null }
  notas?: string | null
  origen: 'web' | 'manual'
  /** Carga manual que igual cobra seña (turno asignado desde la lista de espera). */
  cobrarSena?: boolean
  /** Minutos que se retiene el horario esperando la seña (por defecto, el plazo de una reserva web). */
  retencionMinutos?: number
  /** Modalidad elegida por el cliente: 'sena' (anticipo) o 'total' (100% ahora). */
  pagoModalidad?: 'sena' | 'total'
}): Promise<{ booking: Booking; sena: number; order: { id: string; public_token: string } | null }> {
  const { store } = params
  const supabaseAdmin = createSupabaseAdminClient()

  const { data: service } = await supabaseAdmin
    .from('services')
    .select('*')
    .eq('id', params.serviceId)
    .eq('store_id', store.id)
    .maybeSingle()

  if (!service || (params.origen === 'web' && !service.visible)) {
    throw new BookingError('servicio_invalido', 'El servicio elegido ya no está disponible.')
  }

  const inicio = new Date(params.inicioIso)
  if (Number.isNaN(inicio.getTime())) {
    throw new BookingError('datos_invalidos', 'El horario elegido no es válido.')
  }

  const { settings, staff } = await getBookingConfig(store)
  if (staff.length === 0) {
    throw new BookingError('sin_profesional', 'La tienda todavía no configuró su agenda.')
  }

  const reglas = reglasDesde(settings)
  // La carga manual de la tienda puede saltear la anticipación mínima
  // (por ejemplo, un cliente que llama para "dentro de un rato").
  const reglasEfectivas: ReglasReserva =
    params.origen === 'manual' ? { ...reglas, anticipacionMinMinutos: 0 } : reglas

  const fin = new Date(inicio.getTime() + service.duracion_minutos * 60000)
  const ocupadoHasta = new Date(fin.getTime() + (service.buffer_despues_minutos || 0) * 60000)

  // Las señas sin pagar con plazo vencido se marcan como vencidas acá mismo:
  // la restricción anti-superposición de la base las sigue contando mientras
  // estén "pendiente", y no queremos depender de la tarea programada.
  await supabaseAdmin
    .from('bookings')
    .update({ estado: 'expirado', updated_at: new Date().toISOString() })
    .in('staff_id', staff.map((s) => s.id))
    .eq('estado', 'pendiente')
    .not('pendiente_expira_at', 'is', null)
    .lt('pendiente_expira_at', new Date().toISOString())

  const ocupados = await cargarOcupados(
    staff.map((s) => s.id),
    new Date(inicio.getTime() - 24 * 3600000),
    new Date(ocupadoHasta.getTime() + 24 * 3600000)
  )

  // Profesional pedido o el primero que tenga el horario libre.
  const candidatos = params.staffId ? staff.filter((s) => s.id === params.staffId) : staff
  const elegido = candidatos.find((s) =>
    esHorarioDisponible(inicio, {
      disponibilidad: disponibilidadDe(s),
      duracionMinutos: service.duracion_minutos,
      bufferMinutos: service.buffer_despues_minutos,
      ocupados: ocupados.get(s.id) ?? [],
      reglas: reglasEfectivas,
      ahora: new Date(),
    })
  )

  if (!elegido) {
    throw new BookingError('horario_ocupado', 'Ese horario se acaba de ocupar. Elegí otro, por favor.')
  }

  // Seña o Pago Total: en reservas web o asignados de espera, con Mercado Pago conectado
  const storeConfig = await getEffectiveStoreConfig(store.id)
  const precioInfo = precioVigente(service)
  const precioTotal = precioInfo.vigente
  const senaCalculada =
    (params.origen === 'web' || params.cobrarSena) && storeConfig.mercadopago
      ? calcularSena(precioTotal, settings.sena_modo, Number(settings.sena_valor) || 0)
      : 0
  const conCobro = senaCalculada > 0
  const esPagoTotal = params.pagoModalidad === 'total'
  const montoACobrar = esPagoTotal ? precioTotal : senaCalculada
  const estadoInicial = conCobro || (settings.requiere_aprobacion && params.origen === 'web') ? 'pendiente' : 'confirmado'

  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .insert({
      store_id: store.id,
      service_id: service.id,
      staff_id: elegido.id,
      starts_at: inicio.toISOString(),
      ends_at: fin.toISOString(),
      ocupado_hasta: ocupadoHasta.toISOString(),
      estado: estadoInicial,
      // Con cobro (seña o total), el horario queda retenido unos minutos mientras se paga.
      pendiente_expira_at: conCobro ? new Date(Date.now() + (params.retencionMinutos ?? SENA_MINUTOS_PARA_PAGAR) * 60000).toISOString() : null,
      servicio_nombre: service.nombre,
      servicio_duracion: service.duracion_minutos,
      precio: precioTotal,
      cliente_user_id: params.cliente.userId,
      cliente_nombre: params.cliente.nombre,
      cliente_email: params.cliente.email,
      cliente_telefono: params.cliente.telefono,
      notas_cliente: params.notas || null,
      origen: params.origen,
    })
    .select('*')
    .single()

  if (error || !booking) {
    // 23P01 = exclusion_violation: otro turno ganó el horario en el mismo instante.
    if (error?.code === '23P01') {
      throw new BookingError('horario_ocupado', 'Ese horario se acaba de ocupar. Elegí otro, por favor.')
    }
    throw error ?? new Error('No se pudo crear el turno')
  }

  await supabaseAdmin.from('booking_events').insert({
    booking_id: booking.id,
    store_id: store.id,
    tipo: 'creado',
    detalle: `${service.nombre} — ${fechaLocal(inicio, reglas.zonaHoraria)}`,
    actor: params.origen === 'web' ? 'cliente' : 'tienda',
  })

  if (!conCobro) return { booking: booking as Booking, sena: 0, order: null }

  // El cobro (seña o total) se genera como una orden de Mercado Pago
  const balancePending = esPagoTotal ? 0.00 : Math.max(0, precioTotal - senaCalculada)
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .insert({
      store_id: store.id,
      nombre_comprador: params.cliente.nombre,
      email_comprador: params.cliente.email,
      telefono_comprador: params.cliente.telefono,
      tipo_entrega: 'acordar',
      metodo_pago: 'mercadopago',
      items: [
        {
          nombre: esPagoTotal ? `Turno: ${service.nombre}` : `Seña: ${service.nombre}`,
          variante: formatFechaTurno(inicio, reglas.zonaHoraria),
          cantidad: 1,
          precio_unitario: montoACobrar,
          subtotal: montoACobrar,
          gestiona_stock: false,
        },
      ],
      total: precioTotal,
      costo_envio: 0,
      is_deposit: !esPagoTotal,
      deposit_amount: esPagoTotal ? null : senaCalculada,
      balance_pending: balancePending,
      balance_paid: false,
      estado_pedido: 'nuevo',
      estado_pago: 'pendiente',
      stock_descontado: false,
      notas: esPagoTotal ? `Pago total del turno ${booking.id}` : `Seña del turno ${booking.id}`,
      comision_portalmaker_pct: storeConfig.commission_pct,
      fee_source: storeConfig.commission_source,
      mp_recargo_pct: 0,
    })
    .select('id, public_token')
    .single()

  if (orderErr || !order) {
    // Sin orden no hay forma de pagar: se libera el horario.
    await supabaseAdmin.from('bookings').update({ estado: 'expirado' }).eq('id', booking.id)
    throw orderErr ?? new Error('No se pudo crear el cobro de la reserva')
  }

  const { data: conOrden } = await supabaseAdmin
    .from('bookings')
    .update({ order_id: order.id })
    .eq('id', booking.id)
    .select('*')
    .single()

  return { booking: (conOrden ?? booking) as Booking, sena: montoACobrar, order }
}
