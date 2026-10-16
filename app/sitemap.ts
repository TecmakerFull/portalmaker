import type { MetadataRoute } from 'next'

// =============================================================================
// PORTALMAKER — Generador de Sitemap XML para Google Search Console
// "El portal del Maker" | portalmaker.com.ar
// Contiene exclusivamente las URLs pertenecientes a portalmaker.ar cumpliendo
// con la directiva estricta de Google (no incluir dominios externos cruzados).
// =============================================================================

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://portalmaker.ar'

  return [
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
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terminos`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ]
}
