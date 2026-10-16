import type { MetadataRoute } from 'next'

// =============================================================================
// PORTALMAKER — robots.txt para Google y Motores de Búsqueda
// "El portal del Maker" | portalmaker.com.ar
// Permite indexar páginas públicas y protege rutas privadas administrativas.
// =============================================================================

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/tienda/admin/',
          '/api/',
          '/auth/callback',
        ],
      },
    ],
    sitemap: 'https://portalmaker.ar/sitemap.xml',
  }
}
