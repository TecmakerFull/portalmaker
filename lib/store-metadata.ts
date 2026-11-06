// =============================================================================
// PORTALMAKER — Metadatos para compartir de cada tienda (Open Graph / Twitter)
//
// Por qué existe: WhatsApp, Facebook, X y Telegram arman la vista previa de un
// enlace con las etiquetas og:* y twitter:*, no con <title>. Si la tienda no
// las define, Next hereda las del layout raíz (las del portal) y cualquier
// enlace a una tienda se ve como "Portalmaker". Este helper calcula la URL
// pública real y la mejor imagen disponible de la tienda.
// =============================================================================

import { headers } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Store } from '@/types/database'

/**
 * Origen público con el que se está viendo la tienda (dominio propio o
 * subdominio). Se usa como metadataBase para que og:url, canonical e imágenes
 * relativas apunten a la tienda y no a portalmaker.ar.
 */
export async function getRequestOrigin(): Promise<string> {
  const h = await headers()
  const rawHost = (h.get('x-forwarded-host') || h.get('host') || '').split(',')[0].trim().toLowerCase()
  const host = /^[a-z0-9.-]+(:\d+)?$/.test(rawHost) ? rawHost : ''

  if (!host) return process.env.NEXT_PUBLIC_APP_URL || 'https://portalmaker.ar'

  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1')
  return `${isLocal ? 'http' : 'https'}://${host}`
}

/**
 * Imagen para la vista previa, en orden de preferencia:
 * 1. Primer banner activo (imagen ancha, ideal para tarjetas grandes)
 * 2. Banner de portada legado (hero_banner_url)
 * 3. Logo de la tienda
 */
export async function getStoreShareImage(store: Store): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: banner } = await supabase
      .from('banners')
      .select('imagen_url')
      .eq('store_id', store.id)
      .eq('activo', true)
      .order('orden', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (banner?.imagen_url) return banner.imagen_url
  } catch {
    // Si falla la consulta, se sigue con las imágenes de la propia tienda.
  }

  return store.hero_banner_url || store.logo_url || null
}

/** Título por defecto de la tienda: el que cargó el dueño para SEO, o nombre + slogan. */
export function getStoreDefaultTitle(store: Store): string {
  return store.meta_title || `${store.nombre}${store.slogan ? ` — ${store.slogan}` : ''}`
}

/**
 * Descripción por defecto de la tienda. Sin meta_description, se arma una frase
 * en vez de repetir solo el slogan (que ya aparece en el título de la vista previa).
 */
export function getStoreDefaultDescription(store: Store): string {
  if (store.meta_description) return store.meta_description
  return store.slogan
    ? `${store.slogan}. Conocé el catálogo de ${store.nombre} y hacé tu pedido online.`
    : `Conocé el catálogo de ${store.nombre} y hacé tu pedido online.`
}
