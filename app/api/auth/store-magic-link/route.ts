import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { getTrustedRedirectUrl } from '@/lib/safe-redirect'
import { buildStoreAuthEmail, getStoreBrandingBySlug, sendStoreAuthEmail } from '@/lib/store-auth-email'

// =============================================================================
// PORTALMAKER — Magic Link Personalizado con Identidad de Tienda
// Genera un enlace oficial de Supabase Auth y envía un correo con el nombre,
// logo y colores de la tienda vía Resend para que el cliente no reciba correos
// genéricos a nombre de Portalmaker.
//
// Seguridad: endpoint público. La identidad de la tienda sale de la base (no
// del cliente), el redirectTo se valida contra orígenes confiables y hay rate
// limit por IP y por email para que no sirva como relay de spam o phishing.
// Ante cualquier problema responde useFallbackOtp para que el cliente use el
// OTP nativo de Supabase, que tiene sus propios límites.
// =============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  try {
    const { email, storeSlug, redirectTo } = await req.json()

    const cleanEmail = String(email || '').trim().toLowerCase()
    if (!cleanEmail || cleanEmail.length > 150 || !EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json({ error: 'Ingresa un correo electrónico válido' }, { status: 400 })
    }

    const ip = getClientIp(req)
    const [ipRate, emailRate] = await Promise.all([
      checkRateLimit({ ip: `magic-ip:${ip}`, maxPerIp: 10, windowMs: 10 * 60 * 1000 }),
      checkRateLimit({ ip: `magic-email:${cleanEmail}`, maxPerIp: 3, windowMs: 10 * 60 * 1000 }),
    ])
    if (!ipRate.allowed || !emailRate.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Espera unos minutos antes de pedir otro enlace.' },
        { status: 429 }
      )
    }

    const store = await getStoreBrandingBySlug(storeSlug)
    if (!store) {
      return NextResponse.json({ useFallbackOtp: true }, { status: 200 })
    }

    const safeRedirect = await getTrustedRedirectUrl(redirectTo)

    const supabaseAdmin = createSupabaseAdminClient()
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: cleanEmail,
      options: {
        redirectTo: safeRedirect,
        data: { store_name: store.nombre, store_slug: store.slug },
      },
    })

    if (linkErr || !linkData?.properties?.action_link) {
      return NextResponse.json({ useFallbackOtp: true }, { status: 200 })
    }

    // El action_link de Supabase entrega la sesión en el fragmento (#access_token),
    // que el servidor no puede leer: /auth/callback no recibía nada y mandaba al
    // cliente a una página inexistente. Con el hashed_token armamos un enlace que
    // vuelve a /auth/callback con token_hash, que sí se verifica en el servidor.
    // El redirectTo ya fue validado como origen confiable (y trae next y store_origin).
    let actionLink = linkData.properties.action_link
    const hashedToken = linkData.properties.hashed_token
    if (safeRedirect && hashedToken) {
      try {
        const directo = new URL(safeRedirect)
        directo.searchParams.set('token_hash', hashedToken)
        directo.searchParams.set('type', 'magiclink')
        actionLink = directo.toString()
      } catch {
        // redirectTo malformado: se usa el enlace estándar de Supabase
      }
    }

    const message = buildStoreAuthEmail({
      store,
      actionLink,
      kind: 'magiclink',
    })
    const sent = await sendStoreAuthEmail({ to: cleanEmail, ...message })

    if (!sent) {
      return NextResponse.json({ useFallbackOtp: true }, { status: 200 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Error en /api/auth/store-magic-link:', err)
    return NextResponse.json({ useFallbackOtp: true }, { status: 200 })
  }
}
