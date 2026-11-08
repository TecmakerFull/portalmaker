// =============================================================================
// PORTALMAKER — Registro de clientes de turnos con límite por plan (servidor)
//
// Decisión de negocio: para reservar (o anotarse en lista de espera) hay que
// ser usuario de la tienda, y cada plan tiene un tope de clientes registrados.
// Solo cuentan los clientes nuevos: quien ya está en el CRM siempre puede volver.
// =============================================================================

import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getStoreEffectiveLimit } from '@/lib/plans'
import { emailIlikePattern } from '@/lib/sql-utils'
import { avisarCupoClientesLleno } from '@/lib/booking/emails'
import { getRequestOrigin } from '@/lib/store-metadata'
import type { Store } from '@/types/database'

export type RegistroCliente = { ok: true } | { ok: false; error: string; code: 'limite_clientes' }

export async function registrarClienteTurnos(params: {
  store: Store
  email: string
  nombre: string
  telefono: string | null
}): Promise<RegistroCliente> {
  const { store } = params
  const email = params.email.trim().toLowerCase()
  const supabaseAdmin = createSupabaseAdminClient()

  const { data: existente } = await supabaseAdmin
    .from('store_customers')
    .select('id')
    .eq('store_id', store.id)
    .eq('email', email)
    .maybeSingle()

  if (!existente) {
    const limite = getStoreEffectiveLimit(store, 'limite_clientes')
    const { count } = await supabaseAdmin
      .from('store_customers')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store.id)
    if ((count ?? 0) >= limite) {
      await avisarCupoLleno(store, 'reservar')
      return {
        ok: false,
        code: 'limite_clientes',
        error: mensajeCupoLleno('reservar'),
      }
    }
  }

  await supabaseAdmin.from('store_customers').upsert(
    { store_id: store.id, email, nombre: params.nombre, telefono: params.telefono, ultimo_login: new Date().toISOString() },
    { onConflict: 'store_id,email' }
  )

  return { ok: true }
}

function mensajeCupoLleno(motivo: 'comprar' | 'reservar' | 'cuenta'): string {
  const que = motivo === 'comprar' ? 'tu compra' : motivo === 'reservar' ? 'tu turno' : 'lo que necesitás'
  return `Por el momento la tienda no puede recibir clientes nuevos online. Escribile por WhatsApp para coordinar ${que}.`
}

/** Avisa a la dueña que alguien no pudo registrarse por cupo lleno. Nunca rompe el flujo. */
async function avisarCupoLleno(store: Store, motivo: 'comprar' | 'reservar' | 'cuenta') {
  try {
    const origin = await getRequestOrigin()
    await avisarCupoClientesLleno({
      store,
      motivo,
      enlacePanel: `${origin}/tienda/admin/clientes`,
      enlacePlanes: `${origin}/tienda/admin/suscripcion`,
    })
  } catch (e) {
    console.warn('No se pudo avisar el cupo de clientes lleno:', e)
  }
}

/**
 * Alta o actualización del cliente de la tienda a partir de su sesión (servidor).
 *
 * Es el único camino por el que un cliente entra a store_customers: el navegador
 * ya no escribe esa tabla (ver migración 20261107_clientes_solo_servidor), así el
 * tope del plan no se puede saltear. El tope rige para todos los tipos de tienda
 * (productos, servicios y ambos).
 *
 * - Cliente existente: solo se refresca ultimo_login. Nombre y teléfono se
 *   cambian únicamente con `actualizar` (cuando la persona edita su perfil),
 *   para que un ingreso nunca pise lo que ya cargó.
 * - Dueña y colaboradores no consumen cupo.
 */
export async function sincronizarClienteTienda(params: {
  store: Store
  email: string
  nombre?: string | null
  telefono?: string | null
  actualizar?: boolean
  /** Qué estaba haciendo la persona, para el aviso a la dueña si no hay cupo. */
  motivo?: 'comprar' | 'reservar' | 'cuenta'
}): Promise<{ ok: true; creado: boolean } | { ok: false; code: 'limite_clientes'; error: string }> {
  const { store, actualizar } = params
  const email = params.email.trim().toLowerCase()
  const supabaseAdmin = createSupabaseAdminClient()

  const { data: existente } = await supabaseAdmin
    .from('store_customers')
    .select('id')
    .eq('store_id', store.id)
    .eq('email', email)
    .maybeSingle()

  if (existente) {
    const cambios: Record<string, unknown> = { ultimo_login: new Date().toISOString() }
    if (actualizar) {
      if (params.nombre) cambios.nombre = params.nombre
      if (params.telefono !== undefined) cambios.telefono = params.telefono || null
    }
    await supabaseAdmin.from('store_customers').update(cambios).eq('id', existente.id)
    return { ok: true, creado: false }
  }

  if (email !== (store.admin_email || '').toLowerCase()) {
    const { data: colaborador } = await supabaseAdmin
      .from('store_collaborators')
      .select('id')
      .eq('store_id', store.id)
      .eq('estado', 'activo')
      .ilike('email', emailIlikePattern(email))
      .maybeSingle()

    if (!colaborador) {
      const limite = getStoreEffectiveLimit(store, 'limite_clientes')
      const { count } = await supabaseAdmin
        .from('store_customers')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id)
      if ((count ?? 0) >= limite) {
        await avisarCupoLleno(store, params.motivo ?? 'cuenta')
        return {
          ok: false,
          code: 'limite_clientes',
          error: mensajeCupoLleno(params.motivo ?? 'cuenta'),
        }
      }
    }
  }

  await supabaseAdmin.from('store_customers').insert({
    store_id: store.id,
    email,
    nombre: params.nombre || email.split('@')[0],
    telefono: params.telefono || null,
    ultimo_login: new Date().toISOString(),
  })
  return { ok: true, creado: true }
}
