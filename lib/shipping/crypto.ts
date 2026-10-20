// =============================================================================
// PORTALMAKER — Módulo de cifrado AES-256-GCM para credenciales de carriers (Fase 2)
// Utiliza node:crypto nativo. Clave derivada de variable SHIPPING_ENC_KEY (base64 de 32 bytes).
// Formato almacenado: iv.ciphertext (con tag de autenticación de 16 bytes al final del ciphertext).
// =============================================================================

import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH_BYTES = 12 // 96 bits recomendado para GCM
const AUTH_TAG_LENGTH_BYTES = 16 // 128 bits estándar

/**
 * Obtiene la clave de cifrado de 32 bytes desde la variable de entorno SHIPPING_ENC_KEY.
 * En entornos de test/desarrollo local, si no está configurada, genera una advertencia
 * o permite derivar una para evitar caídas durante pruebas unitarias.
 */
function getEncryptionKey(): Buffer {
  const rawKey = process.env.SHIPPING_ENC_KEY

  if (!rawKey) {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      // Clave determinista de 32 bytes solo para pruebas unitarias de vitest
      return Buffer.from('01234567890123456789012345678901', 'utf-8')
    }
    throw new Error('Variable de entorno SHIPPING_ENC_KEY no configurada.')
  }

  const keyBuffer = Buffer.from(rawKey, 'base64')
  if (keyBuffer.length !== 32) {
    throw new Error('SHIPPING_ENC_KEY debe ser un string Base64 que decodifique a exactamente 32 bytes.')
  }

  return keyBuffer
}

/**
 * Cifra un texto o payload JSON usando AES-256-GCM.
 * Retorna formato: "ivBase64.ciphertextWithTagBase64"
 */
export function encryptCarrierCredentials(plainText: string): string {
  if (!plainText) {
    throw new Error('El texto a cifrar no puede estar vacío.')
  }

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH_BYTES)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  })

  const encryptedBuffer = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()
  // Combinar el ciphertext con el authTag
  const combinedCiphertext = Buffer.concat([encryptedBuffer, authTag])

  return `${iv.toString('base64')}.${combinedCiphertext.toString('base64')}`
}

/**
 * Descifra credenciales en formato "ivBase64.ciphertextWithTagBase64".
 * Lanza error si el tag de autenticación no coincide o el formato es inválido.
 */
export function decryptCarrierCredentials(encryptedPayload: string): string {
  if (!encryptedPayload || !encryptedPayload.includes('.')) {
    throw new Error('Payload cifrado inválido: formato esperado "iv.ciphertext".')
  }

  const [ivBase64, combinedBase64] = encryptedPayload.split('.')
  if (!ivBase64 || !combinedBase64) {
    throw new Error('Componentes de payload cifrado incompletos.')
  }

  const key = getEncryptionKey()
  const iv = Buffer.from(ivBase64, 'base64')
  const combinedBuffer = Buffer.from(combinedBase64, 'base64')

  if (iv.length !== IV_LENGTH_BYTES) {
    throw new Error(`IV inválido: esperado ${IV_LENGTH_BYTES} bytes.`)
  }

  if (combinedBuffer.length < AUTH_TAG_LENGTH_BYTES) {
    throw new Error('Ciphertext corrupto o demasiado corto.')
  }

  // Separar el ciphertext del tag de 16 bytes al final
  const ciphertext = combinedBuffer.subarray(0, combinedBuffer.length - AUTH_TAG_LENGTH_BYTES)
  const authTag = combinedBuffer.subarray(combinedBuffer.length - AUTH_TAG_LENGTH_BYTES)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  })

  decipher.setAuthTag(authTag)

  const decryptedBuffer = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decryptedBuffer.toString('utf8')
}
