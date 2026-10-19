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

import { cache } from 'react'
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
 * Resuelve la tienda activa para el request actual con memoización por petición (React cache).
 * Evita llamadas redundantes a Supabase entre layout.tsx, metadata y page.tsx.
 */
export const getTenantStore = cache(async function getTenantStore(): Promise<TenantResult | null> {
  const headersList = await headers()

  const storeSlug = headersList.get('x-store-slug')
  const storeDomain = headersList.get('x-store-domain')
  const tenantSource = headersList.get('x-tenant-source') as TenantContext['resolved_by'] | null

  // Si no hay ningún identificador de tenant, este request es del portal
  if (!storeSlug && !storeDomain) {
    return null
  }

  const supabase = await createSupabaseServerClient()

  // Intentar cargar store con perfil completo si el usuario autenticado es el dueño o superadmin
  // Para visitantes y compradores anónimos, consultar stores_public (sin admin_email ni datos bancarios)
  let store: any = null
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    let adminQuery = supabase.from('stores').select('*')
    if (storeSlug) {
      adminQuery = adminQuery.eq('slug', storeSlug)
    } else if (storeDomain) {
      const cleanDomain = storeDomain.replace(/^www\./, '')
      adminQuery = adminQuery.or(`custom_domain.eq.${storeDomain},custom_domain.eq.${cleanDomain}`)
    }
    const { data: adminStore } = await adminQuery.maybeSingle()
    if (adminStore) {
      store = adminStore
    }
  }

  if (!store) {
    let publicQuery = supabase.from('stores_public').select('*')
    if (storeSlug) {
      publicQuery = publicQuery.eq('slug', storeSlug)
    } else if (storeDomain) {
      const cleanDomain = storeDomain.replace(/^www\./, '')
      publicQuery = publicQuery.or(`custom_domain.eq.${storeDomain},custom_domain.eq.${cleanDomain}`)
    }
    const { data: publicStore } = await publicQuery.maybeSingle()
    if (publicStore) {
      store = publicStore
    }
  }

  if (!store) {
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
})

/**
 * Verifica si el usuario logueado es el admin de la tienda proporcionada.
 * Se usa como guard en los layouts del panel admin de tienda.
 *
 * @param store - La tienda cuyo admin se quiere verificar
 * @returns true si el usuario es el admin de esa tienda, false en caso contrario
 */
export const isStoreAdmin = cache(async function isStoreAdmin(store: Store): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) return false
  const userEmail = user.email.trim().toLowerCase()
  const storeAdminEmail = (store.admin_email || '').trim().toLowerCase()

  // El dueño de la tienda siempre tiene acceso
  if (storeAdminEmail && userEmail === storeAdminEmail) return true

  // Si admin_email no venía en el objeto (por resolución vía stores_public), validar directamente contra stores
  try {
    const { data: storeRow } = await supabase
      .from('stores')
      .select('admin_email')
      .eq('id', store.id)
      .maybeSingle()

    if (storeRow?.admin_email && storeRow.admin_email.trim().toLowerCase() === userEmail) {
      return true
    }
  } catch {
    // Continuar con verificación de platform_admins
  }

  // Verificar si es superadmin registrado en platform_admins
  try {
    const { data: platformAdmin } = await supabase
      .from('platform_admins')
      .select('id')
      .ilike('email', userEmail)
      .maybeSingle()

    if (platformAdmin) return true
  } catch {
    // Si falla la consulta de platform_admins, continuar con colaboradores
  }

  // Verificar si es colaborador activo de la tienda
  try {
    const { data: collab } = await supabase
      .from('store_collaborators')
      .select('id')
      .eq('store_id', store.id)
      .ilike('email', userEmail)
      .eq('estado', 'activo')
      .maybeSingle()

    return !!collab
  } catch {
    return false
  }
})

/**
 * Verifica si el usuario logueado es un platform_admin (developer de Portalmaker).
 * Se usa como guard en los layouts del dashboard del portal.
 *
 * @returns true si el usuario es platform_admin
 */
export const isPlatformAdmin = cache(async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) return false
  const userEmail = user.email.trim().toLowerCase()

  const { data } = await supabase
    .from('platform_admins')
    .select('id')
    .ilike('email', userEmail)
    .maybeSingle()

  return !!data
})

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
