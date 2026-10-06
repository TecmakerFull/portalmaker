// =============================================================================
// PORTALMAKER — Helper de resolución de tenant
// "El portal del Maker" | portalmaker.com.ar
//
// Lee los headers inyectados por el middleware (middleware.ts) y los usa para
// obtener los datos de la tienda correspondiente desde Supabase.
//
// Flujo completo:
//   1. Request llega a Cloudflare Edge
//   2. middleware.ts inyecta x-store-slug o x-store-domain en el header
//   3. Server Component llama a getTenantStore()
//   4. getTenantStore() busca en la BD y retorna los datos de la tienda
//   5. Los datos de la tienda se pasan a todos los componentes como props
// =============================================================================

import { headers } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Store, TenantContext } from '@/types/database'

/**
 * Resultado de la resolución de tenant.
 * Si la tienda no existe o no está activa, retorna null.
 */
export interface TenantResult {
  store: Store
  context: TenantContext
}

/**
 * Resuelve la tienda activa para el request actual.
 * Debe llamarse desde un Server Component o Server Action.
 *
 * @returns Los datos de la tienda, o null si no existe o no está activa
 *
 * Ejemplo de uso en un layout:
 *   const tenant = await getTenantStore()
 *   if (!tenant) notFound()
 */
export async function getTenantStore(): Promise<TenantResult | null> {
  const headersList = await headers()

  const storeSlug = headersList.get('x-store-slug')
  const storeDomain = headersList.get('x-store-domain')
  const tenantSource = headersList.get('x-tenant-source') as TenantContext['resolved_by'] | null

  // Si no hay ningún identificador de tenant, este request es del portal
  if (!storeSlug && !storeDomain) {
    return null
  }

  const supabase = await createSupabaseServerClient()

  let query = supabase
    .from('stores')
    .select('*')

  if (storeSlug) {
    // Tienda por subdominio: tecmaker.portalmaker.com.ar → slug = "tecmaker"
    query = query.eq('slug', storeSlug)
  } else if (storeDomain) {
    // Tienda por dominio propio: tecmaker3d.com.ar (soporta con o sin www)
    const cleanDomain = storeDomain.replace(/^www\./, '')
    query = query.or(`custom_domain.eq.${storeDomain},custom_domain.eq.${cleanDomain}`)
  }

  const { data: store, error } = await query.single()

  if (error || !store) {
    // Tienda no encontrada en la BD — el Server Component mostrará un 404
    return null
  }

  return {
    store: store as Store,
    context: {
      store_id: store.id,
      store_slug: store.slug,
      resolved_by: tenantSource ?? (storeSlug ? 'subdomain' : 'custom_domain'),
    },
  }
}

/**
 * Verifica si el usuario logueado es el admin de la tienda proporcionada.
 * Se usa como guard en los layouts del panel admin de tienda.
 *
 * @param store - La tienda cuyo admin se quiere verificar
 * @returns true si el usuario es el admin de esa tienda, false en caso contrario
 */
export async function isStoreAdmin(store: Store): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) return false
  return user.email === store.admin_email
}

/**
 * Verifica si el usuario logueado es un platform_admin (developer de Portalmaker).
 * Se usa como guard en los layouts del dashboard del portal.
 *
 * @returns true si el usuario es platform_admin
 */
export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) return false

  const { data } = await supabase
    .from('platform_admins')
    .select('id')
    .eq('email', user.email)
    .single()

  return !!data
}

/**
 * Calcula el estado de suscripción de una tienda basado en las fechas.
 * No modifica la BD — es un cálculo en runtime.
 */
export function getSubscriptionStatus(store: Store): 'activa' | 'por_vencer' | 'en_gracia' | 'vencida' {
  if (!store.fecha_proximo_vencimiento) {
    // Sin fecha de vencimiento = suscripción activa sin límite (caso inicial)
    return 'activa'
  }

  const hoy = new Date()
  const vencimiento = new Date(store.fecha_proximo_vencimiento)
  const diasRestantes = Math.floor((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

  if (diasRestantes > 7)  return 'activa'
  if (diasRestantes > 0)  return 'por_vencer'
  if (diasRestantes >= -store.dias_gracia) return 'en_gracia'
  return 'vencida'
}
