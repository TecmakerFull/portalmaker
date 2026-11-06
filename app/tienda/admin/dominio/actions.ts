// =============================================================================
// PORTALMAKER — Server Actions para Gestión Automática de Dominio Propio
//
// Seguridad: las Server Actions son endpoints HTTP públicos (cualquiera que
// conozca el action ID puede invocarlas), así que cada acción revalida en el
// servidor sesión, permisos sobre la tienda y plan, y nunca confía en datos
// enviados por el cliente para decidir qué dominio borrar de Vercel.
// =============================================================================

'use server'

import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'
import { isFeatureAllowed } from '@/lib/plans'
import {
  addDomainToVercel,
  removeDomainFromVercel,
  checkDomainStatusInVercel,
} from '@/lib/vercel-domains'

// Dominios de la plataforma que jamás pueden vincularse ni desvincularse como
// "dominio propio": borrarlos del proyecto de Vercel tiraría el portal entero.
const RESERVED_DOMAIN_SUFFIXES = Array.from(
  new Set(
    [
      'portalmaker.com.ar',
      'portalmaker.ar',
      'vercel.app',
      (process.env.NEXT_PUBLIC_PORTAL_DOMAIN || '').split(':')[0].toLowerCase(),
    ].filter(Boolean)
  )
)

// Hostname público razonable: etiquetas alfanuméricas con guiones internos y TLD alfabético.
const DOMAIN_REGEX = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/

function normalizeDomain(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')
}

function isReservedDomain(domain: string): boolean {
  return RESERVED_DOMAIN_SUFFIXES.some((base) => domain === base || domain.endsWith(`.${base}`))
}

/**
 * Exige sesión y permisos de administración sobre la tienda.
 * Devuelve la tienda leída desde la base (fuente de verdad del dominio actual).
 */
async function requireDomainManager(storeId: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    throw new Error('Debes iniciar sesión para gestionar el dominio.')
  }

  const auth = await verifyStoreAccess(user.email, storeId, {
    allowCollaborators: true,
    requiredCollaboratorRoles: ['admin'],
  })

  if (!auth.authorized || !auth.store) {
    throw new Error('No tienes permisos para gestionar el dominio de esta tienda.')
  }

  return auth
}

export async function saveCustomDomainAction(storeId: string, rawDomain: string) {
  const auth = await requireDomainManager(storeId)
  const store = auth.store!

  // El plan se valida en el servidor: el bloqueo visual del panel no alcanza.
  if (!auth.isSuperadmin && !isFeatureAllowed(store, 'dominio_propio')) {
    throw new Error('Tu plan actual no incluye dominio propio.')
  }

  const cleanDomain = normalizeDomain(rawDomain)

  if (!DOMAIN_REGEX.test(cleanDomain)) {
    throw new Error('Ingresa un dominio válido, por ejemplo: mitienda.com.ar')
  }

  if (isReservedDomain(cleanDomain)) {
    throw new Error('Ese dominio pertenece a la plataforma y no puede vincularse como dominio propio.')
  }

  const supabaseAdmin = createSupabaseAdminClient()

  // Un dominio solo puede apuntar a una tienda; si no, el middleware resolvería
  // el tenant de forma ambigua y una tienda podría "robar" el tráfico de otra.
  const { data: owner } = await supabaseAdmin
    .from('stores')
    .select('id')
    // getTenantStore resuelve tanto el apex como la variante www, así que se comparan ambas.
    .in('custom_domain', [cleanDomain, `www.${cleanDomain}`])
    .neq('id', store.id)
    .limit(1)
    .maybeSingle()

  if (owner) {
    throw new Error('Ese dominio ya está vinculado a otra tienda.')
  }

  const previousDomain = store.custom_domain ? normalizeDomain(store.custom_domain) : null

  // Se usa service_role tras autorizar; el trigger de protección deja pasar a
  // service_role sin resetear la verificación, por eso se fuerza aquí a false.
  const { error: dbError } = await supabaseAdmin
    .from('stores')
    .update({
      custom_domain: cleanDomain,
      custom_domain_verified: previousDomain === cleanDomain ? store.custom_domain_verified : false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', store.id)

  if (dbError) throw new Error('No se pudo guardar el dominio.')

  // Solo se desvincula de Vercel el dominio anterior leído de la base, nunca uno enviado por el cliente.
  if (previousDomain && previousDomain !== cleanDomain && !isReservedDomain(previousDomain)) {
    await removeDomainFromVercel(previousDomain)
  }

  const vercelResult = await addDomainToVercel(cleanDomain)

  return {
    success: true,
    domain: cleanDomain,
    vercelResult,
  }
}

/**
 * No recibe el dominio desde el cliente a propósito: se toma siempre de la base
 * de datos para que nadie pueda pedir que se borre de Vercel un dominio ajeno.
 */
export async function removeCustomDomainAction(storeId: string) {
  const auth = await requireDomainManager(storeId)
  const store = auth.store!
  const currentDomain = store.custom_domain ? normalizeDomain(store.custom_domain) : null

  const supabaseAdmin = createSupabaseAdminClient()
  const { error: dbError } = await supabaseAdmin
    .from('stores')
    .update({
      custom_domain: null,
      custom_domain_verified: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', store.id)

  if (dbError) throw new Error('No se pudo desvincular el dominio.')

  if (currentDomain && !isReservedDomain(currentDomain)) {
    await removeDomainFromVercel(currentDomain)
  }

  return { success: true }
}

export async function checkCustomDomainAction(domain: string) {
  if (!domain) return { configured: false, verified: false, misconfigured: false }

  // Evita que cualquiera use nuestro token de Vercel como servicio de consulta DNS.
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { configured: false, verified: false, misconfigured: false }

  return await checkDomainStatusInVercel(normalizeDomain(domain))
}
