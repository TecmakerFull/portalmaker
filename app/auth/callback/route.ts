// =============================================================================
// PORTALMAKER — Callback de autenticación de Supabase (Google OAuth)
// "El portal del Maker" | portalmaker.com.ar
//
// Esta ruta maneja el callback de Google OAuth de Supabase.
// Flujo:
//   1. El usuario hace click en "Ingresar con Google" en el portal
//   2. Google redirige a esta ruta con un ?code=...
//   3. Esta ruta intercambia el code por una sesión de Supabase
//   4. Redirige al dashboard según el rol del usuario:
//      - Si es platform_admin → /dashboard/admin
//      - Si es admin de una tienda → /dashboard/maker
//      - Si no tiene rol → / (portal)
//
// IMPORTANTE: esta URL debe estar registrada en:
//   - Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
//   - Google Cloud Console → OAuth 2.0 → Authorized redirect URIs
// =============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    // Crear el Supabase client para el Route Handler
    // (similar al server client, pero con acceso directo a las cookies del response)
    const response = NextResponse.redirect(`${origin}/dashboard/maker`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Intercambiar el code por una sesión de usuario
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Obtener el email del usuario para determinar su rol
      const { data: { user } } = await supabase.auth.getUser()

      if (user?.email) {
        // Verificar si es platform_admin
        const { data: platformAdmin } = await supabase
          .from('platform_admins')
          .select('id')
          .eq('email', user.email)
          .single()

        if (platformAdmin) {
          // Es el developer/superadmin → panel de plataforma
          return NextResponse.redirect(`${origin}/dashboard/admin`)
        }

        // Verificar si es admin de una tienda
        const { data: store } = await supabase
          .from('stores')
          .select('id, slug')
          .eq('admin_email', user.email)
          .single()

        if (store) {
          // Es maker (dueño de tienda) → panel personal
          return NextResponse.redirect(`${origin}/dashboard/maker`)
        }

        // El email no está registrado como admin ni como maker
        // Redirigir al portal con un mensaje de error
        return NextResponse.redirect(`${origin}/?error=acceso_no_autorizado`)
      }
    }
  }

  // Si algo salió mal (no hay code, o falló el intercambio), volver al portal
  return NextResponse.redirect(`${origin}/?error=auth_error`)
}
