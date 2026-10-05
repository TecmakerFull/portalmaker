// =============================================================================
// PORTALMAKER — Middleware de enrutamiento multi-tenant
// "El portal del Maker" | portalmaker.com.ar
//
// Este middleware maneja dos mundos:
//   MUNDO 1: Portal (portalmaker.com.ar / localhost)
//     → Páginas de marketing, login, dashboards por rol
//     → Rutas normales en app/(portal)/...
//
//   MUNDO 2: Tienda individual ([slug].portalmaker.com.ar o dominio propio)
//     → Catálogo público del maker + /admin de su tienda
//     → Reescribe internamente a /tienda/... manteniendo la URL limpia en el browser
// =============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PORTAL_DOMAIN = process.env.NEXT_PUBLIC_PORTAL_DOMAIN ?? 'portalmaker.com.ar'

export function middleware(request: NextRequest) {
  const { nextUrl, headers } = request

  // Obtener hostname sin puerto
  const hostHeader = headers.get('host') ?? ''
  const host = hostHeader.split(':')[0].toLowerCase()

  // Detección de entorno
  const isLocalhost = host === 'localhost' || host === '127.0.0.1'
  const isPortal = host === PORTAL_DOMAIN.split(':')[0] || host === `www.${PORTAL_DOMAIN.split(':')[0]}` || isLocalhost

  // Simulación en desarrollo con ?tenant=slug
  const tenantParam = nextUrl.searchParams.get('tenant')
  if (tenantParam && isLocalhost) {
    const rewriteUrl = new URL(`/tienda${nextUrl.pathname}`, request.url)
    nextUrl.searchParams.forEach((val, key) => {
      rewriteUrl.searchParams.set(key, val)
    })
    const response = NextResponse.rewrite(rewriteUrl)
    response.headers.set('x-store-slug', tenantParam)
    response.headers.set('x-tenant-source', 'query-param-dev')
    return response
  }

  // Si es el portal principal (y no es subdominio)
  if (isPortal && !host.endsWith(`.${PORTAL_DOMAIN.split(':')[0]}`)) {
    return NextResponse.next()
  }

  // Detección de subdominio o dominio propio
  const baseDomain = PORTAL_DOMAIN.split(':')[0]
  const isSubdomain = host.endsWith(`.${baseDomain}`)
  const subdomain = isSubdomain ? host.slice(0, -(baseDomain.length + 1)) : null

  // Reescribir internamente a la ruta de la tienda
  const rewriteUrl = new URL(`/tienda${nextUrl.pathname}`, request.url)
  nextUrl.searchParams.forEach((val, key) => {
    rewriteUrl.searchParams.set(key, val)
  })

  const response = NextResponse.rewrite(rewriteUrl)

  if (subdomain) {
    response.headers.set('x-store-slug', subdomain)
    response.headers.set('x-tenant-source', 'subdomain')
  } else {
    response.headers.set('x-store-domain', host)
    response.headers.set('x-tenant-source', 'custom-domain')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Aplica el middleware a todas las rutas EXCEPTO:
     * - _next/static, _next/image, favicon.ico, auth/callback
     * - Archivos estáticos con extensión
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)',
  ],
}
