// =============================================================================
// PORTALMAKER — Tests unitarios para el módulo de envíos (Fase 2)
// Verifica:
// 1. Cifrado y descifrado AES-256-GCM (integridad y fallos con tags adulterados).
// 2. Errores tipados y cliente HTTP (timeouts y reintentos).
// 3. Adaptador de envíos manuales (coincidencia de CP y peso).
// =============================================================================

import { describe, it, expect, vi } from 'vitest'
import { encryptCarrierCredentials, decryptCarrierCredentials } from './crypto'
import { ShippingError } from './errors'
import { carrierFetch } from './http'
import { ManualShippingProvider } from './manual'
import type { ShippingZone } from '@/types/database'

describe('Shipping Crypto (AES-256-GCM)', () => {
  it('cifra y descifra texto plano y JSON correctamente', () => {
    const original = JSON.stringify({ apiKey: 'zip_test_12345', secret: 'sec_abcdef' })
    const encrypted = encryptCarrierCredentials(original)

    expect(encrypted).toContain('.')
    const [iv, ciphertext] = encrypted.split('.')
    expect(iv).toBeDefined()
    expect(ciphertext).toBeDefined()

    const decrypted = decryptCarrierCredentials(encrypted)
    expect(decrypted).toBe(original)
    expect(JSON.parse(decrypted)).toEqual({ apiKey: 'zip_test_12345', secret: 'sec_abcdef' })
  })

  it('falla al intentar descifrar con payload corrupto o adulterado', () => {
    const original = 'credenciales_secretas'
    const encrypted = encryptCarrierCredentials(original)
    const [iv, ciphertext] = encrypted.split('.')

    // Adulterar el ciphertext
    const tampered = `${iv}.${ciphertext.slice(0, -4)}XXXX`
    expect(() => decryptCarrierCredentials(tampered)).toThrow()
  })

  it('falla ante cadenas vacías o sin formato iv.ciphertext', () => {
    expect(() => decryptCarrierCredentials('')).toThrow()
    expect(() => decryptCarrierCredentials('invalid_payload_without_dot')).toThrow()
  })
})

describe('Shipping HTTP & Errors', () => {
  it('identifica correctamente las instancias de ShippingError', () => {
    const err = new ShippingError('AUTH', 'Credenciales inválidas', { statusCode: 401 })
    expect(err).toBeInstanceOf(ShippingError)
    expect(err.code).toBe('AUTH')
    expect(err.statusCode).toBe(401)
  })

  it('maneja timeouts emitiendo ShippingError TIMEOUT', async () => {
    // Mock de fetch nativo con retardo mayor al timeoutMs
    const slowFetch = vi.fn().mockImplementation((url, opts) => {
      return new Promise((resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          const abortError = new Error('The operation was aborted')
          abortError.name = 'AbortError'
          reject(abortError)
        })
      })
    })

    vi.stubGlobal('fetch', slowFetch)

    await expect(
      carrierFetch('https://api.carrier.example/test', { timeoutMs: 100, maxRetries: 0 })
    ).rejects.toThrowError(ShippingError)

    vi.unstubAllGlobals()
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
    expect(options.length).toBe(2)
    expect(options.some((o) => o.serviceName === 'CABA y Alrededores')).toBe(true)
    expect(options.some((o) => o.serviceName === 'Envíos Nacionales')).toBe(true)
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

    expect(options.length).toBe(1)
    expect(options[0].serviceName).toBe('Envíos Nacionales')
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

    expect(result.providerShipmentId).toBeDefined()
    expect(result.providerShipmentId.startsWith('MAN-')).toBe(true)
  })
})
