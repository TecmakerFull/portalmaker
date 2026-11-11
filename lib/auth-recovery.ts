// =============================================================================
// PORTALMAKER — Envío del correo de recuperación de contraseña (lógica compartida)
//
// Lo usan /api/auth/store-recover (cuenta de comprador de una tienda) y
// /api/auth/portal-recover (login del portal). Centraliza tres reglas:
//  - El correo solo se envía si el usuario existe y no está bloqueado.
//  - Nunca se revela si existe: el llamador responde igual en todos los casos.
//  - Si Resend falla, se usa el correo nativo de Supabase DESDE EL SERVIDOR, para
//    que el límite de solicitudes propio del proyecto no se pueda saltear.
// =============================================================================

import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { buildStoreAuthEmail, sendStoreAuthEmail, type StoreBranding } from '@/lib/store-auth-email'

export async function sendRecoveryEmail(params: {
  email: string
  redirectTo: string | undefined
  branding: StoreBranding
}): Promise<void> {
  const supabaseAdmin = createSupabaseAdminClient()
  const { email, redirectTo, branding } = params

  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  // Usuario inexistente: no se envía nada (el llamador responde igual que si hubiera ido bien).
  if (linkErr || !linkData?.properties?.action_link) return

  // Usuario bloqueado: no se le envía un enlace para volver a entrar.
  const bannedUntil = linkData.user?.banned_until
  if (bannedUntil && new Date(bannedUntil).getTime() > Date.now()) return

  // Si el destino es nuestro /auth/callback, se envía token_hash para que el callback
  // verifique el OTP del lado del servidor (y haga el puente a dominios propios).
  let actionLink = linkData.properties.action_link
  const hashedToken = linkData.properties.hashed_token
  if (redirectTo && hashedToken) {
    const callbackUrl = new URL(redirectTo)
    if (callbackUrl.pathname === '/auth/callback') {
      callbackUrl.searchParams.set('token_hash', hashedToken)
      callbackUrl.searchParams.set('type', 'recovery')
      actionLink = callbackUrl.toString()
    }
  }

  const message = buildStoreAuthEmail({ store: branding, actionLink, kind: 'recovery' })
  if (await sendStoreAuthEmail({ to: email, ...message })) return

  // Resend no disponible: correo nativo de Supabase (sin marca), igualmente desde el servidor.
  await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo })
}
