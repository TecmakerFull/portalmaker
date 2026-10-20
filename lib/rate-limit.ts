// =============================================================================
// PORTALMAKER — Rate Limiting Compartido y Anti-Abuso (Q, X)
// Soporta Upstash Redis REST con fallback en memoria y verificación Cloudflare Turnstile
// =============================================================================

interface RateLimitRecord {
  count: number
  resetAt: number
}

// Fallback en memoria con ventana deslizante
const localIpBuckets = new Map<string, RateLimitRecord>()
const localStoreBuckets = new Map<string, RateLimitRecord>()

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, val] of localIpBuckets.entries()) {
      if (val.resetAt <= now) localIpBuckets.delete(key)
    }
    for (const [key, val] of localStoreBuckets.entries()) {
      if (val.resetAt <= now) localStoreBuckets.delete(key)
    }
  }, 60000)
}

/**
 * X: Obtiene la IP del cliente priorizando x-real-ip y x-vercel-forwarded-for.
 */
export function getClientIp(req: Request): string {
  const headers = req.headers

  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const vercelForwarded = headers.get('x-vercel-forwarded-for')
  if (vercelForwarded) return vercelForwarded.split(',')[0].trim()

  const cfConnectingIp = headers.get('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp.trim()

  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  return '127.0.0.1'
}

/**
 * Consulta o incrementa un contador atómico en Upstash Redis vía HTTP REST.
 */
async function checkUpstashRate(
  key: string,
  max: number,
  windowSec: number
): Promise<{ count: number; allowed: boolean; retryAfter?: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        'ERROR CRITICO DE SEGURIDAD: Faltan UPSTASH_REDIS_REST_URL o UPSTASH_REDIS_REST_TOKEN en producción. Rate limiting distribuido inactivo.'
      )
    }
    return null
  }

  try {
    const cleanUrl = url.replace(/\/$/, '')
    const res = await fetch(`${cleanUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, windowSec, 'NX'],
        ['TTL', key],
      ]),
      cache: 'no-store',
    })

    if (!res.ok) return null

    const results = await res.json()
    const currentCount = Number(results[0]?.result) || 1
    const ttl = Number(results[2]?.result) || windowSec

    return {
      count: currentCount,
      allowed: currentCount <= max,
      retryAfter: currentCount > max ? Math.max(1, ttl) : undefined,
    }
  } catch (err) {
    console.warn('Upstash Redis no disponible, recurriendo a memoria local:', err)
    return null
  }
}

export interface RateLimitOptions {
  ip: string
  storeId?: string
  maxPerIp?: number
  alertPerStore?: number
  windowMs?: number
}

export interface RateLimitResult {
  allowed: boolean
  retryAfter?: number
  storeAlert?: boolean
}

/**
 * X: Rate limit distribuido por IP (bloqueo duro 429) y por tienda (soft alert / no bloqueo para evitar DoS)
 */
export async function checkRateLimit({
  ip,
  storeId,
  maxPerIp = 15,
  alertPerStore = 50,
  windowMs = 60000,
}: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now()
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000))
  const cleanIp = (ip || 'unknown-ip').replace(/[^a-zA-Z0-9._:-]/g, '')

  let ipAllowed = true
  let retryAfter: number | undefined
  let storeAlert = false

  // 1. Limitar por IP usando Upstash Redis si está configurado
  const upstashIpResult = await checkUpstashRate(`rl:ip:${cleanIp}`, maxPerIp, windowSec)

  if (upstashIpResult) {
    ipAllowed = upstashIpResult.allowed
    retryAfter = upstashIpResult.retryAfter
  } else {
    // Fallback memoria local
    let ipRecord = localIpBuckets.get(cleanIp)
    if (!ipRecord || ipRecord.resetAt <= now) {
      ipRecord = { count: 1, resetAt: now + windowMs }
      localIpBuckets.set(cleanIp, ipRecord)
    } else {
      ipRecord.count++
    }

    if (ipRecord.count > maxPerIp) {
      ipAllowed = false
      retryAfter = Math.ceil((ipRecord.resetAt - now) / 1000)
    }
  }

  if (!ipAllowed) {
    return { allowed: false, retryAfter }
  }

  // 2. Control por tienda: Alerta de volumen sin bloqueo duro (previene DoS a tiendas por terceros)
  if (storeId) {
    const cleanStoreId = storeId.replace(/[^a-zA-Z0-9-]/g, '')
    const upstashStoreResult = await checkUpstashRate(`rl:store:${cleanStoreId}`, alertPerStore, windowSec)

    if (upstashStoreResult) {
      if (!upstashStoreResult.allowed) {
        storeAlert = true
      }
    } else {
      let storeRecord = localStoreBuckets.get(cleanStoreId)
      if (!storeRecord || storeRecord.resetAt <= now) {
        storeRecord = { count: 1, resetAt: now + windowMs }
        localStoreBuckets.set(cleanStoreId, storeRecord)
      } else {
        storeRecord.count++
      }

      if (storeRecord.count > alertPerStore) {
        storeAlert = true
      }
    }
  }

  return { allowed: true, storeAlert }
}

/**
 * AC: Comprueba si Cloudflare Turnstile está configurado completamente.
 * Requiere tanto TURNSTILE_SECRET_KEY como NEXT_PUBLIC_TURNSTILE_SITE_KEY.
 */
export function isTurnstileConfigured(): boolean {
  const secretKey = process.env.TURNSTILE_SECRET_KEY
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  if (!secretKey && !siteKey) {
    return false
  }

  if (!secretKey || !siteKey) {
    console.warn(
      'ADVERTENCIA TURNSTILE: Configuración incompleta. Se requieren ambas variables: TURNSTILE_SECRET_KEY y NEXT_PUBLIC_TURNSTILE_SITE_KEY.'
    )
    return false
  }

  return true
}

/**
 * X, AC: Verifica token de Cloudflare Turnstile en el servidor.
 * Solo activo si ambas variables de Turnstile están configuradas.
 */
export async function verifyTurnstileToken(token: string, remoteip?: string): Promise<boolean> {
  if (!isTurnstileConfigured()) {
    // Si no está configurada la pareja de variables, permitir paso sin bloqueo
    return true
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY!

  if (!token) {
    return false
  }

  try {
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token)
    if (remoteip) formData.append('remoteip', remoteip)

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    })

    const data = await res.json()
    return Boolean(data.success)
  } catch (err) {
    console.error('Error al validar token de Cloudflare Turnstile:', err)
    return false
  }
}
