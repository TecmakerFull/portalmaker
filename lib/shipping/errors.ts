// =============================================================================
// PORTALMAKER — Errores tipados de envíos (Fase 2)
// Permite discriminar fallas de autenticación, validación de datos, falta de
// cobertura por código postal, timeouts y errores upstream del carrier.
// =============================================================================

export type ShippingErrorCode =
  | 'AUTH'
  | 'VALIDATION'
  | 'NO_COVERAGE'
  | 'TIMEOUT'
  | 'UPSTREAM'

export class ShippingError extends Error {
  readonly code: ShippingErrorCode
  readonly statusCode?: number
  readonly details?: unknown

  constructor(code: ShippingErrorCode, message: string, options?: { statusCode?: number; details?: unknown }) {
    super(message)
    this.name = 'ShippingError'
    this.code = code
    this.statusCode = options?.statusCode
    this.details = options?.details

    // Mantener prototipo correcto en herencia de Error
    Object.setPrototypeOf(this, ShippingError.prototype)
  }
}
