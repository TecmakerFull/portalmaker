'use client'
// =============================================================================
// PORTALMAKER — Cliente de Supabase para Client Components
// "El portal del Maker" | portalmaker.com.ar
//
// Este archivo crea un cliente de Supabase para usar en Client Components
// (componentes con 'use client' en React).
//
// A diferencia del cliente de servidor (lib/supabase/server.ts), este cliente:
//   - Vive en el navegador del usuario
//   - Maneja cookies de sesión automáticamente via @supabase/ssr
//   - Se crea una sola vez por renderizado de componente
//   - Solo tiene acceso a las ANON key (nunca el service role)
//
// Uso típico:
//   import { createSupabaseBrowserClient } from '@/lib/supabase/client'
//   const supabase = createSupabaseBrowserClient()
//   const { data } = await supabase.from('products').select('*')
// =============================================================================

import { createBrowserClient } from '@supabase/ssr'

/**
 * Crea un cliente de Supabase para Client Components.
 * Maneja automáticamente la sesión del usuario via cookies del navegador.
 */
export function createSupabaseBrowserClient() {
  let cookieDomain: string | undefined = undefined
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase()
    if (hostname.endsWith('portalmaker.ar')) {
      cookieDomain = '.portalmaker.ar'
    } else if (hostname.endsWith('portalmaker.com.ar')) {
      cookieDomain = '.portalmaker.com.ar'
    }
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: 60 * 60 * 24 * 365, // 1 año persistente en el dispositivo del cliente
        sameSite: 'lax',
        path: '/',
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      },
    }
  )
}

/**
 * Cierra la sesión y borra TODAS las variantes de la cookie de sesión.
 *
 * signOut() solo borra la cookie con los atributos actuales (dominio compartido
 * `.portalmaker.ar`). Si en el navegador quedó otra con el mismo nombre solo para el
 * host (de enlaces de ingreso anteriores a la corrección), esa sigue viva: la sesión
 * "revive" y el botón de cerrar sesión parece no hacer nada. Acá se vencen las dos.
 */
export async function cerrarSesionCompleta(): Promise<void> {
  const supabase = createSupabaseBrowserClient()
  try {
    await supabase.auth.signOut()
  } catch {
    // Aun si falla la red, se limpian las cookies locales
  }
  if (typeof document === 'undefined') return
  const host = window.location.hostname.toLowerCase()
  const dominios: Array<string | undefined> = [undefined, host, `.${host}`]
  if (host.endsWith('portalmaker.ar')) dominios.push('.portalmaker.ar')
  if (host.endsWith('portalmaker.com.ar')) dominios.push('.portalmaker.com.ar')

  const nombres = document.cookie
    .split(';')
    .map((c) => c.trim().split('=')[0])
    .filter((n) => n.startsWith('sb-') && n.includes('auth-token'))
  for (const nombre of nombres) {
    for (const dominio of dominios) {
      document.cookie = `${nombre}=; Path=/; Max-Age=0; SameSite=Lax${dominio ? `; Domain=${dominio}` : ''}`
    }
  }
}
