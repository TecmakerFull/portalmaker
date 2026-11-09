// =============================================================================
// PORTALMAKER — Configuración Efectiva de Tiendas (Planes y Overrides)
// Única fuente de verdad en servidor para límites, comisiones y funcionalidades.
// =============================================================================

import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'
import type { Plan, StorePlanOverride } from '@/types/database'

export interface EffectiveStoreConfig {
  store_id: string
  plan_id: string
  plan_name: string
  commission_pct: number
  commission_source: 'plan' | 'override'
  max_active_products: number | null
  max_active_products_source: 'plan' | 'override'
  whatsapp_orders: boolean
  whatsapp_orders_source: 'plan' | 'override'
  online_checkout: boolean
  online_checkout_source: 'plan' | 'override'
  mercadopago: boolean
  mercadopago_source: 'plan' | 'override'
  deposit_payments: boolean
  deposit_payments_source: 'plan' | 'override'
  mp_surcharge: boolean
  mp_surcharge_source: 'plan' | 'override'
  bank_transfer: boolean
  bank_transfer_source: 'plan' | 'override'
  override_until: string | null
  is_override_expired: boolean
}

export interface GetEffectiveStoreConfigOptions {
  userEmail?: string | null
  requireAuth?: boolean
  allowCollaborators?: boolean
  requiredCollaboratorRoles?: Array<'admin' | 'editor' | 'colaborador'>
  bypassCache?: boolean
}

/** Fallback estricto con los valores por defecto oficiales según la especificación */
export const DEFAULT_PLANS_FALLBACK: Record<string, Omit<Plan, 'created_at' | 'updated_at'>> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Plan inicial para comenzar a vender',
    price_ars: 0,
    commission_pct: 3.0,
    max_active_products: 15,
    whatsapp_orders: true,
    online_checkout: true,
    mercadopago: true,
    deposit_payments: true,
    mp_surcharge: true,
    bank_transfer: false,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Para tiendas en crecimiento',
    price_ars: 12000,
    commission_pct: 2.0,
    max_active_products: 50,
    whatsapp_orders: true,
    online_checkout: true,
    mercadopago: true,
    deposit_payments: true,
    mp_surcharge: true,
    bank_transfer: true,
  },
  maker_pro: {
    id: 'maker_pro',
    name: 'Maker Pro',
    description: 'Para marcas y negocios consolidados',
    price_ars: 25000,
    commission_pct: 1.0,
    max_active_products: 150,
    whatsapp_orders: true,
    online_checkout: true,
    mercadopago: true,
    deposit_payments: true,
    mp_surcharge: true,
    bank_transfer: true,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Para grandes negocios con volumen ilimitado',
    price_ars: 50000,
    commission_pct: 0.0,
    max_active_products: null,
    whatsapp_orders: true,
    online_checkout: true,
    mercadopago: true,
    deposit_payments: true,
    mp_surcharge: true,
    bank_transfer: true,
  },
  bonificado: {
    id: 'bonificado',
    name: 'Bonificado',
    description: 'Cuenta bonificada para fundadores y partners',
    price_ars: 0,
    commission_pct: 0.0,
    max_active_products: null,
    whatsapp_orders: true,
    online_checkout: true,
    mercadopago: true,
    deposit_payments: true,
    mp_surcharge: true,
    bank_transfer: true,
  },
}

// Cache ultracorto en memoria (TTL de 5 segundos) para no saturar base de datos
// pero reflejar cambios de superadmin de forma inmediata.
const configCache = new Map<string, { config: EffectiveStoreConfig; expiresAt: number }>()
const CACHE_TTL_MS = 5000

export function invalidateStoreConfigCache(storeId?: string): void {
  if (storeId) {
    configCache.delete(storeId)
  } else {
    configCache.clear()
  }
}

/**
 * Obtiene la configuración efectiva de una tienda (override ?? plan default).
 * Valida expiración de overrides con override_until.
 * Si se especifica requireAuth = true, valida primero que el usuario tenga acceso a la tienda.
 */
export async function getEffectiveStoreConfig(
  storeId: string,
  options: GetEffectiveStoreConfigOptions = {}
): Promise<EffectiveStoreConfig> {
  if (!storeId || typeof storeId !== 'string') {
    throw new Error('storeId inválido para getEffectiveStoreConfig')
  }

  // Validación de seguridad obligatoria si requireAuth está activo
  if (options.requireAuth) {
    const authResult = await verifyStoreAccess(options.userEmail, storeId, {
      allowCollaborators: options.allowCollaborators ?? true,
      requiredCollaboratorRoles: options.requiredCollaboratorRoles,
    })
    if (!authResult.authorized) {
      throw new Error(`Acceso denegado a la configuración de la tienda: ${authResult.error || 'No autorizado'}`)
    }
  }

  const now = Date.now()
  if (!options.bypassCache) {
    const cached = configCache.get(storeId)
    if (cached && cached.expiresAt > now) {
      return cached.config
    }
  }

  const adminClient = createSupabaseAdminClient()

  // 1. Intentar resolver a través del RPC SECURITY DEFINER si está disponible
  try {
    const { data: rpcData, error: rpcErr } = await adminClient.rpc('get_effective_store_config', {
      p_store_id: storeId,
    })

    if (!rpcErr && rpcData && typeof rpcData === 'object' && rpcData.store_id) {
      const config = rpcData as EffectiveStoreConfig
      configCache.set(storeId, { config, expiresAt: now + CACHE_TTL_MS })
      return config
    }
  } catch {
    // Si el RPC aún no está creado en la base o falla la invocación, continuar con fallback TypeScript
  }

  // 2. Consulta directa y cálculo en servidor
  const [storeRes, overrideRes] = await Promise.all([
    adminClient.from('stores').select('id, plan').eq('id', storeId).maybeSingle(),
    adminClient.from('store_plan_overrides').select('*').eq('store_id', storeId).maybeSingle(),
  ])

  const planId = (storeRes.data?.plan as string) || 'free'

  // Consultar plan desde la tabla plans
  let planRow: Omit<Plan, 'created_at' | 'updated_at'> | null = null
  try {
    const { data: planDb } = await adminClient.from('plans').select('*').eq('id', planId).maybeSingle()
    if (planDb) {
      planRow = planDb as Plan
    }
  } catch {
    // Si la tabla plans aún no está disponible
  }

  if (!planRow) {
    planRow = DEFAULT_PLANS_FALLBACK[planId] || DEFAULT_PLANS_FALLBACK.free
  }

  const override: StorePlanOverride | null = overrideRes.data ? (overrideRes.data as StorePlanOverride) : null

  let isOverrideActive = false
  let isOverrideExpired = false

  if (override) {
    if (!override.override_until) {
      isOverrideActive = true
    } else {
      const untilDate = new Date(override.override_until).getTime()
      if (untilDate > now) {
        isOverrideActive = true
      } else {
        isOverrideExpired = true
      }
    }
  }

  const pickEffective = <T>(
    overrideVal: T | null | undefined,
    planVal: T
  ): { value: T; source: 'plan' | 'override' } => {
    if (isOverrideActive && overrideVal !== null && overrideVal !== undefined) {
      return { value: overrideVal, source: 'override' }
    }
    return { value: planVal, source: 'plan' }
  }

  const comm = pickEffective(override?.commission_pct, Number(planRow.commission_pct))
  const prod = pickEffective(override?.max_active_products, planRow.max_active_products)
  const wsp = pickEffective(override?.whatsapp_orders, planRow.whatsapp_orders)
  const chk = pickEffective(override?.online_checkout, planRow.online_checkout)
  const mp = pickEffective(override?.mercadopago, planRow.mercadopago)
  const dep = pickEffective(override?.deposit_payments, planRow.deposit_payments)
  const sur = pickEffective(override?.mp_surcharge, planRow.mp_surcharge)
  const bnk = pickEffective(override?.bank_transfer, planRow.bank_transfer)

  const effectiveConfig: EffectiveStoreConfig = {
    store_id: storeId,
    plan_id: planRow.id,
    plan_name: planRow.name,
    commission_pct: Number(comm.value),
    commission_source: comm.source,
    max_active_products: prod.value,
    max_active_products_source: prod.source,
    whatsapp_orders: wsp.value,
    whatsapp_orders_source: wsp.source,
    online_checkout: chk.value,
    online_checkout_source: chk.source,
    mercadopago: mp.value,
    mercadopago_source: mp.source,
    deposit_payments: dep.value,
    deposit_payments_source: dep.source,
    mp_surcharge: sur.value,
    mp_surcharge_source: sur.source,
    bank_transfer: bnk.value,
    bank_transfer_source: bnk.source,
    override_until: override?.override_until ?? null,
    is_override_expired: isOverrideExpired,
  }

  configCache.set(storeId, { config: effectiveConfig, expiresAt: now + CACHE_TTL_MS })
  return effectiveConfig
}
