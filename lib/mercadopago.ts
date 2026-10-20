// =============================================================================
// PORTALMAKER — Helper de Mercado Pago Marketplace y OAuth
// Manejo seguro de tokens, renovación automática (refresh) y validación de origen.
// =============================================================================

import { createSupabaseAdminClient } from '@/lib/supabase/server'
import type { Store } from '@/types/database'
import crypto from 'crypto'

/**
 * Obtiene el access token válido de la tienda.
 * Prioriza la tabla aislada `store_mp_credentials` (accesible solo con service_role),
 * con fallback a los campos en `stores`.
 * Si el token está expirado o próximo a vencer (dentro de las próximas 24 horas),
 * lo renueva automáticamente usando el refresh_token y actualiza la base de datos de forma atómica.
 */
export async function getValidMpAccessToken(store: Store): Promise<string | null> {
  if (!store.mp_connected) {
    return null
  }

  const supabaseAdmin = createSupabaseAdminClient()

  // 1. Obtener credenciales desde la tabla segura `store_mp_credentials`
  let accessToken: string | null = null
  let refreshToken: string | null = null
  let tokenExpiresAt: string | null = null

  try {
    const { data: creds } = await supabaseAdmin
      .from('store_mp_credentials')
      .select('mp_access_token, mp_refresh_token, mp_token_expires_at')
      .eq('store_id', store.id)
      .maybeSingle()

    if (creds?.mp_access_token) {
      accessToken = creds.mp_access_token
      refreshToken = creds.mp_refresh_token || null
      tokenExpiresAt = creds.mp_token_expires_at || null
    }
  } catch (err) {
    console.warn(`Aviso al consultar store_mp_credentials para tienda ${store.id}:`, err)
  }

  if (!accessToken) {
    return null
  }

  const expiresAt = tokenExpiresAt ? new Date(tokenExpiresAt).getTime() : null
  const now = Date.now()
  const twentyFourHours = 24 * 60 * 60 * 1000

  // Si no está por vencer (quedan más de 24 horas), usar el token actual directamente
  if (expiresAt && expiresAt - now > twentyFourHours) {
    return accessToken
  }

  // Si no tiene refresh_token, devolver el access_token si aún no expiró
  if (!refreshToken) {
    if (expiresAt && expiresAt <= now) {
      console.warn(`Tienda ${store.id} tiene token vencido y no posee refresh_token.`)
      return null
    }
    return accessToken
  }

  const clientId = process.env.MP_CLIENT_ID
  const clientSecret = process.env.MP_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('getValidMpAccessToken: Faltan credenciales maestras de MP en variables de entorno')
    return expiresAt && expiresAt > now ? accessToken : null
  }

  // B2: Prevenir condición de carrera en refresh: releer DB antes de llamar a MP
  let currentRefreshToken = refreshToken
  try {
    const { data: latestCreds } = await supabaseAdmin
      .from('store_mp_credentials')
      .select('mp_access_token, mp_refresh_token, mp_token_expires_at')
      .eq('store_id', store.id)
      .maybeSingle()

    if (latestCreds && latestCreds.mp_refresh_token && latestCreds.mp_refresh_token !== refreshToken) {
      const latestExpires = latestCreds.mp_token_expires_at ? new Date(latestCreds.mp_token_expires_at).getTime() : 0
      if (latestExpires - now > twentyFourHours) {
        return latestCreds.mp_access_token
      }
      currentRefreshToken = latestCreds.mp_refresh_token
    }
  } catch {
    // Si falla consulta auxiliar, continuar con currentRefreshToken
  }

  try {
    const res = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_secret: clientSecret,
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: currentRefreshToken,
      }),
    })

    const data = await res.json()

    if (!res.ok || !data.access_token) {
      console.error(`getValidMpAccessToken: Falló la renovación para tienda ${store.id}:`, data?.error || data)

      // B1: Solo desconectar si Mercado Pago confirma explícitamente invalid_grant
      if (data.error === 'invalid_grant') {
        // Doble verificación: comprobar que en DB no haya cambiado mientras esperábamos la respuesta
        const { data: checkCreds } = await supabaseAdmin
          .from('store_mp_credentials')
          .select('mp_refresh_token, mp_access_token')
          .eq('store_id', store.id)
          .maybeSingle()

        if (checkCreds && checkCreds.mp_refresh_token && checkCreds.mp_refresh_token !== currentRefreshToken) {
          return checkCreds.mp_access_token
        }

        // Desconectar tienda
        await supabaseAdmin
          .from('stores')
          .update({
            mp_connected: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', store.id)

        // Limpiar tabla de credenciales
        await supabaseAdmin
          .from('store_mp_credentials')
          .delete()
          .eq('store_id', store.id)

        return null
      }

      // B3: Para fallas transitorias (red, 5xx), si el token aún no venció físicamente, usarlo
      if (expiresAt && expiresAt > now) {
        console.warn(`Usando token previo no vencido tras fallo transitorio de refresh para tienda ${store.id}`)
        return accessToken
      }

      throw new Error('MP_TOKEN_REFRESH_TEMPORARY_ERROR')
    }

    const expiresInSeconds = data.expires_in || 15552000
    const newExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()
    const newRefreshToken = data.refresh_token || currentRefreshToken

    // Guardar en tabla segura store_mp_credentials
    await supabaseAdmin
      .from('store_mp_credentials')
      .upsert({
        store_id: store.id,
        mp_access_token: data.access_token,
        mp_refresh_token: newRefreshToken,
        mp_public_key: data.public_key || null,
        mp_token_expires_at: newExpiresAt,
        mp_user_id: String(data.user_id || ''),
        updated_at: new Date().toISOString(),
      })

    // Sincronizar estado en stores (solo mp_connected)
    await supabaseAdmin
      .from('stores')
      .update({
        mp_connected: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', store.id)

    return data.access_token
  } catch (err: any) {
    if (err?.message === 'MP_TOKEN_REFRESH_TEMPORARY_ERROR') {
      throw err
    }
    console.error('getValidMpAccessToken: Excepción de red al renovar token:', err)
    if (expiresAt && expiresAt > now) {
      return accessToken
    }
    throw new Error('MP_TOKEN_REFRESH_TEMPORARY_ERROR')
  }
}

/**
 * Valida que el returnOrigin provenga de un dominio autorizado (evita Open Redirect).
 * B4: Normaliza candidatos mediante URL origin, valida dominios propios y aplica fallback en orden correcto.
 */
export function getSafeReturnOrigin(candidateOrigin: string | null | undefined, store: Store): string {
  const defaultPortal = process.env.NEXT_PUBLIC_APP_URL || 'https://www.portalmaker.ar'
  let normalizedDefault = 'https://www.portalmaker.ar'
  try {
    normalizedDefault = new URL(defaultPortal).origin
  } catch {
    // Si defaultPortal no tiene esquema válido
  }

  let storeSubdomainOrigin: string | null = null
  if (store.slug) {
    try {
      storeSubdomainOrigin = new URL(`https://${store.slug}.portalmaker.ar`).origin
    } catch {}
  }

  let storeSubdomainAltOrigin: string | null = null
  if (store.slug) {
    try {
      storeSubdomainAltOrigin = new URL(`https://${store.slug}.portalmaker.com.ar`).origin
    } catch {}
  }

  let storeCustomOrigin: string | null = null
  // V: Solo incluir custom_domain si está presente y verificado (custom_domain_verified = true)
  if (store.custom_domain && store.custom_domain_verified === true) {
    try {
      const raw = store.custom_domain.startsWith('http') ? store.custom_domain : `https://${store.custom_domain}`
      storeCustomOrigin = new URL(raw).origin
    } catch {}
  }

  // Conjunto de orígenes permitidos normalizados
  const allowed = new Set<string>([
    'https://www.portalmaker.ar',
    'https://portalmaker.ar',
    'https://portalmaker.com.ar',
    'https://www.portalmaker.com.ar',
    normalizedDefault,
  ])

  if (storeSubdomainOrigin) allowed.add(storeSubdomainOrigin)
  if (storeSubdomainAltOrigin) allowed.add(storeSubdomainAltOrigin)
  if (storeCustomOrigin) allowed.add(storeCustomOrigin)

  // En desarrollo local o preview se permite localhost
  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:3000')
    allowed.add('http://127.0.0.1:3000')
  }

  if (process.env.ALLOWED_RETURN_ORIGINS) {
    process.env.ALLOWED_RETURN_ORIGINS.split(',').forEach((o) => {
      try {
        const trimmed = o.trim()
        if (trimmed) allowed.add(new URL(trimmed).origin)
      } catch {
        // Origen malformado
      }
    })
  }

  // Validar el origen candidato provisto por el cliente normalizado con new URL(x).origin
  if (candidateOrigin) {
    try {
      const parsed = new URL(candidateOrigin).origin
      if (allowed.has(parsed)) {
        return parsed
      }
    } catch {
      // Formato inválido
    }
  }

  // Fallback seguro y siempre normalizado
  if (storeCustomOrigin) {
    return storeCustomOrigin
  }

  if (storeSubdomainOrigin) {
    return storeSubdomainOrigin
  }

  return normalizedDefault
}

/**
 * Valida la firma HMAC de webhooks de Mercado Pago (x-signature y x-request-id).
 * B5: Normaliza dataId a minúsculas, protege contra replay (5 min) y valida longitudes de buffers.
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
    const parts = xSignatureHeader.split(',')
    let ts = ''
    let hash = ''

    for (const part of parts) {
      const [k, v] = part.trim().split('=')
      if (k === 'ts') ts = v
      if (k === 'v1') hash = v
    }

    if (!ts || !hash) return false

    // Anti-replay: rechazar notificaciones con timestamp mayor a 5 minutos (300s)
    const tsNum = parseInt(ts, 10)
    if (isNaN(tsNum)) return false
    const nowSec = Math.floor(Date.now() / 1000)
    if (Math.abs(nowSec - tsNum) > 300) {
      console.warn(`Firma de webhook rechazada por timestamp vencido (diferencia: ${Math.abs(nowSec - tsNum)}s)`)
      return false
    }

    // B5: dataId en minúsculas en el manifest según especificación oficial de Mercado Pago
    const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestIdHeader};ts:${ts};`

    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(manifest)
    const expectedHash = hmac.digest('hex')

    // B5: Comparar longitudes antes de timingSafeEqual para evitar excepción por buffers de distinto tamaño
    const hashBuf = Buffer.from(hash)
    const expectedBuf = Buffer.from(expectedHash)
    if (hashBuf.length !== expectedBuf.length) {
      return false
    }

    return crypto.timingSafeEqual(hashBuf, expectedBuf)
  } catch (err) {
    console.error('Error al verificar firma de webhook de MP:', err)
    return false
  }
}

/**
 * AB3: Constante de configuración comercial de Portalmaker para la base de comisión.
 * 'total': sobre subtotal de productos + recargo + costo de envío (default actual).
 * 'productos': únicamente sobre el subtotal de productos (excluye recargo y costo de envío).
 * Decisión de negocio pendiente del dueño del portal; dejarla comentada con su default.
 */
export const COMISION_BASE: 'total' | 'productos' = 'total'

/**
 * AB3: Centraliza el cálculo de la comisión de Portalmaker (marketplace_fee) para Checkout Pro.
 * @param items - Lista de items validados que componen el cobro (incluyendo recargo o envío si aplican)
 * @param store - Tienda con el campo comision_portalmaker configurado
 */
export function calcularMarketplaceFee(
  items: Array<{ id: string; quantity: number; unit_price: number }>,
  store: { comision_portalmaker?: number | null }
): number {
  const comisionPct = Number(store?.comision_portalmaker) || 0
  if (comisionPct <= 0 || !Array.isArray(items) || items.length === 0) return 0

  let baseCalculo = 0

  if (COMISION_BASE === 'total') {
    // Comportamiento actual (default): Base total cobrada al comprador
    baseCalculo = items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0)
  } else {
    // Alternativa: Solo productos, excluyendo recargo por cobro con MP y costo de envío
    baseCalculo = items
      .filter((it) => it.id !== 'recargo_mp' && it.id !== 'costo_envio')
      .reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0)
  }

  const fee = Number(((baseCalculo * comisionPct) / 100).toFixed(2))
  return Math.max(0, fee)
}

