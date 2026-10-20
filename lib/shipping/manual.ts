// =============================================================================
// PORTALMAKER — Adaptador de Envíos Manuales (Fase 2)
// Implementa CarrierProvider sobre las zonas de envío de la tienda (shipping_zones).
// Permite cotizar según coincidencia de Código Postal y peso.
// =============================================================================

import type {
  CarrierProvider,
  QuoteInput,
  QuoteOption,
  ShipmentInput,
  ShipmentCreationResult,
  TrackingEvent,
} from './types'
import type { ShippingZone } from '@/types/database'

export class ManualShippingProvider implements CarrierProvider {
  readonly type = 'manual' as const
  private zones: ShippingZone[]

  constructor(zones: ShippingZone[]) {
    this.zones = zones
  }

  async verifyCredentials(): Promise<{ ok: boolean; error?: string }> {
    // El proveedor manual no requiere credenciales de API externas
    return { ok: true }
  }

  async quote(input: QuoteInput): Promise<QuoteOption[]> {
    const cpDestino = input.destino.codigoPostal.trim()
    const options: QuoteOption[] = []

    for (const zone of this.zones) {
      if (!zone.activo) continue

      // Verificar si la zona aplica al CP destino:
      // Si la lista de codigos_postales está vacía, se considera zona general por defecto
      // Si contiene códigos, debe haber coincidencia exacta del CP.
      const matchCp =
        !zone.codigos_postales ||
        zone.codigos_postales.length === 0 ||
        zone.codigos_postales.includes(cpDestino)

      if (!matchCp) continue

      // Validar límite de peso de la zona si está definido
      if (zone.peso_maximo_kg && input.pesoTotalKg > zone.peso_maximo_kg) {
        continue
      }

      options.push({
        optionId: `manual_${zone.id}`,
        provider: 'manual',
        serviceName: zone.nombre,
        serviceType: 'domicilio',
        costoCarrier: Number(zone.precio),
        precioFinal: Number(zone.precio),
        plazoTexto: zone.plazo_texto || undefined,
        carrierMetadata: {
          zoneId: zone.id,
        },
      })
    }

    if (options.length === 0) {
      // Si ninguna zona coincide, no hay cobertura manual
      return []
    }

    return options
  }

  async createShipment(input: ShipmentInput): Promise<ShipmentCreationResult> {
    // Los envíos manuales son gestionados por el propio dueño del negocio
    const manualShipmentId = `MAN-${input.orderId.slice(0, 8)}-${Date.now()}`

    return {
      providerShipmentId: manualShipmentId,
      tracking: manualShipmentId,
      trackingUrl: undefined,
      costoReal: input.carrierMetadata?.costoCarrier as number | undefined,
    }
  }

  async getTracking(_providerShipmentId: string): Promise<TrackingEvent[]> {
    return [
      {
        status: 'manual_registrado',
        descripcion: 'Envío manual registrado por el comercio.',
        fecha: new Date().toISOString(),
      },
    ]
  }

  async cancelShipment(_providerShipmentId: string): Promise<void> {
    // Sin acción externa para envíos manuales
  }
}
