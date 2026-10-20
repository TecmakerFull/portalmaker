// =============================================================================
// PORTALMAKER — Tipos y contratos para proveedores de envíos (Fase 2)
// Define la interfaz común CarrierProvider, modelos de cotización, sucursales,
// tracking y creación de envíos para soportar proveedores nativos (Zipnova, etc.)
// =============================================================================

export type ShippingProviderType = 'manual' | 'zipnova' | 'correo_argentino' | 'andreani'

export type ShippingServiceType = 'domicilio' | 'sucursal' | 'retiro_local'

export interface ShippingPackageItem {
  nombre: string
  cantidad: number
  precio_unitario: number
  peso_kg: number
  alto_cm: number
  ancho_cm: number
  profundidad_cm: number
  valor_declarado?: number
}

export interface QuoteInput {
  storeId: string
  // Origen del despacho
  origen: {
    codigoPostal: string
    provincia?: string
    localidad?: string
    calle?: string
    altura?: string
  }
  // Destino
  destino: {
    codigoPostal: string
    provincia?: string
    localidad?: string
    calle?: string
    altura?: string
    piso?: string
  }
  // Bultos e items
  items: ShippingPackageItem[]
  pesoTotalKg: number
  volumenTotalCm3: number
  valorDeclaradoTotal: number
}

export interface QuoteOption {
  optionId: string
  provider: ShippingProviderType
  serviceName: string
  serviceType: ShippingServiceType
  costoCarrier: number
  precioFinal: number // Con markup y reglas de envío gratis aplicadas
  plazoMinDias?: number
  plazoMaxDias?: number
  plazoTexto?: string
  carrierMetadata?: Record<string, unknown>
}

export interface Branch {
  branchId: string
  provider: ShippingProviderType
  nombre: string
  direccion: string
  localidad: string
  provincia: string
  codigoPostal: string
  horarios?: string
  carrierMetadata?: Record<string, unknown>
}

export interface RecipientInput {
  nombre: string
  email: string
  telefono: string
  documento?: string // DNI/CUIT si lo exige el carrier
  calle: string
  altura: string
  piso?: string
  localidad: string
  provincia: string
  codigoPostal: string
  referencias?: string
}

export interface ShipmentInput {
  orderId: string
  storeId: string
  provider: ShippingProviderType
  serviceType: ShippingServiceType
  branchId?: string
  origen: QuoteInput['origen'] & {
    cuit?: string
    telefono?: string
    email?: string
    contactoNombre?: string
  }
  destinatario: RecipientInput
  items: ShippingPackageItem[]
  pesoTotalKg: number
  volumenTotalCm3: number
  valorDeclaradoTotal: number
  carrierMetadata?: Record<string, unknown>
}

export interface ShipmentCreationResult {
  providerShipmentId: string
  tracking?: string
  trackingUrl?: string
  costoReal?: number
  labelUrl?: string
  rawResponse?: Record<string, unknown>
}

export interface TrackingEvent {
  status: string
  descripcion: string
  fecha: string
  ubicacion?: string
  rawEvent?: Record<string, unknown>
}

export interface CarrierProvider {
  type: ShippingProviderType
  verifyCredentials(): Promise<{ ok: boolean; error?: string }>
  quote(input: QuoteInput): Promise<QuoteOption[]>
  listBranches?(input: { cp?: string; provincia?: string }): Promise<Branch[]>
  createShipment(input: ShipmentInput): Promise<ShipmentCreationResult>
  getLabel?(providerShipmentId: string): Promise<{ pdf?: ArrayBuffer; url?: string }>
  getTracking(providerShipmentId: string): Promise<TrackingEvent[]>
  cancelShipment?(providerShipmentId: string): Promise<void>
}
