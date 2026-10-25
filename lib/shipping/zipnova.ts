// =============================================================================
// PORTALMAKER — Adaptador Zipnova API v2 Argentina
// Documentación Oficial: https://docs.zipnova.com/
// Autenticación: HTTP Basic Auth (API Key : API Secret)
// Base URL: https://api.zipnova.com.ar/v2
// =============================================================================

import type {
  CarrierProvider,
  QuoteInput,
  QuoteOption,
  Branch,
  ShipmentInput,
  ShipmentCreationResult,
  TrackingEvent,
} from './types'
import { ShippingError } from './errors'
import { carrierFetch } from './http'

export interface ZipnovaCredentials {
  apiKey?: string
  secretKey?: string
  accountId?: string
  sandbox?: boolean
}

export class ZipnovaShippingProvider implements CarrierProvider {
  readonly type = 'zipnova' as const
  private credentials: ZipnovaCredentials
  private baseUrl = 'https://api.zipnova.com.ar/v2'

  constructor(credentials: ZipnovaCredentials) {
    this.credentials = credentials
  }

  /**
   * Genera el header Basic Auth estándar de Zipnova (API Key : API Secret en base64)
   */
  private getAuthHeader(): string {
    const key = this.credentials.apiKey?.trim() || ''
    const secret = this.credentials.secretKey?.trim() || ''
    return `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`
  }

  /**
   * Valida credenciales contra la API de Zipnova consultando el perfil/cuentas
   */
  async verifyCredentials(): Promise<{ ok: boolean; error?: string }> {
    if (!this.credentials.apiKey || !this.credentials.secretKey) {
      return { ok: false, error: 'Falta la API Key o el Secret Key de Zipnova' }
    }

    try {
      // Consultamos el endpoint oficial de cuentas para validar la autenticacion HTTP Basic
      const res = await carrierFetch<{ data?: unknown; error?: string }>(
        `${this.baseUrl}/accounts`,
        {
          method: 'GET',
          headers: {
            Authorization: this.getAuthHeader(),
            Accept: 'application/json',
          },
          timeoutMs: 8000,
          maxRetries: 1,
          sanitizedUrlForLogs: 'GET /v2/accounts',
        }
      )

      if (res.status === 200) {
        return { ok: true }
      }

      return { ok: false, error: 'Credenciales rechazadas por Zipnova' }
    } catch (err: unknown) {
      if (err instanceof ShippingError && (err.statusCode === 401 || err.statusCode === 403)) {
        return { ok: false, error: 'Credenciales de Zipnova inválidas (API Token o API Secret incorrectos).' }
      }

      const errorMsg =
        err instanceof ShippingError
          ? err.message
          : (err as Error)?.message || 'Error de conexión con Zipnova'
      return { ok: false, error: errorMsg }
    }
  }

  /**
   * Cotiza opciones de envío en Zipnova (POST /v2/shipments/quote)
   */
  async quote(input: QuoteInput): Promise<QuoteOption[]> {
    if (!this.credentials.apiKey || !this.credentials.secretKey) {
      throw new ShippingError('AUTH', 'Credenciales de Zipnova no configuradas.')
    }

    try {
      const pesoGramos = Math.max(100, Number((input.pesoTotalKg * 1000).toFixed(0)))
      const altoMax = Math.max(1, ...input.items.map((i) => i.alto_cm || 10))
      const anchoMax = Math.max(1, ...input.items.map((i) => i.ancho_cm || 10))
      const profMax = Math.max(1, ...input.items.map((i) => i.profundidad_cm || 10))
      const declaredVal = Math.max(1, Number(input.valorDeclaradoTotal.toFixed(2)))

      // Payload oficial Zipnova v2
      const payload: Record<string, any> = {
        declared_value: declaredVal,
        origin: {
          postal_code: input.origen.codigoPostal,
          street_name: input.origen.calle || '',
          street_number: input.origen.altura || '',
          city: input.origen.localidad || '',
          state: input.origen.provincia || '',
        },
        destination: {
          postal_code: input.destino.codigoPostal,
          zipcode: input.destino.codigoPostal,
          street_name: input.destino.calle || '',
          street_number: input.destino.altura || '',
          city: input.destino.localidad || '',
          state: input.destino.provincia || '',
        },
        packages: [
          {
            weight: pesoGramos,
            height: altoMax,
            width: anchoMax,
            length: profMax,
            classification_id: 1, // Mercadería general
            declared_value: declaredVal,
          },
        ],
      }

      if (this.credentials.accountId) {
        payload.account_id = this.credentials.accountId.trim()
      }

      const res = await carrierFetch<{
        data?: Array<{
          id?: string | number
          selectable?: boolean
          carrier?: { id?: number; name?: string; logo?: string }
          service_type?: { id?: number; code?: string; name?: string }
          delivery_time?: { min?: number; max?: number; estimated_delivery?: string }
          amounts?: {
            price?: number
            price_incl_tax?: number
            seller_price?: number
            seller_price_incl_tax?: number
          }
          rate?: { id?: number; tariff_id?: number }
          carrier_name?: string
          service_name?: string
          price?: number
        }>
        rates?: Array<any>
      }>(`${this.baseUrl}/shipments/quote`, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        timeoutMs: 8000,
        maxRetries: 1,
        sanitizedUrlForLogs: 'POST /v2/shipments/quote',
      })

      const rawRates = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data?.rates)
        ? res.data.rates
        : []

      const quoteOptions: QuoteOption[] = []

      for (const rate of rawRates) {
        const amounts = rate.amounts || {}
        const cost = Number(
          amounts.price_incl_tax ??
          amounts.price ??
          amounts.seller_price_incl_tax ??
          rate.price ??
          0
        )
        if (!cost || cost <= 0) continue

        const carrierName = rate.carrier?.name || rate.carrier_name || 'Zipnova'
        const serviceName = rate.service_type?.name || rate.service_name || 'Envío estándar'
        const isPickUp = rate.service_type?.code === 'pick_up' || rate.service_type?.code === 'drop_off'
        const serviceType = isPickUp ? 'sucursal' : 'domicilio'

        const minDias = rate.delivery_time?.min ?? 2
        const maxDias = rate.delivery_time?.max ?? 5
        const plazoTexto = `${minDias} a ${maxDias} días hábiles`

        const rateId = rate.rate?.id || rate.id || Math.random().toString(36).substring(7)

        quoteOptions.push({
          optionId: `zipnova_${rateId}`,
          provider: 'zipnova',
          serviceName: `${carrierName} - ${serviceName}`,
          serviceType,
          costoCarrier: cost,
          precioFinal: cost,
          plazoMinDias: minDias,
          plazoMaxDias: maxDias,
          plazoTexto,
          carrierMetadata: {
            rateId,
            carrierName,
            serviceName,
            rawRate: rate,
          },
        })
      }

      return quoteOptions
    } catch (err: unknown) {
      if (err instanceof ShippingError) throw err
      throw new ShippingError('UPSTREAM', 'Error al obtener tarifas de Zipnova', {
        details: (err as Error)?.message,
      })
    }
  }

  /**
   * Lista sucursales / drop-offs (GET /v2/locations)
   */
  async listBranches(input: { cp?: string; provincia?: string }): Promise<Branch[]> {
    if (!this.credentials.apiKey || !this.credentials.secretKey) {
      return []
    }

    try {
      const query = new URLSearchParams()
      if (input.cp) query.set('postal_code', input.cp)
      if (input.provincia) query.set('state', input.provincia)

      const res = await carrierFetch<{
        locations?: Array<{
          id: string
          name: string
          address?: {
            street_name?: string
            street_number?: string
            city?: string
            state?: string
            postal_code?: string
          }
        }>
      }>(`${this.baseUrl}/locations?${query.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
          Accept: 'application/json',
        },
        timeoutMs: 8000,
        maxRetries: 1,
        sanitizedUrlForLogs: 'GET /v2/locations',
      })

      const list = res.data.locations || []
      return list.map((loc) => ({
        branchId: loc.id,
        provider: 'zipnova',
        nombre: loc.name,
        direccion: `${loc.address?.street_name || ''} ${loc.address?.street_number || ''}`.trim(),
        localidad: loc.address?.city || '',
        provincia: loc.address?.state || '',
        codigoPostal: loc.address?.postal_code || '',
      }))
    } catch {
      return []
    }
  }

  /**
   * Emite el envío en Zipnova (POST /v2/shipments)
   */
  async createShipment(input: ShipmentInput): Promise<ShipmentCreationResult> {
    if (!this.credentials.apiKey || !this.credentials.secretKey) {
      throw new ShippingError('AUTH', 'Credenciales de Zipnova incompletas.')
    }

    const payload = {
      external_reference: input.orderId,
      origin: {
        postal_code: input.origen.codigoPostal,
        street_name: input.origen.calle || '',
        street_number: input.origen.altura || '',
        city: input.origen.localidad || '',
        state: input.origen.provincia || '',
        phone: input.origen.telefono || '',
        email: input.origen.email || '',
      },
      destination: {
        postal_code: input.destinatario.codigoPostal,
        street_name: input.destinatario.calle,
        street_number: input.destinatario.altura,
        floor_apartment: input.destinatario.piso || '',
        city: input.destinatario.localidad,
        state: input.destinatario.provincia,
        contact_name: input.destinatario.nombre,
        contact_email: input.destinatario.email,
        contact_phone: input.destinatario.telefono,
        identification_number: input.destinatario.documento || '',
      },
      packages: [
        {
          weight: Number((input.pesoTotalKg * 1000).toFixed(0)),
          declared_value: input.valorDeclaradoTotal,
        },
      ],
    }

    const res = await carrierFetch<{
      id: string
      tracking_number?: string
      tracking_url?: string
      cost?: number
      label_url?: string
    }>(`${this.baseUrl}/shipments`, {
      method: 'POST',
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      timeoutMs: 8000,
      maxRetries: 1,
      sanitizedUrlForLogs: 'POST /v2/shipments',
    })

    return {
      providerShipmentId: res.data.id,
      tracking: res.data.tracking_number,
      trackingUrl: res.data.tracking_url,
      costoReal: res.data.cost,
      labelUrl: res.data.label_url,
      rawResponse: { id: res.data.id, tracking: res.data.tracking_number },
    }
  }

  /**
   * Obtiene la etiqueta del envío (GET /v2/shipments/{id}/label.pdf)
   */
  async getLabel(providerShipmentId: string): Promise<{ pdf?: ArrayBuffer; url?: string }> {
    return {
      url: `${this.baseUrl}/shipments/${providerShipmentId}/label.pdf`,
    }
  }

  /**
   * Obtiene el tracking (GET /v2/shipments/{id}/tracking)
   */
  async getTracking(providerShipmentId: string): Promise<TrackingEvent[]> {
    try {
      const res = await carrierFetch<{
        events?: Array<{
          status: string
          description?: string
          date: string
          location?: string
        }>
      }>(`${this.baseUrl}/shipments/${providerShipmentId}/tracking`, {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
          Accept: 'application/json',
        },
        timeoutMs: 8000,
        maxRetries: 1,
        sanitizedUrlForLogs: 'GET /v2/shipments/:id/tracking',
      })

      const rawEvents = res.data.events || []
      return rawEvents.map((e) => ({
        status: e.status,
        descripcion: e.description || e.status,
        fecha: e.date,
        ubicacion: e.location,
      }))
    } catch {
      return [
        {
          status: 'generado',
          descripcion: 'Envío generado en Zipnova.',
          fecha: new Date().toISOString(),
        },
      ]
    }
  }

  async cancelShipment(providerShipmentId: string): Promise<void> {
    await carrierFetch(`${this.baseUrl}/shipments/${providerShipmentId}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: this.getAuthHeader(),
        Accept: 'application/json',
      },
      timeoutMs: 8000,
      maxRetries: 1,
      sanitizedUrlForLogs: 'POST /v2/shipments/:id/cancel',
    })
  }
}
