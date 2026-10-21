// =============================================================================
// PORTALMAKER — Integración con API Georef AR (Servicio Geográfico Oficial)
// Servicio público del Estado Argentino (IGN / Secretaría de Innovación Pública)
// Normaliza calles, alturas, localidades y provincias argentinas sin costo ni API key.
// =============================================================================

export interface GeorefSugerencia {
  nomenclatura: string // ej: "LAMADRID 650, Rosario, Santa Fe"
  calle: string        // ej: "Lamadrid" (en Title Case)
  altura: string       // ej: "650"
  localidad: string    // ej: "Rosario"
  departamento: string // ej: "Rosario"
  provincia: string    // ej: "Santa Fe"
  lat?: number | null
  lon?: number | null
  codigoPostalAproximado?: string | null
}

/**
 * Convierte nombres de calles en mayúsculas ("AV. SAN MARTIN") a formato legible ("Av. San Martín").
 */
export function toTitleCase(str: string): string {
  if (!str) return ''
  const excepciones = ['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'bis']
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && excepciones.includes(word)) {
        return word
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

/**
 * Mapeo rápido de códigos postales base de las principales ciudades y capitales argentinas.
 * Ayuda a sugerir el CP si el usuario o la tienda no lo tienen a mano.
 */
const CP_PRINCIPALES: Record<string, string> = {
  'ciudad autónoma de buenos aires': '1000',
  'la plata': '1900',
  'mar del plata': '7600',
  'bahía blanca': '8000',
  'quilmes': '1878',
  'lanús': '1824',
  'lomas de zamora': '1832',
  'san isidro': '1642',
  'vicente lópez': '1638',
  'morón': '1708',
  'san miguel de tucumán': '4000',
  'córdoba': '5000',
  'río cuarto': '5800',
  'villa maría': '5900',
  'rosario': '2000',
  'santa fe': '3000',
  'rafaela': '2300',
  'venado tuerto': '2600',
  'mendoza': '5500',
  'san rafael': '5600',
  'godoy cruz': '5501',
  'salta': '4400',
  'san juan': '5400',
  'posadas': '3300',
  'resistencia': '3500',
  'corrientes': '3400',
  'santiago del estero': '4200',
  'san salvador de jujuy': '4600',
  'paraná': '3100',
  'concordia': '3200',
  'neuquén': '8300',
  'formosa': '3600',
  'san luis': '5700',
  'villa mercedes': '5730',
  'catamarca': '4700',
  'la rioja': '5300',
  'comodoro rivadavia': '9000',
  'trelew': '9100',
  'puerto madryn': '9120',
  'bariloche': '8400',
  'san carlos de bariloche': '8400',
  'viedma': '8500',
  'cipolletti': '8324',
  'santa rosa': '6300',
  'general pico': '6360',
  'río gallegos': '9400',
  'ushuaia': '9410',
  'río grande': '9420',
}

export function inferirCodigoPostalAproximado(provincia?: string, localidad?: string): string | null {
  if (localidad) {
    const locKey = localidad.trim().toLowerCase()
    if (CP_PRINCIPALES[locKey]) return CP_PRINCIPALES[locKey]
  }
  if (provincia) {
    const provKey = provincia.trim().toLowerCase()
    if (provKey.includes('ciudad autónoma') || provKey.includes('caba')) return '1000'
  }
  return null
}

/**
 * Consulta la API oficial de Georef AR para normalizar una dirección física.
 * No arroja excepciones para no romper la experiencia si la API externa está lenta o no disponible.
 */
export async function consultarDireccionesGeoref(params: {
  calle: string
  altura?: string
  provincia?: string
  localidad?: string
  max?: number
}): Promise<GeorefSugerencia[]> {
  const calleLimpia = (params.calle || '').trim()
  const alturaLimpia = (params.altura || '').trim()
  if (!calleLimpia) return []

  // Georef espera "Calle Altura" en el parámetro direccion
  const direccionQuery = alturaLimpia ? `${calleLimpia} ${alturaLimpia}` : calleLimpia
  const url = new URL('https://apis.datos.gob.ar/georef/api/direcciones')
  url.searchParams.set('direccion', direccionQuery)
  url.searchParams.set('max', String(params.max || 5))

  if (params.provincia && params.provincia.trim()) {
    url.searchParams.set('provincia', params.provincia.trim())
  }
  if (params.localidad && params.localidad.trim()) {
    url.searchParams.set('localidad_censal', params.localidad.trim())
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 6000) // 6s timeout de resiliencia

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    })
    clearTimeout(timeoutId)

    if (!res.ok) return []
    const data = await res.json()
    if (!data || !Array.isArray(data.direcciones)) return []

    return data.direcciones.map((d: any): GeorefSugerencia => {
      const nomCalle = toTitleCase(d.calle?.nombre || calleLimpia)
      const nomAltura = d.altura?.valor ? String(d.altura.valor) : alturaLimpia
      const nomLocalidad = toTitleCase(d.localidad_censal?.nombre || d.departamento?.nombre || '')
      const nomDepartamento = toTitleCase(d.departamento?.nombre || '')
      const nomProvincia = d.provincia?.nombre || params.provincia || ''

      return {
        nomenclatura: d.nomenclatura || `${nomCalle} ${nomAltura}, ${nomLocalidad}, ${nomProvincia}`,
        calle: nomCalle,
        altura: nomAltura,
        localidad: nomLocalidad,
        departamento: nomDepartamento,
        provincia: nomProvincia,
        lat: d.ubicacion?.lat ?? null,
        lon: d.ubicacion?.lon ?? null,
        codigoPostalAproximado: inferirCodigoPostalAproximado(nomProvincia, nomLocalidad),
      }
    })
  } catch {
    clearTimeout(timeoutId)
    return []
  }
}
