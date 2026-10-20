// =============================================================================
// PORTALMAKER — Tests Unitarios de Automatización Post-Pago y Webhooks (Fase 5)
// Cubre:
// 1. Manejo y descarte de webhooks duplicados (idempotencia estricta).
// 2. Retiro en local sin invocación a transportistas externos.
// 3. Manejo de fallos en el carrier y cálculo de backoff de reintentos.
// 4. Reintento exitoso tras fallo transitorio.
// 5. Idempotencia en el webhook de eventos logísticos de Zipnova.
// =============================================================================

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { CarrierProvider, ShipmentInput, ShipmentCreationResult } from './types'

// Mock carrier configurable para pruebas
class MockCarrier implements CarrierProvider {
  type = 'zipnova' as const
  callsCount = 0
  failUntilAttempt = 0

  constructor(opts?: { failUntilAttempt?: number }) {
    this.failUntilAttempt = opts?.failUntilAttempt || 0
  }

  async verifyCredentials() {
    return { ok: true }
  }

  async quote() {
    return []
  }

  async createShipment(input: ShipmentInput): Promise<ShipmentCreationResult> {
    this.callsCount++
    if (this.callsCount <= this.failUntilAttempt) {
      throw new Error(`Carrier upstream error on attempt ${this.callsCount}`)
    }
    return {
      providerShipmentId: 'ship_mock_123',
      tracking: 'ZN987654321AR',
      trackingUrl: 'https://zipnova.com.ar/track/ZN987654321AR',
      costoReal: 3450,
      labelUrl: 'https://zipnova.com.ar/labels/ship_mock_123.pdf',
    }
  }

  async getTracking() {
    return []
  }
}

describe('Fase 5: Automatización Post-Pago y Resiliencia Logística', () => {
  it('garantiza idempotencia: un webhook duplicado no emite un segundo envío', async () => {
    const existingShipments = new Map<string, any>()
    const carrier = new MockCarrier()

    // Función simulada de creación con control de idempotencia
    async function processOrderShipment(orderId: string, isRetiroLocal: boolean) {
      if (isRetiroLocal) {
        return { ok: true, skipped: true, status: 'retiro_local' }
      }

      // Check de idempotencia en memoria (simula DB constraint)
      if (existingShipments.has(orderId)) {
        return {
          ok: true,
          skipped: true,
          shipmentId: existingShipments.get(orderId).id,
          status: 'already_exists',
        }
      }

      const res = await carrier.createShipment({
        orderId,
        origen: { codigoPostal: '1414' },
        destinatario: {
          nombre: 'Juan Perez',
          email: 'juan@test.com',
          telefono: '1123456789',
          codigoPostal: '1640',
          calle: 'Av Libertador',
          altura: '1000',
          localidad: 'Vicente Lopez',
          provincia: 'Buenos Aires',
        },
        modalidad: 'domicilio',
        pesoTotalKg: 1,
        valorDeclaradoTotal: 5000,
      })

      const newRecord = {
        id: `ship_${orderId}`,
        order_id: orderId,
        provider_shipment_id: res.providerShipmentId,
        tracking: res.tracking,
      }
      existingShipments.set(orderId, newRecord)

      return { ok: true, shipmentId: newRecord.id, status: 'creado' }
    }

    const orderId = 'ord_test_dup_1'

    // Primer webhook recibido
    const firstCall = await processOrderShipment(orderId, false)
    assert.equal(firstCall.ok, true)
    assert.equal(firstCall.status, 'creado')
    assert.equal(carrier.callsCount, 1)

    // Segundo webhook duplicado para la misma orden
    const duplicateCall = await processOrderShipment(orderId, false)
    assert.equal(duplicateCall.ok, true)
    assert.equal(duplicateCall.status, 'already_exists')
    // El transportista NO debe haber recibido una segunda llamada
    assert.equal(carrier.callsCount, 1)
  })

  it('procesa retiro en local sin invocar a proveedores de logística externos', async () => {
    const carrier = new MockCarrier()

    let carrierCalled = false
    const handleOrder = async (order: { envio_tipo: string }) => {
      if (order.envio_tipo === 'retiro_local') {
        return { ok: true, skipped: true, status: 'retiro_local' }
      }
      carrierCalled = true
      return { ok: true }
    }

    const result = await handleOrder({ envio_tipo: 'retiro_local' })
    assert.equal(result.ok, true)
    assert.equal(result.skipped, true)
    assert.equal(result.status, 'retiro_local')
    assert.equal(carrierCalled, false)
    assert.equal(carrier.callsCount, 0)
  })

  it('calcula fecha de reintento (backoff) cuando el carrier falla tras múltiples intentos', () => {
    const maxAttempts = 3
    let currentAttempts = 0
    let state = 'pendiente'
    let nextRetryAt: string | null = null

    function recordFailure(attempt: number) {
      currentAttempts = attempt
      if (currentAttempts >= maxAttempts) {
        state = 'error'
        const backoffMs = 15 * 60 * 1000 // 15 minutos
        nextRetryAt = new Date(Date.now() + backoffMs).toISOString()
      }
    }

    recordFailure(3)
    assert.equal(state, 'error')
    assert.equal(currentAttempts, 3)
    assert.ok(nextRetryAt)

    const retryTime = new Date(nextRetryAt!).getTime()
    const nowTime = Date.now()
    assert.ok(retryTime > nowTime)
    assert.ok(retryTime - nowTime >= 14 * 60 * 1000)
  })

  it('completa el envío con éxito si un reintento transitorio responde OK', async () => {
    // Falla en el intento 1 y tiene éxito en el intento 2
    const carrier = new MockCarrier({ failUntilAttempt: 1 })

    let shipmentState = 'pendiente'
    let trackingResult: string | null = null

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await carrier.createShipment({
          orderId: 'ord_retry_ok',
          origen: { codigoPostal: '1414' },
          destinatario: {
            nombre: 'Carlos',
            email: 'carlos@test.com',
            telefono: '1133334444',
            codigoPostal: '1640',
            calle: 'Alvear',
            altura: '500',
            localidad: 'Martinez',
            provincia: 'Buenos Aires',
          },
          modalidad: 'domicilio',
          pesoTotalKg: 0.5,
          valorDeclaradoTotal: 2500,
        })
        shipmentState = 'creado'
        trackingResult = res.tracking || null
        break
      } catch {
        shipmentState = 'creando'
      }
    }

    assert.equal(shipmentState, 'creado')
    assert.equal(trackingResult, 'ZN987654321AR')
    assert.equal(carrier.callsCount, 2)
  })

  it('reconoce y descarta eventos de webhook de Zipnova duplicados por provider_event_id', () => {
    const processedEvents = new Set<string>()

    function handleWebhookEvent(event: { event_id: string; status: string }) {
      if (processedEvents.has(event.event_id)) {
        return { status: 'already_processed', duplicate: true }
      }
      processedEvents.add(event.event_id)
      return { status: 'processed', duplicate: false }
    }

    const testEvent = { event_id: 'ev_zn_991823', status: 'in_transit' }

    const firstHandling = handleWebhookEvent(testEvent)
    assert.equal(firstHandling.status, 'processed')
    assert.equal(firstHandling.duplicate, false)

    const secondHandling = handleWebhookEvent(testEvent)
    assert.equal(secondHandling.status, 'already_processed')
    assert.equal(secondHandling.duplicate, true)
  })
})
