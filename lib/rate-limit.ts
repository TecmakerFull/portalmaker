// =============================================================================
// PORTALMAKER — Helper de Rate Limiting Anti-Abuso (Q)
// Control de frecuencia por IP y por tienda para checkout y cobros
// =============================================================================

interface RateLimitRecord {
  count: number
  resetAt: number
}

// Buckets en memoria con ventana deslizante
const ipBuckets = new Map<string, RateLimitRecord>()
const storeBuckets = new Map<string, RateLimitRecord>()

// Limpieza periódica de entradas vencidas cada 60 segundos
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, val] of ipBuckets.entries()) {
      if (val.resetAt <= now) ipBuckets.delete(key)
    }
    for (const [key, val] of storeBuckets.entries()) {
      if (val.resetAt <= now) storeBuckets.delete(key)
    }
  }, 60000)
}

/**
 * Obtiene la dirección IP cliente desde los headers de Cloudflare/Vercel/Proxy.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return '127.0.0.1'
}

/**
 * Comprueba si la petición está dentro de los límites de frecuencia permitidos.
 */
export function checkRateLimit({
  ip,
  storeId,
  maxPerIp = 15,
  maxPerStore = 40,
  windowMs = 60000,
}: {
  ip: string
  storeId?: string
  maxPerIp?: number
  maxPerStore?: number
  windowMs?: number
}): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()

  // 1. Limitar por IP
  const cleanIp = ip || 'unknown-ip'
  let ipRecord = ipBuckets.get(cleanIp)
  if (!ipRecord || ipRecord.resetAt <= now) {
    ipRecord = { count: 1, resetAt: now + windowMs }
    ipBuckets.set(cleanIp, ipRecord)
  } else {
    ipRecord.count++
  }

  if (ipRecord.count > maxPerIp) {
    const retryAfter = Math.ceil((ipRecord.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  // 2. Limitar por Tienda
  if (storeId) {
    let storeRecord = storeBuckets.get(storeId)
    if (!storeRecord || storeRecord.resetAt <= now) {
      storeRecord = { count: 1, resetAt: now + windowMs }
      storeBuckets.set(storeId, storeRecord)
    } else {
      storeRecord.count++
    }

    if (storeRecord.count > maxPerStore) {
      const retryAfter = Math.ceil((storeRecord.resetAt - now) / 1000)
      return { allowed: false, retryAfter }
    }
  }

  return { allowed: true }
}
