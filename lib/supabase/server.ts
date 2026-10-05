// =============================================================================
// PORTALMAKER — Cliente de Supabase para Server Components
// "El portal del Maker" | portalmaker.com.ar
//
// Este archivo crea un cliente de Supabase optimizado para su uso en
// Server Components, Server Actions y Route Handlers de Next.js.
//
// Diferencias con el cliente de browser (lib/supabase/client.ts):
//   - Lee las cookies del request para mantener la sesión del usuario
//   - Se crea una instancia nueva por request (no se comparte entre requests)
//   - Usa @supabase/ssr para integrarse correctamente con Next.js App Router
//
// Documentación: https://supabase.com/docs/guides/auth/server-side/nextjs
// =============================================================================

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Crea un cliente de Supabase para usar en Server Components.
 * Maneja automáticamente la lectura y escritura de cookies de sesión.
 *
 * Uso típico:
 *   const supabase = await createSupabaseServerClient()
 *   const { data } = await supabase.from('products').select('*')
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Supabase necesita acceso a las cookies para manejar la sesión del usuario.
        // getAll y setAll son los métodos requeridos por @supabase/ssr v0.5+
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll puede fallar en Server Components de solo lectura (ej: pages).
            // En ese caso el middleware se encarga de refrescar la sesión.
            // Este catch es intencional — no es un error crítico.
          }
        },
      },
    }
  )
}

/**
 * Crea un cliente de Supabase con el service role key.
 * SOLO para operaciones server-side que requieren bypass de RLS,
 * como crear una tienda nueva desde el panel del developer.
 *
 * ⚠️ NUNCA exponer el service role key al cliente del navegador.
 * ⚠️ NUNCA usar este cliente en Client Components o en la tienda pública.
 */
export function createSupabaseAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY no está configurado. ' +
      'Agregar al .env.local y a las variables de entorno de Cloudflare Pages.'
    )
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        // El admin client no necesita cookies — usa el service role directamente
        getAll() { return [] },
        setAll() {},
      },
      auth: {
        // Deshabilitar auto-refresh de sesión (no aplica para el service role)
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
