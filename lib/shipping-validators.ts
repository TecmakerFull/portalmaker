// =============================================================================
// PORTALMAKER — Validadores de datos de envío (puros, sin dependencias)
// Se usan tanto en formularios del admin (cliente) como en Route Handlers (servidor):
// el servidor SIEMPRE debe revalidar, el cliente solo da feedback inmediato.
// =============================================================================

/** Deja solo dígitos. */
export function onlyDigits(value: string): string {
  return (value || '').replace(/\D/g, '')
}

/**
 * Valida un CUIT/CUIL argentino con su dígito verificador (módulo 11).
 * Por qué: un CUIT mal tipeado hace fallar la imposición en el carrier recién
 * cuando ya se cobró el envío; mejor detectarlo al configurar la tienda.
 */
export function isValidCuit(raw: string): boolean {
  const cuit = onlyDigits(raw)
  if (cuit.length !== 11) return false

  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const sum = weights.reduce((acc, w, i) => acc + w * Number(cuit[i]), 0)
  let check = 11 - (sum % 11)
  if (check === 11) check = 0
  // check === 10 no corresponde a ningún CUIT válido
  if (check === 10) return false

  return check === Number(cuit[10])
}

/** Formatea un CUIT válido como XX-XXXXXXXX-X (si no tiene 11 dígitos lo devuelve tal cual). */
export function formatCuit(raw: string): string {
  const d = onlyDigits(raw)
  if (d.length !== 11) return raw.trim()
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`
}

/**
 * Código postal argentino: formato viejo de 4 dígitos (1000) o CPA (C1000ABC).
 */
export function isValidCodigoPostal(raw: string): boolean {
  const cp = (raw || '').trim().toUpperCase()
  return /^\d{4}$/.test(cp) || /^[A-Z]\d{4}[A-Z]{3}$/.test(cp)
}

/** Devuelve el CP en su forma canónica (mayúsculas, sin espacios). */
export function normalizeCodigoPostal(raw: string): string {
  return (raw || '').trim().toUpperCase().replace(/\s+/g, '')
}

export interface ShippingMeasures {
  peso_kg?: number | null
  alto_cm?: number | null
  ancho_cm?: number | null
  profundidad_cm?: number | null
}

/**
 * Resuelve las medidas efectivas de una variante: cada campo vacío hereda del producto.
 * Se resuelve campo a campo (no todo-o-nada) para permitir, p. ej., que la variante
 * solo cambie el peso y comparta las dimensiones del producto.
 */
export function resolveMeasures(
  product: ShippingMeasures | null | undefined,
  variant?: ShippingMeasures | null
): Required<{ [K in keyof ShippingMeasures]: number | null }> {
  const pick = (v: number | null | undefined, p: number | null | undefined) =>
    v !== null && v !== undefined ? v : p ?? null
  return {
    peso_kg: pick(variant?.peso_kg, product?.peso_kg),
    alto_cm: pick(variant?.alto_cm, product?.alto_cm),
    ancho_cm: pick(variant?.ancho_cm, product?.ancho_cm),
    profundidad_cm: pick(variant?.profundidad_cm, product?.profundidad_cm),
  }
}

/** Un producto/variante solo se puede cotizar si tiene peso y las 3 dimensiones > 0. */
export function hasCompleteMeasures(m: ShippingMeasures | null | undefined): boolean {
  if (!m) return false
  return [m.peso_kg, m.alto_cm, m.ancho_cm, m.profundidad_cm].every(
    (n) => typeof n === 'number' && Number.isFinite(n) && n > 0
  )
}

/**
 * Parsea un input numérico de formulario respetando el límite de la columna
 * (numeric(6,3) => 999.999, numeric(6,2) => 9999.99) para fallar con un mensaje
 * claro en lugar de un error genérico de Postgres.
 */
export function parseMeasureInput(raw: string, label: string, max: number): number | null {
  const trimmed = (raw ?? '').toString().trim()
  if (trimmed === '') return null
  const n = Number(trimmed.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${label}: ingresá un número válido (mayor o igual a 0).`)
  }
  if (n > max) {
    throw new Error(`${label}: el valor máximo permitido es ${max}.`)
  }
  return n
}

export const MAX_PESO_KG = 999.999
export const MAX_DIMENSION_CM = 9999.99
export const MAX_VALOR_DECLARADO = 9999999999.99
