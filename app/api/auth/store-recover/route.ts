import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { getTrustedRedirectUrl } from '@/lib/safe-redirect'
import { PORTAL_BRANDING, getStoreBrandingBySlug } from '@/lib/store-auth-email'
import { sendRecoveryEmail } from '@/lib/auth-recovery'

// =============================================================================
// PORTALMAKER — Recuperación de Contraseña con Contexto de Tienda
//
// Genera el enlace de recovery con generateLink y lo envía por Resend con la
// identidad de la tienda leída de la base. Así no hace falta reescribir el
// user_metadata de un usuario arbitrario (la versión anterior lo hacía sin
// autenticación y solo encontraba usuarios entre los primeros 50).
// Si Resend no está disponible, cae al email nativo de Supabase.
//
// Seguridad: respuesta siempre genérica (no revela si el email existe),
// redirectTo validado contra orígenes confiables y rate limit por IP y email.
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
      checkRateLimit({ ip: `recover-ip:${ip}`, maxPerIp: 10, windowMs: 10 * 60 * 1000 }),
      checkRateLimit({ ip: `recover-email:${cleanEmail}`, maxPerIp: 3, windowMs: 10 * 60 * 1000 }),
    ])
    if (!ipRate.allowed || !emailRate.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Espera unos minutos antes de intentar nuevamente.' },
        { status: 429 }
      )
    }

    const safeRedirect = await getTrustedRedirectUrl(redirectTo)
    // Sin tienda válida el correo sale con la marca del portal. Siempre se responde igual.
    const store = await getStoreBrandingBySlug(storeSlug)
    await sendRecoveryEmail({ email: cleanEmail, redirectTo: safeRedirect, branding: store ?? PORTAL_BRANDING })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Error en /api/auth/store-recover:', err)
    return NextResponse.json({ error: 'No se pudo procesar la solicitud de recuperación' }, { status: 500 })
  }
}
