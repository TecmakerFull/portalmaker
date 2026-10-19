// =============================================================================
// PORTALMAKER — Callback de autenticación de Supabase (OAuth, Magic Link, Recovery)
// "El portal del Maker" | portalmaker.com.ar
//
// Maneja 3 tipos de usuarios y flujos con separación absoluta:
//   1. Superadmin (plataforma) -> /dashboard/admin
//   2. Dueño o Colaborador de tienda -> /tienda/admin
//   3. Cliente de tienda (Magic Link / Recovery) -> /tienda/cuenta en el dominio de la tienda
// =============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const origin = requestUrl.origin
  const storeOrigin = requestUrl.searchParams.get('store_origin')

  const normalizeHost = (h: string) => h.replace(/^www\./, '').toLowerCase()
  const currentHostNorm = normalizeHost(requestUrl.host)

  // Detectar si el dominio actual es de una tienda propia (no es portalmaker)
  const isStoreDomain =
    !currentHostNorm.includes('portalmaker.ar') &&
    !currentHostNorm.includes('portalmaker.com.ar') &&
    !currentHostNorm.includes('localhost') &&
    !currentHostNorm.includes('127.0.0.1') &&
    !currentHostNorm.endsWith('.vercel.app')

  // A. Puente Multi-Tenant para dominios propios (ej: armoniashop.com.ar)
  // Si la autenticación se originó en una tienda con dominio propio y Supabase
  // redirigió a portalmaker.ar, reenviamos el código a la tienda para que
  // establezca la sesión en las cookies de su propio dominio.
  if (storeOrigin && (code || token_hash)) {
    try {
      const targetOriginUrl = new URL(storeOrigin)
      const targetHostNorm = normalizeHost(targetOriginUrl.host)

      // Si el origen actual no coincide con el dominio destino de la tienda, transferir
      if (targetHostNorm !== currentHostNorm) {
        const forwardUrl = new URL('/auth/callback', storeOrigin)
        requestUrl.searchParams.forEach((val, key) => {
          forwardUrl.searchParams.set(key, val)
        })
        return NextResponse.redirect(forwardUrl)
      }
    } catch (e) {
      console.warn('Error al parsear store_origin:', e)
    }
  }

  if (code || (token_hash && type)) {
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

    // Intercambiar code o verificar OTP por la sesión de usuario
    let authError = null

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      authError = error
    } else if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({ token_hash, type })
      authError = error
    }

    if (!authError) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const nextParam = requestUrl.searchParams.get('next')

      // 1. Destino por defecto según contexto de dominio
      let targetUrl = nextParam
        ? nextParam.startsWith('http')
          ? nextParam
          : `${origin}${nextParam}`
        : isStoreDomain
          ? `${origin}/tienda/cuenta`
          : `${origin}/dashboard/maker`

      // 2. Si estamos en el portal central y no se especificó ?next=..., enrutar inteligentemente por rol
      if (!isStoreDomain && user?.email && !nextParam) {
        const userEmail = user.email.trim().toLowerCase()

        // A. Verificar si es Superadmin de Portalmaker
        const { data: platformAdmin } = await supabase
          .from('platform_admins')
          .select('id')
          .ilike('email', userEmail)
          .maybeSingle()

        if (platformAdmin) {
          targetUrl = `${origin}/dashboard/admin`
        } else {
          // B. Verificar si es dueño de alguna tienda
          const { data: stores } = await supabase
            .from('stores')
            .select('slug, custom_domain')
            .ilike('admin_email', userEmail)
            .order('created_at', { ascending: false })

          if (stores && stores.length === 1) {
            targetUrl = `${origin}/tienda/admin?tenant=${stores[0].slug}`
          } else if (stores && stores.length > 1) {
            targetUrl = `${origin}/dashboard/maker`
          } else {
            // C. Verificar si es colaborador activo de alguna tienda
            const { data: collabs } = await supabase
              .from('store_collaborators')
              .select('store_id, store:stores(slug, custom_domain)')
              .eq('email', user.email)
              .eq('estado', 'activo')

            if (collabs && collabs.length > 0) {
              const collabStore = collabs[0].store as any
              if (collabStore?.slug) {
                targetUrl = `${origin}/tienda/admin?tenant=${collabStore.slug}`
              } else {
                targetUrl = `${origin}/dashboard/maker`
              }
            } else {
              // D. Usuario nuevo sin tienda ni colaboraciones -> Crear tienda
              targetUrl = `${origin}/dashboard/maker`
            }
          }
        }
      }

      // Redirigir al destino preservando todas las cookies de sesión
      const response = NextResponse.redirect(targetUrl)
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })
      return response
    }
  }

  // Si falló el intercambio, volver a la pantalla adecuada según el dominio
  const errorTarget = isStoreDomain ? `${origin}/tienda/cuenta?error=auth_error` : `${origin}/login?error=auth_error`
  return NextResponse.redirect(errorTarget)
}
