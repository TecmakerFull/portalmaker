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
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
