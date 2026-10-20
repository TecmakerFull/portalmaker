// =============================================================================
// PORTALMAKER — Cliente HTTP seguro para Carriers (Fase 2)
// Características:
// - Solo fetch nativo de Node.js / Vercel Runtime.
// - Timeout estricto de 8 segundos por solicitud.
// - 1 reintento automático ante errores 5xx o fallos de red/timeout.
// - Sanitización estricta: nunca loguea headers de autorización, tokens ni PII.
// =============================================================================

import { ShippingError } from './errors'

export interface CarrierHttpRequestOptions extends Omit<RequestInit, 'signal'> {
  timeoutMs?: number
  maxRetries?: number
  sanitizedUrlForLogs?: string
}

const DEFAULT_TIMEOUT_MS = 8000
const DEFAULT_MAX_RETRIES = 1

/**
 * Realiza una petición HTTP al carrier con timeout y reintento único.
 */
export async function carrierFetch<T = unknown>(
  url: string,
  options: CarrierHttpRequestOptions = {}
): Promise<{ data: T; status: number; headers: Headers }> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES

  let attempt = 0
  let lastError: unknown

  while (attempt <= maxRetries) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timer)

      // Si el carrier responde 5xx y aún tenemos reintentos, reintentamos
      if (response.status >= 500 && attempt < maxRetries) {
        attempt++
        await new Promise((res) => setTimeout(res, 400)) // Breve backoff
        continue
      }

      // Si es un error 4xx o 5xx definitivo, procesar la respuesta
      if (!response.ok) {
        let errorBody: unknown
        try {
          errorBody = await response.json()
        } catch {
          try {
            errorBody = await response.text()
          } catch {
            errorBody = null
          }
        }

        const isAuthError = response.status === 401 || response.status === 403
        const errorCode = isAuthError ? 'AUTH' : response.status >= 500 ? 'UPSTREAM' : 'VALIDATION'

        throw new ShippingError(
          errorCode,
          `Carrier HTTP ${response.status} en ${options.sanitizedUrlForLogs || 'solicitud'}`,
          {
            statusCode: response.status,
            details: errorBody,
          }
        )
      }

      // Respuesta exitosa
      let responseData: T
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        responseData = (await response.json()) as T
      } else {
        responseData = (await response.text()) as unknown as T
      }

      return {
        data: responseData,
        status: response.status,
        headers: response.headers,
      }
    } catch (err: unknown) {
      clearTimeout(timer)

      if (err instanceof ShippingError) {
        throw err
      }

      const isAbort =
        (err as { name?: string })?.name === 'AbortError' || controller.signal.aborted

      if (isAbort) {
        lastError = new ShippingError(
          'TIMEOUT',
          `Timeout de ${timeoutMs}ms excedido conectando con el carrier.`
        )
      } else {
        lastError = new ShippingError(
          'UPSTREAM',
          'Fallo de conexión o red al comunicar con el carrier.',
          { details: (err as Error)?.message }
        )
      }

      if (attempt < maxRetries) {
        attempt++
        await new Promise((res) => setTimeout(res, 400))
        continue
      }

      throw lastError
    }
  }

  throw lastError
}
