// =============================================================================
// PORTALMAKER — Callback de autenticación de Supabase (Google OAuth)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const next = requestUrl.searchParams.get('next') || '/dashboard/maker'

  if (code) {
    const cookiesToSet: { name: string; value: string; options: Parameters<typeof NextResponse.prototype.cookies.set>[2] }[] = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookies) {
            cookies.forEach(({ name, value, options }) => {
              cookiesToSet.push({ name, value, options })
            })
          },
        },
      }
    )

    // Intercambiar el code por la sesión de usuario
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const nextParam = requestUrl.searchParams.get('next')
      let targetUrl = nextParam ? `${origin}${nextParam}` : `${origin}/dashboard/maker`

      if (user?.email && !nextParam) {
        // 1. Verificar si es Superadmin de Portalmaker
        const { data: platformAdmin } = await supabase
          .from('platform_admins')
          .select('id')
          .eq('email', user.email)
          .single()

        if (platformAdmin || user.email === 'temperini@gmail.com') {
          targetUrl = `${origin}/dashboard/admin`
        } else {
          // 2. Verificar si ya tiene tienda asignada
          const { data: stores } = await supabase
            .from('stores')
            .select('slug')
            .eq('admin_email', user.email)
            .order('created_at', { ascending: false })

          if (stores && stores.length === 1) {
            // Entrar directo al panel de administración de su tienda
            targetUrl = `${origin}/tienda/admin?tenant=${stores[0].slug}`
          } else if (stores && stores.length > 1) {
            targetUrl = `${origin}/dashboard/maker`
          } else {
            // Usuario nuevo sin tienda -> Pantalla para crear su tienda
            targetUrl = `${origin}/dashboard/maker`
          }
        }
      }

      // Redirigir al dashboard preservando todas las cookies de sesión
      const response = NextResponse.redirect(targetUrl)
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })
      return response
    }
  }

  // Si falló el intercambio, volver al login
  return NextResponse.redirect(`${origin}/login?error=auth_error`)
}

