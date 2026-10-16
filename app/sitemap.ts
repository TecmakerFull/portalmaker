import type { MetadataRoute } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// =============================================================================
// PORTALMAKER — Generador de Sitemap XML para Google Search Console
// "El portal del Maker" | portalmaker.com.ar
// Genera dinámicamente las URLs indexables del portal y tiendas activas.
// =============================================================================

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://portalmaker.ar'

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terminos`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // Enriquecer el sitemap con las tiendas makers activas
  try {
    const supabase = await createSupabaseServerClient()
    const { data: stores } = await supabase
      .from('stores')
      .select('slug, custom_domain, updated_at')
      .eq('suscripcion_activa', true)

    if (stores && stores.length > 0) {
      const storeRoutes: MetadataRoute.Sitemap = stores.map((store) => ({
        url: store.custom_domain
          ? `https://${store.custom_domain}`
          : `https://${store.slug}.portalmaker.ar`,
        lastModified: store.updated_at ? new Date(store.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      }))
      return [...staticRoutes, ...storeRoutes]
    }
  } catch (err) {
    console.error('Error generando sitemap dinámico:', err)
  }

  return staticRoutes
}
