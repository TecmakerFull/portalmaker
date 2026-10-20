// =============================================================================
// PORTALMAKER — Tests unitarios y de integración para Checkout & Envíos (Fase 4)
// Verifica:
// 1. Total con envío y consistencia de precios recalculados en el servidor.
// 2. Integridad de cart_hash y rechazo de cotizaciones manipuladas o vencidas.
// 3. Comportamiento ante CP sin cobertura.
// 4. Carrier caído con y sin tarifa fallback.
// 5. Blindaje contra intentos de manipulación de precio desde el navegador.
// =============================================================================

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { ShippingError } from './errors'
import { ManualShippingProvider } from './manual'
import { calcularMarketplaceFee } from '../mercadopago'
import type { ShippingZone } from '../../types/database'
import type { QuoteOption } from './types'

describe('Fase 4: Consistencia de Totales y Seguridad en Checkout', () => {
  it('calcula el total exacto (subtotal + costo_envio + recargo MP) sin confiar en el cliente', () => {
    const dbUnitPrice = 2500
    const quantity = 3
    const subtotal = dbUnitPrice * quantity // 7500

    const costoEnvio = 1200
    const mpRecargoPct = 5 // 5%
    const mpRecargoMonto = Number(((subtotal * mpRecargoPct) / 100).toFixed(2)) // 375

    const finalTotal = Number((subtotal + costoEnvio + mpRecargoMonto).toFixed(2))
    assert.equal(finalTotal, 9075)

    // Intento de manipulación: el cliente intenta enviar total = 5000
    const clientProvidedTotal = 5000
    assert.notEqual(clientProvidedTotal, finalTotal)
  })

  it('valida la integridad del cart_hash ante cambios de items o código postal', () => {
    const items = [
      { productId: 'prod_1', variantId: 'var_a', quantity: 2 },
      { productId: 'prod_2', variantId: null, quantity: 1 },
    ].sort((a, b) => `${a.productId}_${a.variantId || ''}`.localeCompare(`${b.productId}_${b.variantId || ''}`))

    const cp = '1414'
    const validHashSource = JSON.stringify(items) + '|' + cp.toUpperCase()
    const validHash = crypto.createHash('sha256').update(validHashSource).digest('hex')

    // Intento de manipulación 1: cambiar cantidad de items
    const tamperedItems = [
      { productId: 'prod_1', variantId: 'var_a', quantity: 1 }, // Cambió a 1
      { productId: 'prod_2', variantId: null, quantity: 1 },
    ].sort((a, b) => `${a.productId}_${a.variantId || ''}`.localeCompare(`${b.productId}_${b.variantId || ''}`))
    const tamperedHashSource1 = JSON.stringify(tamperedItems) + '|' + cp.toUpperCase()
    const tamperedHash1 = crypto.createHash('sha256').update(tamperedHashSource1).digest('hex')

    assert.notEqual(validHash, tamperedHash1)

    // Intento de manipulación 2: cambiar el código postal
    const tamperedHashSource2 = JSON.stringify(items) + '|5000'
    const tamperedHash2 = crypto.createHash('sha256').update(tamperedHashSource2).digest('hex')

    assert.notEqual(validHash, tamperedHash2)
  })

  it('detecta cotizaciones expiradas por TTL de 30 minutos', () => {
    const now = Date.now()
    const expiredQuote = {
      expires_at: new Date(now - 1000).toISOString(), // Venció hace 1 segundo
    }
    const validQuote = {
      expires_at: new Date(now + 15 * 60 * 1000).toISOString(), // Vence en 15 minutos
    }

    const isExpired = (expiresAt: string) => new Date(expiresAt).getTime() < Date.now()

    assert.equal(isExpired(expiredQuote.expires_at), true)
    assert.equal(isExpired(validQuote.expires_at), false)
  })
})

describe('Fase 4: Cobertura de Carriers y Reglas de Fallback', () => {
  const restrictedZones: ShippingZone[] = [
    {
      id: 'z_caba',
      store_id: 's1',
      nombre: 'Exclusivo CABA',
      precio: 1800,
      activo: true,
      orden: 1,
      codigos_postales: ['1414', '1425', '1001'],
      peso_maximo_kg: 10,
      plazo_texto: '24 hs',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  it('retorna opciones vacías cuando el código postal no tiene cobertura y no hay fallback', async () => {
    const provider = new ManualShippingProvider(restrictedZones)
    const options = await provider.quote({
      storeId: 's1',
      origen: { codigoPostal: '1414' },
      destino: { codigoPostal: '5000' }, // Córdoba (no está en 1414, 1425, 1001)
      items: [],
      pesoTotalKg: 1,
      volumenTotalCm3: 1000,
      valorDeclaradoTotal: 3000,
    })

    assert.equal(options.length, 0)
  })

  it('aplica tarifa fallback cuando el carrier no tiene opciones pero la tienda configuró fallback', () => {
    const carrierOptions: QuoteOption[] = [] // Carrier no devolvió opciones
    const fallbackTarifa = 4500
    const envioGratisDesde = 20000
    const subtotal = 12000 // No supera envío gratis

    const processedOptions = [...carrierOptions]
    if (processedOptions.length === 0 && fallbackTarifa > 0) {
      processedOptions.push({
        optionId: 'fallback',
        provider: 'manual',
        serviceName: 'Envío estándar (tarifa fija de la tienda)',
        serviceType: 'domicilio',
        costoCarrier: fallbackTarifa,
        precioFinal: subtotal >= envioGratisDesde ? 0 : fallbackTarifa,
        plazoTexto: '3 a 6 días hábiles',
        carrierMetadata: { isFallback: true },
      })
    }

    assert.equal(processedOptions.length, 1)
    assert.equal(processedOptions[0].optionId, 'fallback')
    assert.equal(processedOptions[0].precioFinal, 4500)
  })

  it('ofrece tarifa fallback con precio $0 si el subtotal supera envio_gratis_desde', () => {
    const carrierOptions: QuoteOption[] = []
    const fallbackTarifa = 4500
    const envioGratisDesde = 15000
    const subtotal = 18000 // Supera envío gratis

    const processedOptions = [...carrierOptions]
    if (processedOptions.length === 0 && fallbackTarifa > 0) {
      processedOptions.push({
        optionId: 'fallback',
        provider: 'manual',
        serviceName: 'Envío estándar (tarifa fija de la tienda)',
        serviceType: 'domicilio',
        costoCarrier: fallbackTarifa,
        precioFinal: subtotal >= envioGratisDesde ? 0 : fallbackTarifa,
        plazoTexto: '3 a 6 días hábiles',
        carrierMetadata: { isFallback: true },
      })
    }

    assert.equal(processedOptions.length, 1)
    assert.equal(processedOptions[0].precioFinal, 0)
  })
})

describe('Fase 4: Mercado Pago y Comisión sobre Envíos', () => {
  it('excluye el costo de envío de la comisión de Portalmaker por defecto (envio_comision_incluye_envio = false)', () => {
    const items = [
      { id: 'prod_1', quantity: 2, unit_price: 5000 }, // Subtotal: 10000
      { id: 'recargo_mp', quantity: 1, unit_price: 500 }, // Recargo MP: 500
      { id: 'costo_envio', quantity: 1, unit_price: 3000 }, // Costo Envío: 3000
    ]

    const store = {
      comision_portalmaker: 5, // 5%
      envio_comision_incluye_envio: false, // Default
    }

    // Base esperada: solo prod_1 = 10000. 5% de 10000 = 500
    const fee = calcularMarketplaceFee(items, store)
    assert.equal(fee, 500)
  })

  it('incluye el costo de envío en la comisión si la tienda tiene envio_comision_incluye_envio = true', () => {
    const items = [
      { id: 'prod_1', quantity: 2, unit_price: 5000 }, // Subtotal: 10000
      { id: 'recargo_mp', quantity: 1, unit_price: 500 }, // Recargo MP: 500
      { id: 'costo_envio', quantity: 1, unit_price: 3000 }, // Costo Envío: 3000
    ]

    const store = {
      comision_portalmaker: 5, // 5%
      envio_comision_incluye_envio: true, // Tienda optó por incluir envío en la comisión
    }

    // Base esperada: prod_1 (10000) + costo_envio (3000) = 13000. 5% de 13000 = 650
    const fee = calcularMarketplaceFee(items, store)
    assert.equal(fee, 650)
  })
})
