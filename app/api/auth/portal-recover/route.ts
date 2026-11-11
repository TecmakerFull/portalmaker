import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { getTrustedRedirectUrl } from '@/lib/safe-redirect'
import { PORTAL_BRANDING } from '@/lib/store-auth-email'
import { sendRecoveryEmail } from '@/lib/auth-recovery'

// =============================================================================
// PORTALMAKER — Recuperación de contraseña desde el login del portal
// (también es el acceso al panel de cada tienda).
//
// Antes el navegador le pedía el enlace directo a Supabase, sin límite propio. Ahora
// pasa por acá: límite por IP y por correo, redirectTo validado contra orígenes
// confiables y respuesta siempre genérica (no revela si el correo existe).
// =============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  try {
    const { email, redirectTo } = await req.json()

    const cleanEmail = String(email || '').trim().toLowerCase()
    if (!cleanEmail || cleanEmail.length > 150 || !EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json({ error: 'Ingresa un correo electrónico válido' }, { status: 400 })
    }

    const ip = getClientIp(req)
    const [ipRate, emailRate] = await Promise.all([
      checkRateLimit({ ip: `portal-recover-ip:${ip}`, maxPerIp: 10, windowMs: 10 * 60 * 1000 }),
      checkRateLimit({ ip: `portal-recover-email:${cleanEmail}`, maxPerIp: 3, windowMs: 10 * 60 * 1000 }),
    ])
    if (!ipRate.allowed || !emailRate.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Espera unos minutos antes de intentar nuevamente.' },
        { status: 429 }
      )
    }

    const safeRedirect = await getTrustedRedirectUrl(redirectTo)
    await sendRecoveryEmail({ email: cleanEmail, redirectTo: safeRedirect, branding: PORTAL_BRANDING })

    // Respuesta genérica: igual exista o no el correo.
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Error en /api/auth/portal-recover:', err)
    return NextResponse.json({ error: 'No se pudo procesar la solicitud de recuperación' }, { status: 500 })
  }
}
