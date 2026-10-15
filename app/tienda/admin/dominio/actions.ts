// =============================================================================
// PORTALMAKER — Server Actions para Gestión Automática de Dominio Propio
// =============================================================================

'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  addDomainToVercel,
  removeDomainFromVercel,
  checkDomainStatusInVercel,
} from '@/lib/vercel-domains'

export async function saveCustomDomainAction(storeId: string, rawDomain: string) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    throw new Error('Debes iniciar sesión para vincular un dominio.')
  }

  // Verificar que el usuario tenga acceso a esta tienda
  const { data: store } = await supabase
    .from('stores')
    .select('id, admin_email, custom_domain')
    .eq('id', storeId)
    .single()

  if (!store) {
    throw new Error('Tienda no encontrada.')
  }

  const cleanDomain = rawDomain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')

  // 1. Si tenía un dominio anterior diferente, desvincularlo de Vercel primero
  if (store.custom_domain && store.custom_domain !== cleanDomain) {
    await removeDomainFromVercel(store.custom_domain)
  }

  // 2. Guardar en Supabase
  const { error: dbError } = await supabase
    .from('stores')
    .update({ custom_domain: cleanDomain })
    .eq('id', storeId)

  if (dbError) throw dbError

  // 3. Dar de alta en Vercel automáticamente
  const vercelResult = await addDomainToVercel(cleanDomain)

  return {
    success: true,
    domain: cleanDomain,
    vercelResult,
  }
}

export async function removeCustomDomainAction(storeId: string, currentDomain: string) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    throw new Error('No autorizado.')
  }

  // 1. Borrar en Supabase
  const { error: dbError } = await supabase
    .from('stores')
    .update({ custom_domain: null })
    .eq('id', storeId)

  if (dbError) throw dbError

  // 2. Borrar en Vercel
  if (currentDomain) {
    await removeDomainFromVercel(currentDomain)
  }

  return { success: true }
}

export async function checkCustomDomainAction(domain: string) {
  if (!domain) return { configured: false, verified: false, misconfigured: false }
  return await checkDomainStatusInVercel(domain)
}
