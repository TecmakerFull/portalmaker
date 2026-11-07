// =============================================================================
// PORTALMAKER — Registro de clientes de turnos con límite por plan (servidor)
//
// Decisión de negocio: para reservar (o anotarse en lista de espera) hay que
// ser usuario de la tienda, y cada plan tiene un tope de clientes registrados.
// Solo cuentan los clientes nuevos: quien ya está en el CRM siempre puede volver.
// =============================================================================

import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getStoreEffectiveLimit } from '@/lib/plans'
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
      return {
        ok: false,
        code: 'limite_clientes',
        error: 'Por el momento la tienda no puede recibir clientes nuevos online. Escribile por WhatsApp para coordinar tu turno.',
      }
    }
  }

  await supabaseAdmin.from('store_customers').upsert(
    { store_id: store.id, email, nombre: params.nombre, telefono: params.telefono, ultimo_login: new Date().toISOString() },
    { onConflict: 'store_id,email' }
  )

  return { ok: true }
}
