// =============================================================================
// PORTALMAKER — Middleware de enrutamiento multi-tenant
// "El portal del Maker" | portalmaker.com.ar
//
// Este archivo es el corazón del sistema multi-tenant.
// Se ejecuta en el Edge de Cloudflare en CADA request antes de renderizar
// cualquier página, para decidir si la request pertenece al:
//
//   MUNDO 1: Portal (portalmaker.com.ar)
//     → Páginas de marketing, login, dashboards por rol
//     → No necesita resolver ningún tenant
//
//   MUNDO 2: Tienda individual ([slug].portalmaker.com.ar o dominio propio)
//     → Catálogo público del maker + /admin de su tienda
//     → Se inyecta el slug o dominio en un header para que los Server
//       Components downstream consulten la BD y resuelvan el store_id
//
// IMPORTANTE — ¿Por qué NO resolvemos el store_id aquí?
//   El middleware corre en el Edge y debe ser lo más liviano posible.
//   Una query a Supabase aquí agregaría latencia a todos los requests.
//   En cambio, inyectamos el identificador del tenant en un header,
//   y el primer Server Component que lo necesita hace la query a la BD.
//
// Runtime: Edge (requerido por @cloudflare/next-on-pages)
// =============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Dominio del portal — proviene de la variable de entorno configurada en Cloudflare Pages.
// Si no está definida (ej. en tests), usa el dominio de producción por defecto.
const PORTAL_DOMAIN = process.env.NEXT_PUBLIC_PORTAL_DOMAIN ?? 'portalmaker.com.ar'

export function middleware(request: NextRequest) {
  const { nextUrl, headers } = request

  // Obtener el host del request, removiendo el puerto si existe
  // (en desarrollo local puede ser "localhost:3000")
  const hostHeader = headers.get('host') ?? ''
  const host = hostHeader.split(':')[0] // elimina el puerto, queda solo el hostname

  // ============================================================
  // DETECCIÓN DEL ENTORNO
  // ============================================================

  const isLocalhost = host === 'localhost' || host === '127.0.0.1'
  const isPortal = host === PORTAL_DOMAIN || host === `www.${PORTAL_DOMAIN}` || isLocalhost

  // ============================================================
  // MUNDO 1: PORTAL (portalmaker.com.ar)
  // No hacemos nada — Next.js rutea normalmente al route group (portal).
  // El middleware de autenticación de Supabase se encarga del login/logout.
  // ============================================================

  if (isPortal) {
    // En desarrollo local, podemos simular una tienda con ?tenant=slug
    // para no necesitar configurar subdominio local.
    // Ejemplo: http://localhost:3000?tenant=tecmaker
    const tenantParam = nextUrl.searchParams.get('tenant')
    if (tenantParam && isLocalhost) {
      // Modo desarrollo: simular una tienda via query param
      const response = NextResponse.next()
      response.headers.set('x-store-slug', tenantParam)
      response.headers.set('x-tenant-source', 'query-param-dev')
      return response
    }

    // Portal normal — dejar pasar sin modificar
    return NextResponse.next()
  }

  // ============================================================
  // MUNDO 2: TIENDA INDIVIDUAL
  // Detectar si el host es un subdominio de portalmaker.com.ar
  // o un dominio personalizado del maker.
  // ============================================================

  const subdomain = host.endsWith(`.${PORTAL_DOMAIN}`)
    ? host.slice(0, -(`.${PORTAL_DOMAIN}`.length))  // "tecmaker.portalmaker.com.ar" → "tecmaker"
    : null

  const response = NextResponse.next()

  if (subdomain) {
    // Tienda identificada por subdominio
    // Ejemplos: tecmaker.portalmaker.com.ar, laserlab.portalmaker.com.ar
    response.headers.set('x-store-slug', subdomain)
    response.headers.set('x-tenant-source', 'subdomain')
  } else {
    // Tienda identificada por dominio propio (custom domain del maker)
    // Ejemplo: tecmaker3d.com.ar → el Server Component busca en stores.custom_domain
    response.headers.set('x-store-domain', host)
    response.headers.set('x-tenant-source', 'custom-domain')
  }

  return response
}

// =============================================================================
// CONFIGURACIÓN DEL MATCHER
// Define qué rutas pasan por el middleware.
// Excluimos archivos estáticos, assets y la ruta de callback de autenticación
// para no agregar latencia innecesaria.
// =============================================================================
export const config = {
  matcher: [
    /*
     * Aplica el middleware a todas las rutas EXCEPTO:
     * - _next/static  (archivos estáticos de Next.js)
     * - _next/image   (optimización de imágenes)
     * - favicon.ico   (favicon del navegador)
     * - Archivos con extensión (imágenes, fuentes, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)',
  ],
}
