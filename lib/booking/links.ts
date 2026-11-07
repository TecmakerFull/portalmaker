// =============================================================================
// PORTALMAKER — Origen público de una tienda (para enlaces en emails)
// Cuando el aviso sale desde un webhook o una tarea programada no hay request
// del cliente del cual tomar el dominio, así que se arma con los datos de la tienda.
// =============================================================================

import type { Store } from '@/types/database'

export function getStorePublicOrigin(store: Pick<Store, 'slug' | 'custom_domain' | 'custom_domain_verified'>): string {
  if (store.custom_domain && store.custom_domain_verified) {
    const dominio = store.custom_domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    return `https://${dominio.startsWith('www.') ? dominio : `www.${dominio}`}`
  }
  const base = (process.env.NEXT_PUBLIC_PORTAL_DOMAIN || 'portalmaker.ar').split(':')[0]
  return `https://${store.slug}.${base}`
}
