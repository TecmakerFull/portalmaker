// =============================================================================
// PORTALMAKER — Helper de Mercado Pago Marketplace y OAuth
// Manejo seguro de tokens, renovación automática (refresh) y validación de origen.
// =============================================================================

import { createSupabaseAdminClient } from '@/lib/supabase/server'
import type { Store } from '@/types/database'
import crypto from 'crypto'

/**
 * Obtiene el access token válido de la tienda.
 * Si el token está expirado o próximo a vencer (dentro de las próximas 24 horas),
 * lo renueva automáticamente usando el refresh_token y actualiza la base de datos.
 */
export async function getValidMpAccessToken(store: Store): Promise<string | null> {
  if (!store.mp_connected || !store.mp_access_token) {
    return null
  }

  // Verificar si el token tiene fecha de expiración y si está por vencer
  const expiresAt = store.mp_token_expires_at ? new Date(store.mp_token_expires_at).getTime() : null
  const now = Date.now()
  const twentyFourHours = 24 * 60 * 60 * 1000

  // Si no está por vencer (quedan más de 24 horas), usar el token actual
  if (expiresAt && expiresAt - now > twentyFourHours) {
    return store.mp_access_token
  }

  // Si no tiene refresh_token, devolver el access_token existente como fallback
  if (!store.mp_refresh_token) {
    return store.mp_access_token
  }

  const clientId = process.env.MP_CLIENT_ID
  const clientSecret = process.env.MP_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('getValidMpAccessToken: Faltan credenciales de MP en variables de entorno')
    return store.mp_access_token
  }

  try {
    const res = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_secret: clientSecret,
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: store.mp_refresh_token,
      }),
    })

    const data = await res.json()

    if (!res.ok || !data.access_token) {
      console.error('getValidMpAccessToken: Falló la renovación del token de Mercado Pago:', data)

      // Si el refresh_token fue revocado o expiró, marcar desconectado
      if (data.status === 400 || data.error === 'invalid_grant') {
        const supabaseAdmin = createSupabaseAdminClient()
        await supabaseAdmin
          .from('stores')
          .update({
            mp_connected: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', store.id)
      }
      return null
    }

    const expiresInSeconds = data.expires_in || 15552000
    const newExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()

    const supabaseAdmin = createSupabaseAdminClient()
    const { error: updateErr } = await supabaseAdmin
      .from('stores')
      .update({
        mp_access_token: data.access_token,
        mp_refresh_token: data.refresh_token || store.mp_refresh_token,
        mp_public_key: data.public_key || store.mp_public_key,
        mp_token_expires_at: newExpiresAt,
        mp_connected: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', store.id)

    if (updateErr) {
      console.error('getValidMpAccessToken: Error al guardar token renovado en DB:', updateErr)
    }

    return data.access_token
  } catch (err: any) {
    console.error('getValidMpAccessToken: Excepción al renovar token:', err)
    return store.mp_access_token // Fallback si hubo error de red puntual
  }
}

/**
 * Valida que el returnOrigin provenga de un dominio autorizado (evita Open Redirect).
 */
export function getSafeReturnOrigin(candidateOrigin: string | null | undefined, store: Store): string {
  const defaultPortal = process.env.NEXT_PUBLIC_APP_URL || 'https://www.portalmaker.ar'
  const storeSubdomain = `https://${store.slug}.portalmaker.ar`
  const storeCustom = store.custom_domain ? `https://${store.custom_domain}` : null

  // Lista de orígenes permitidos por defecto
  const allowed = new Set([
    'https://www.portalmaker.ar',
    'https://portalmaker.ar',
    'https://portalmaker.com.ar',
    'https://www.portalmaker.com.ar',
    storeSubdomain,
  ])

  if (storeCustom) {
    allowed.add(storeCustom)
  }

  // En desarrollo local se permite localhost
  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:3000')
    allowed.add('http://127.0.0.1:3000')
  }

  // Si hay orígenes adicionales configurados por variable de entorno
  if (process.env.ALLOWED_RETURN_ORIGINS) {
    process.env.ALLOWED_RETURN_ORIGINS.split(',').forEach((o) => {
      const trimmed = o.trim()
      if (trimmed) allowed.add(trimmed)
    })
  }

  if (candidateOrigin && allowed.has(candidateOrigin)) {
    return candidateOrigin
  }

  // Fallback seguro: el subdominio de la tienda o el portal general
  return storeCustom || storeSubdomain || defaultPortal
}

/**
 * Valida la firma HMAC de webhooks de Mercado Pago (x-signature y x-request-id).
 */
export function verifyMpWebhookSignature(
  xSignatureHeader: string | null,
  xRequestIdHeader: string | null,
  dataId: string | null,
  secret: string
): boolean {
  if (!xSignatureHeader || !xRequestIdHeader || !dataId || !secret) {
    return false
  }

  try {
    // Formato de x-signature: ts=1700000000,v1=hash
    const parts = xSignatureHeader.split(',')
    let ts = ''
    let hash = ''

    for (const part of parts) {
      const [k, v] = part.trim().split('=')
      if (k === 'ts') ts = v
      if (k === 'v1') hash = v
    }

    if (!ts || !hash) return false

    // Manifest que firma Mercado Pago: id:[data.id];request-id:[x-request-id];ts:[ts];
    const manifest = `id:${dataId};request-id:${xRequestIdHeader};ts:${ts};`

    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(manifest)
    const expectedHash = hmac.digest('hex')

    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash))
  } catch (err) {
    console.error('Error al verificar firma de webhook de MP:', err)
    return false
  }
}
