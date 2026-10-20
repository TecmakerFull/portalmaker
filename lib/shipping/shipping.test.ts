// =============================================================================
// PORTALMAKER — Tests unitarios para el módulo de envíos (Fase 2)
// Verifica:
// 1. Cifrado y descifrado AES-256-GCM (integridad y fallos con tags adulterados).
// 2. Errores tipados y cliente HTTP (timeouts y reintentos).
// 3. Adaptador de envíos manuales (coincidencia de CP y peso).
// =============================================================================

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { encryptCarrierCredentials, decryptCarrierCredentials } from './crypto'
import { ShippingError } from './errors'
import { carrierFetch } from './http'
import { ManualShippingProvider } from './manual'
import type { ShippingZone } from '@/types/database'

describe('Shipping Crypto (AES-256-GCM)', () => {
  it('cifra y descifra texto plano y JSON correctamente', () => {
    const original = JSON.stringify({ apiKey: 'zip_test_12345', secret: 'sec_abcdef' })
    const encrypted = encryptCarrierCredentials(original)

    assert.ok(encrypted.includes('.'))
    const [iv, ciphertext] = encrypted.split('.')
    assert.ok(iv)
    assert.ok(ciphertext)

    const decrypted = decryptCarrierCredentials(encrypted)
    assert.equal(decrypted, original)
    assert.deepEqual(JSON.parse(decrypted), { apiKey: 'zip_test_12345', secret: 'sec_abcdef' })
  })

  it('falla al intentar descifrar con payload corrupto o adulterado', () => {
    const original = 'credenciales_secretas'
    const encrypted = encryptCarrierCredentials(original)
    const [iv, ciphertext] = encrypted.split('.')

    // Adulterar el ciphertext
    const tampered = `${iv}.${ciphertext.slice(0, -4)}XXXX`
    assert.throws(() => decryptCarrierCredentials(tampered))
  })

  it('falla ante cadenas vacías o sin formato iv.ciphertext', () => {
    assert.throws(() => decryptCarrierCredentials(''))
    assert.throws(() => decryptCarrierCredentials('invalid_payload_without_dot'))
  })
})

describe('Shipping HTTP & Errors', () => {
  it('identifica correctamente las instancias de ShippingError', () => {
    const err = new ShippingError('AUTH', 'Credenciales inválidas', { statusCode: 401 })
    assert.ok(err instanceof ShippingError)
    assert.equal(err.code, 'AUTH')
    assert.equal(err.statusCode, 401)
  })

  it('maneja timeouts emitiendo ShippingError TIMEOUT', async () => {
    const originalFetch = globalThis.fetch
    // Mock de fetch nativo con retardo mayor al timeoutMs
    globalThis.fetch = (async (_url: any, opts?: any) => {
      return new Promise((_resolve, reject) => {
        opts?.signal?.addEventListener('abort', () => {
          const abortError = new Error('The operation was aborted')
          abortError.name = 'AbortError'
          reject(abortError)
        })
      })
    }) as any

    try {
      await assert.rejects(
        async () => {
          await carrierFetch('https://api.carrier.example/test', { timeoutMs: 100, maxRetries: 0 })
        },
        (err: any) => {
          return err instanceof ShippingError && err.code === 'TIMEOUT'
        }
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe('ManualShippingProvider', () => {
  const mockZones: ShippingZone[] = [
    {
      id: 'z1',
      store_id: 's1',
      nombre: 'CABA y Alrededores',
      precio: 1500,
      activo: true,
      orden: 1,
      codigos_postales: ['1414', '1425', '1001'],
      peso_maximo_kg: 5,
      plazo_texto: '24 a 48 hs',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'z2',
      store_id: 's1',
      nombre: 'Envíos Nacionales',
      precio: 3500,
      activo: true,
      orden: 2,
      codigos_postales: [], // Aplica a todo CP
      peso_maximo_kg: 20,
      plazo_texto: '3 a 5 días hábiles',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  it('cotiza zona específica cuando el código postal coincide', async () => {
    const provider = new ManualShippingProvider(mockZones)
    const options = await provider.quote({
      storeId: 's1',
      origen: { codigoPostal: '1414' },
      destino: { codigoPostal: '1414' },
      items: [],
      pesoTotalKg: 2,
      volumenTotalCm3: 1000,
      valorDeclaradoTotal: 5000,
    })

    // Debe incluir tanto la zona específica (1414) como la nacional general
    assert.equal(options.length, 2)
    assert.ok(options.some((o) => o.serviceName === 'CABA y Alrededores'))
    assert.ok(options.some((o) => o.serviceName === 'Envíos Nacionales'))
  })

  it('no ofrece zonas cuyo peso máximo sea excedido', async () => {
    const provider = new ManualShippingProvider(mockZones)
    const options = await provider.quote({
      storeId: 's1',
      origen: { codigoPostal: '1414' },
      destino: { codigoPostal: '1414' },
      items: [],
      pesoTotalKg: 8, // Supera los 5 kg de z1
      volumenTotalCm3: 2000,
      valorDeclaradoTotal: 5000,
    })

    assert.equal(options.length, 1)
    assert.equal(options[0].serviceName, 'Envíos Nacionales')
  })

  it('crea el envío manual asignando un identificador de seguimiento local', async () => {
    const provider = new ManualShippingProvider(mockZones)
    const result = await provider.createShipment({
      orderId: '00000000-0000-0000-0000-000000000001',
      storeId: 's1',
      provider: 'manual',
      serviceType: 'domicilio',
      origen: { codigoPostal: '1414' },
      destinatario: {
        nombre: 'Comprador Test',
        email: 'test@example.com',
        telefono: '1122334455',
        calle: 'Av. Corrientes',
        altura: '1234',
        localidad: 'CABA',
        provincia: 'Buenos Aires',
        codigoPostal: '1414',
      },
      items: [],
      pesoTotalKg: 1,
      volumenTotalCm3: 500,
      valorDeclaradoTotal: 1000,
    })

    assert.ok(result.providerShipmentId)
    assert.ok(result.providerShipmentId.startsWith('MAN-'))
  })
})
