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

/**
 * Infiere provincia y ciudad/localidad cabecera a partir del código postal argentino.
 * Esencial para carriers como Zipnova que exigen destination.city y destination.state obligatorios
 * incluso cuando el comprador solo ingresó su código postal numérico en el cotizador del checkout.
 */
export function inferirProvinciaYCiudadDesdeCP(cpRaw: string): { provincia: string; localidad: string } {
  const digits = (cpRaw || '').replace(/\D/g, '').slice(0, 4)
  const num = parseInt(digits, 10)
  if (isNaN(num)) return { provincia: 'Buenos Aires', localidad: 'Buenos Aires' }

  if (num >= 1000 && num <= 1499) return { provincia: 'Ciudad Autónoma de Buenos Aires', localidad: 'CABA' }
  if (num >= 2000 && num <= 2999) return { provincia: 'Santa Fe', localidad: num === 2000 ? 'Rosario' : 'Santa Fe' }
  if (num >= 3000 && num <= 3099) return { provincia: 'Santa Fe', localidad: 'Santa Fe' }
  if (num >= 3100 && num <= 3299) return { provincia: 'Entre Ríos', localidad: 'Paraná' }
  if (num >= 3300 && num <= 3399) return { provincia: 'Misiones', localidad: 'Posadas' }
  if (num >= 3400 && num <= 3499) return { provincia: 'Corrientes', localidad: 'Corrientes' }
  if (num >= 3500 && num <= 3599) return { provincia: 'Chaco', localidad: 'Resistencia' }
  if (num >= 3600 && num <= 3699) return { provincia: 'Formosa', localidad: 'Formosa' }
  if (num >= 4000 && num <= 4199) return { provincia: 'Tucumán', localidad: 'San Miguel de Tucumán' }
  if (num >= 4200 && num <= 4399) return { provincia: 'Santiago del Estero', localidad: 'Santiago del Estero' }
  if (num >= 4400 && num <= 4599) return { provincia: 'Salta', localidad: 'Salta' }
  if (num >= 4600 && num <= 4699) return { provincia: 'Jujuy', localidad: 'San Salvador de Jujuy' }
  if (num >= 4700 && num <= 4799) return { provincia: 'Catamarca', localidad: 'San Fernando del Valle de Catamarca' }
  if (num >= 5000 && num <= 5299) return { provincia: 'Córdoba', localidad: 'Córdoba' }
  if (num >= 5300 && num <= 5399) return { provincia: 'La Rioja', localidad: 'La Rioja' }
  if (num >= 5400 && num <= 5499) return { provincia: 'San Juan', localidad: 'San Juan' }
  if (num >= 5500 && num <= 5699) return { provincia: 'Mendoza', localidad: 'Mendoza' }
  if (num >= 5700 && num <= 5899) return { provincia: 'San Luis', localidad: 'San Luis' }
  if (num >= 6300 && num <= 6399) return { provincia: 'La Pampa', localidad: 'Santa Rosa' }
  if (num >= 8300 && num <= 8399) return { provincia: 'Neuquén', localidad: 'Neuquén' }
  if (num >= 8400 && num <= 8599) return { provincia: 'Río Negro', localidad: 'Viedma' }
  if (num >= 9000 && num <= 9299) return { provincia: 'Chubut', localidad: 'Rawson' }
  if (num >= 9300 && num <= 9409) return { provincia: 'Santa Cruz', localidad: 'Río Gallegos' }
  if (num >= 9410 && num <= 9499) return { provincia: 'Tierra del Fuego', localidad: 'Ushuaia' }

  return { provincia: 'Buenos Aires', localidad: 'Buenos Aires' }
}

