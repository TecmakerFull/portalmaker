// =============================================================================
// PORTALMAKER — Helper para resolución de URLs internas y externas del Storefront
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

/**
 * Resuelve y normaliza cualquier URL o slug ingresado en banners, menús o barras de anuncios,
 * garantizando que las rutas internas de la tienda apunten siempre a su destino correcto
 * (/tienda/productos/[slug], /tienda/contacto, etc.) preservando tenantQuery.
 *
 * Casos soportados:
 * - URLs externas (http:// o https://) -> se mantienen intactas.
 * - Anclas (#catalogo, etc.) -> se mantienen intactas.
 * - Rutas completas de tienda (/tienda/productos/..., /tienda/contacto) -> se adjunta tenantQuery.
 * - Rutas relativas estándar (/contacto, /sobre-nosotros, /ayuda, /checkout) -> se prefijan con /tienda.
 * - Rutas de productos (/productos/[slug], producto/[slug]) -> se convierten a /tienda/productos/[slug].
 * - Slugs sueltos de producto ("negro-azabache", "/negro-azabache") -> se convierten a /tienda/productos/[slug].
 */
export function resolveStoreUrl(url?: string | null, tenantQuery?: string | null): string {
  if (!url || typeof url !== 'string') {
    return appendTenant('/tienda', tenantQuery)
  }

  const trimmed = url.trim()
  if (!trimmed) {
    return appendTenant('/tienda', tenantQuery)
  }

  // 1. Enlaces externos
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  // 2. Anclas locales
  if (trimmed.startsWith('#')) {
    return trimmed
  }

  // Quitar slash inicial redundante para análisis
  const withoutLeadingSlash = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed

  let targetPath = '/tienda'

  if (withoutLeadingSlash.startsWith('tienda')) {
    targetPath = `/${withoutLeadingSlash}`
  } else if (
    withoutLeadingSlash.startsWith('contacto') ||
    withoutLeadingSlash.startsWith('sobre-nosotros') ||
    withoutLeadingSlash.startsWith('ayuda') ||
    withoutLeadingSlash.startsWith('cuenta') ||
    withoutLeadingSlash.startsWith('favoritos') ||
    withoutLeadingSlash.startsWith('checkout') ||
    withoutLeadingSlash.startsWith('seguimiento') ||
    withoutLeadingSlash.startsWith('legal')
  ) {
    targetPath = `/tienda/${withoutLeadingSlash}`
  } else if (withoutLeadingSlash.startsWith('productos/')) {
    targetPath = `/tienda/${withoutLeadingSlash}`
  } else if (withoutLeadingSlash.startsWith('producto/')) {
    const slug = withoutLeadingSlash.replace(/^producto\//, '')
    targetPath = `/tienda/productos/${slug}`
  } else if (withoutLeadingSlash.startsWith('?')) {
    targetPath = `/tienda${withoutLeadingSlash}`
  } else {
    // Si es un slug directo (ej: "negro-azabache" o "/negro-azabache")
    targetPath = `/tienda/productos/${withoutLeadingSlash}`
  }

  return appendTenant(targetPath, tenantQuery)
}

function appendTenant(path: string, tenantQuery?: string | null): string {
  if (!tenantQuery) return path
  const cleanTenant = tenantQuery.replace(/^\?/, '')
  if (!cleanTenant) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}${cleanTenant}`
}
