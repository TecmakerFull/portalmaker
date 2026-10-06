// =============================================================================
// PORTALMAKER — Middleware de enrutamiento multi-tenant
// "El portal del Maker" | portalmaker.com.ar
//
// Detecta de forma inteligente si la petición corresponde a:
//   1. Portal principal (portalmaker.com.ar, portalmaker.vercel.app, localhost)
//   2. Tienda simulada por parámetro (?tenant=slug)
//   3. Tienda por subdominio (ej: tecmaker.portalmaker.com.ar)
//   4. Tienda por dominio propio (ej: mitaller3d.com.ar)
// =============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PORTAL_DOMAIN = (process.env.NEXT_PUBLIC_PORTAL_DOMAIN ?? 'portalmaker.com.ar').split(':')[0].toLowerCase()

// Dominios base reconocidos del portal principal
const BASE_PORTAL_DOMAINS = Array.from(
  new Set([
    PORTAL_DOMAIN,
    'portalmaker.com.ar',
    'portalmaker.ar',
  ].filter(Boolean))
)

export function middleware(request: NextRequest) {
  const { nextUrl, headers } = request

  // Host actual sin puerto (ej: "portalmaker.vercel.app", "localhost", "tecmaker3d.portalmaker.ar")
  const hostHeader = headers.get('host') ?? ''
  const host = hostHeader.split(':')[0].toLowerCase()

  // Flags de entorno
  const isLocalhost = host === 'localhost' || host === '127.0.0.1'
  const isVercelDomain = host.endsWith('.vercel.app')
  const isBasePortalDomain = BASE_PORTAL_DOMAINS.some(
    (base) => host === base || host === `www.${base}`
  )

  // Interceptar callbacks de OAuth que lleguen a la raíz u otra ruta con ?code=...
  if (nextUrl.searchParams.has('code') && !nextUrl.pathname.startsWith('/auth/callback')) {
    const callbackUrl = new URL('/auth/callback', request.url)
    nextUrl.searchParams.forEach((val, key) => {
      callbackUrl.searchParams.set(key, val)
    })
    return NextResponse.redirect(callbackUrl)
  }

  // 1. Simulación de tienda mediante query param (?tenant=slug)
  // Permite probar cualquier tienda en localhost o en Vercel (ej: portalmaker.vercel.app?tenant=tecmaker)
  const tenantParam = nextUrl.searchParams.get('tenant')
  if (tenantParam) {
    const targetPath = nextUrl.pathname.startsWith('/tienda')
      ? nextUrl.pathname
      : `/tienda${nextUrl.pathname}`
    const rewriteUrl = new URL(targetPath, request.url)
    nextUrl.searchParams.forEach((val, key) => {
      rewriteUrl.searchParams.set(key, val)
    })
    const response = NextResponse.rewrite(rewriteUrl)
    response.headers.set('x-store-slug', tenantParam)
    response.headers.set('x-tenant-source', 'query-param-dev')
    return response
  }

  // 2. Si el host es el portal principal (localhost, dominio de vercel, o el dominio base configurado)
  if (isLocalhost || isVercelDomain || isBasePortalDomain) {
    // Si la ruta ya apunta explícitamente a /tienda
    if (nextUrl.pathname.startsWith('/tienda')) {
      return NextResponse.next()
    }
    // Dejar pasar al portal principal (app/(portal)/...)
    return NextResponse.next()
  }

  // 3. Detección de subdominio en producción (ej: tecmaker3d.portalmaker.ar o tecmaker.portalmaker.com.ar)
  let subdomain: string | null = null
  for (const baseDomain of BASE_PORTAL_DOMAINS) {
    if (host.endsWith(`.${baseDomain}`)) {
      const candidate = host.slice(0, -(baseDomain.length + 1))
      if (candidate && candidate !== 'www') {
        subdomain = candidate
        break
      }
    }
  }

  // Reescribir internamente a la ruta de la tienda sin duplicar /tienda
  const targetPath = nextUrl.pathname.startsWith('/tienda')
    ? nextUrl.pathname
    : `/tienda${nextUrl.pathname}`
  const rewriteUrl = new URL(targetPath, request.url)
  nextUrl.searchParams.forEach((val, key) => {
    rewriteUrl.searchParams.set(key, val)
  })

  const response = NextResponse.rewrite(rewriteUrl)

  if (subdomain) {
    response.headers.set('x-store-slug', subdomain)
    response.headers.set('x-tenant-source', 'subdomain')
  } else {
    // 4. Dominio propio del maker (ej: tecmaker3d.com.ar)
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
