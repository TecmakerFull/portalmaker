/**
 * PORTALMAKER — Script de validación de evidencia para Ronda 7
 * Cumple con todas las guardas de seguridad y reglas de ejecución.
 */
import fs from 'fs'
import path from 'path'
import http from 'http'
import { NextRequest } from 'next/server'

// 1. Cargar variables de entorno locales
const envLocalPath = path.resolve(__dirname, '../.env.local')
let projectRef = ''
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8')
  content.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim()
      let val = trimmed.slice(eqIdx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  })
  const match = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').match(/https?:\/\/([^.]+)\.supabase\.co/)
  if (match) projectRef = match[1]
}

if (process.env.ALLOW_TEST_SCRIPTS !== '1') {
  console.error('[ABORT] ALLOW_TEST_SCRIPTS no está establecido en 1. Ejecución cancelada por seguridad.')
  process.exit(1)
}

const allowedRefs = (process.env.TEST_ALLOWED_PROJECT_REFS || '').split(',').map(s => s.trim()).filter(Boolean)
if (!projectRef || !allowedRefs.includes(projectRef)) {
  console.error(`[ABORT] Project ref "${projectRef}" no está autorizado en TEST_ALLOWED_PROJECT_REFS (${process.env.TEST_ALLOWED_PROJECT_REFS}). Abortando por seguridad.`)
  process.exit(1)
}

console.log(`[INFO] Guard clause superada. Project Ref autorizado: ${projectRef}`)

async function runTests() {
  console.log('\n=== INICIANDO SUITE DE PRUEBAS RONDA 7 ===\n')

  // =========================================================================
  // TEST 9g: Middleware y cabeceras
  // =========================================================================
  console.log('--- TEST 9g: Middleware y cabeceras ---')
  const { middleware } = await import('../middleware')

  // a) Header falsificado x-store-slug hacia portal
  const reqSpoofed = new NextRequest('http://portalmaker.com.ar/', {
    headers: {
      'host': 'portalmaker.com.ar',
      'x-store-slug': 'hacked-store',
      'x-store-domain': 'fake.com',
      'x-tenant-source': 'malicious',
    },
  })
  const resSpoofed = middleware(reqSpoofed)
  console.log('[9g.1] Header entrante x-store-slug eliminado en portal:', resSpoofed.headers.get('x-store-slug') === null ? 'PASS' : 'FAIL')

  // b) ?tenant= en producción
  const prevEnv = process.env.NODE_ENV
  ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'
  const reqTenantProd = new NextRequest('http://portalmaker.com.ar/?tenant=tecmaker3d', {
    headers: { 'host': 'portalmaker.com.ar' },
  })
  const resTenantProd = middleware(reqTenantProd)
  console.log('[9g.2] ?tenant= ignorado en host de producción con NODE_ENV=production:', resTenantProd.headers.get('x-tenant-source') === null ? 'PASS' : 'FAIL')
  ;(process.env as Record<string, string | undefined>).NODE_ENV = prevEnv

  // c) Cabeceras de seguridad globales
  const reqSec = new NextRequest('http://portalmaker.com.ar/', {
    headers: { 'host': 'portalmaker.com.ar' },
  })
  const resSec = middleware(reqSec)
  console.log('[9g.3] X-Content-Type-Options:', resSec.headers.get('X-Content-Type-Options') === 'nosniff' ? 'PASS (nosniff)' : 'FAIL')
  console.log('[9g.4] Referrer-Policy:', resSec.headers.get('Referrer-Policy') === 'strict-origin-when-cross-origin' ? 'PASS (strict-origin-when-cross-origin)' : 'FAIL')
  console.log('[9g.5] CSP frame-ancestors:', resSec.headers.get('Content-Security-Policy') === "frame-ancestors 'self'" ? "PASS (frame-ancestors 'self')" : 'FAIL')
  console.log('[9g.6] Permissions-Policy:', resSec.headers.get('Permissions-Policy') === 'camera=(), microphone=(), geolocation=()' ? 'PASS (camera=(), microphone=(), geolocation=())' : 'FAIL')

  // =========================================================================
  // TEST 9f: Validaciones en /api/checkout/orders
  // =========================================================================
  console.log('\n--- TEST 9f: Validaciones en /api/checkout/orders ---')
  const ordersRoute = await import('../app/api/checkout/orders/route')

  // 1. Método de pago no permitido
  const reqBadMethod = new NextRequest('http://localhost:3000/api/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      storeId: '00000000-0000-0000-0000-000000000000',
      nombreComprador: 'Comprador Test',
      emailComprador: 'test@example.com',
      telefonoComprador: '123456789',
      tipoEntrega: 'retiro',
      metodoPago: 'cripto_invalido',
      items: [{ productoId: '00000000-0000-0000-0000-000000000001', cantidad: 1, precioUnitario: 100 }],
    }),
  })
  const resBadMethod = await ordersRoute.POST(reqBadMethod)
  const jsonBadMethod = await resBadMethod.json()
  console.log('[9f.1] Método de pago inválido rechazado (400):', resBadMethod.status === 400 && jsonBadMethod.error.includes('no válido') ? 'PASS' : 'FAIL')

  // 2. Cantidad excesiva (1e9)
  const reqBadQty = new NextRequest('http://localhost:3000/api/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      storeId: '00000000-0000-0000-0000-000000000000',
      nombre: 'Comprador Test',
      email: 'test@example.com',
      telefono: '123456789',
      tipoEntrega: 'retiro',
      metodoPago: 'efectivo',
      items: [{ productId: '00000000-0000-0000-0000-000000000001', quantity: 1000000000, precioUnitario: 100 }],
    }),
  })
  const resBadQty = await ordersRoute.POST(reqBadQty)
  const jsonBadQty = await resBadQty.json()
  console.log('[9f.2] Cantidad 1e9 rechazada (400):', resBadQty.status === 400 && jsonBadQty.error.includes('1 y 999') ? 'PASS' : 'FAIL')

  // 3. Más de 50 líneas
  const excessItems = Array.from({ length: 60 }).map((_, i) => ({
    productId: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
    quantity: 1,
    precioUnitario: 50,
  }))
  const reqBadLines = new NextRequest('http://localhost:3000/api/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      storeId: '00000000-0000-0000-0000-000000000000',
      nombre: 'Comprador Test',
      email: 'test@example.com',
      telefono: '123456789',
      tipoEntrega: 'retiro',
      metodoPago: 'efectivo',
      items: excessItems,
    }),
  })
  const resBadLines = await ordersRoute.POST(reqBadLines)
  const jsonBadLines = await resBadLines.json()
  console.log('[9f.3] Más de 50 líneas rechazado (400):', resBadLines.status === 400 && jsonBadLines.error.includes('50 líneas') ? 'PASS' : 'FAIL')

  // 4. Turnstile token obligatorio cuando está configurado
  const prevTurnstileSecret = process.env.TURNSTILE_SECRET_KEY
  const prevTurnstileSite = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  process.env.TURNSTILE_SECRET_KEY = 'test_secret_turnstile_dummy'
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'test_site_turnstile_dummy'
  const reqNoTurnstile = new NextRequest('http://localhost:3000/api/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      storeId: '00000000-0000-0000-0000-000000000000',
      nombre: 'Comprador Test',
      email: 'test@example.com',
      telefono: '123456789',
      tipoEntrega: 'retiro',
      metodoPago: 'efectivo',
      items: [{ productId: '00000000-0000-0000-0000-000000000001', quantity: 1, precioUnitario: 100 }],
    }),
  })
  const resNoTurnstile = await ordersRoute.POST(reqNoTurnstile)
  const jsonNoTurnstile = await resNoTurnstile.json()
  console.log('[9f.4] Turnstile token obligatorio cuando está configurado (400):', resNoTurnstile.status === 400 && jsonNoTurnstile.error.includes('token faltante') ? 'PASS' : 'FAIL')
  if (prevTurnstileSecret) process.env.TURNSTILE_SECRET_KEY = prevTurnstileSecret
  else delete process.env.TURNSTILE_SECRET_KEY
  if (prevTurnstileSite) process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = prevTurnstileSite
  else delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  // =========================================================================
  // TEST 9e: Validaciones en /api/checkout/mercadopago/preference
  // =========================================================================
  console.log('\n--- TEST 9e: Validaciones en /api/checkout/mercadopago/preference ---')
  const prefRoute = await import('../app/api/checkout/mercadopago/preference/route')

  // Petición con orderId inexistente
  const reqPrefNonExistent = new NextRequest('http://localhost:3000/api/checkout/mercadopago/preference', {
    method: 'POST',
    body: JSON.stringify({ orderId: '00000000-0000-0000-0000-000000000000', publicToken: 'tok_test' }),
  })
  const resPrefNonExistent = await prefRoute.POST(reqPrefNonExistent)
  console.log('[9e.1] Pedido inexistente manejado correctamente (404):', resPrefNonExistent.status === 404 ? 'PASS' : 'FAIL')

  // =========================================================================
  // TEST 9d: Servidor MP Simulado y Webhook
  // =========================================================================
  console.log('\n--- TEST 9d: Webhook con Mercado Pago Simulado (MP_API_BASE_URL) ---')
  const mockPort = 4567
  const mockPayments: Record<string, any> = {
    'mock_pay_approved_1': {
      id: 11111111,
      status: 'approved',
      status_detail: 'accredited',
      transaction_amount: 1500,
      currency_id: 'ARS',
      external_reference: 'zz_test_order_mock_1',
      fee_details: [{ type: 'mercadopago_fee', amount: 50 }],
    },
    'mock_pay_duplicate_1': {
      id: 22222222,
      status: 'approved',
      status_detail: 'accredited',
      transaction_amount: 1500,
      currency_id: 'ARS',
      external_reference: 'zz_test_order_mock_1',
      fee_details: [{ type: 'mercadopago_fee', amount: 50 }],
    },
    'mock_pay_rejected_1': {
      id: 33333333,
      status: 'rejected',
      status_detail: 'cc_rejected_high_risk',
      transaction_amount: 1500,
      currency_id: 'ARS',
      external_reference: 'zz_test_order_mock_1',
    },
  }

  const mockServer = http.createServer((req, res) => {
    const url = req.url || ''
    if (url.startsWith('/v1/payments/')) {
      const paymentId = url.replace('/v1/payments/', '').split('?')[0]
      const pay = mockPayments[paymentId]
      if (pay) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(pay))
        return
      }
    }
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: 'Payment not found', status: 404 }))
  })

  await new Promise<void>((resolve) => mockServer.listen(mockPort, resolve))
  console.log(`[INFO] Servidor Mock de MP escuchando en http://127.0.0.1:${mockPort}`)

  process.env.MP_API_BASE_URL = `http://127.0.0.1:${mockPort}`

  const webhookRoute = await import('../app/api/webhooks/mercadopago/route')

  // Invocación con evento seller_token_revoked
  const reqRevoked = new NextRequest('http://localhost:3000/api/webhooks/mercadopago', {
    method: 'POST',
    body: JSON.stringify({
      action: 'seller_token_revoked',
      type: 'seller_token_revoked',
      user_id: '999999999',
    }),
  })
  const resRevoked = await webhookRoute.POST(reqRevoked)
  const jsonRevoked = await resRevoked.json()
  console.log('[9d.1] Evento seller_token_revoked capturado y respondido 200:', resRevoked.status === 200 && jsonRevoked.status === 'seller_token_revoked' ? 'PASS' : 'FAIL')

  // Invocación con evento payment no encontrado en BD
  const reqPayNotFound = new NextRequest('http://localhost:3000/api/webhooks/mercadopago?data.id=mock_pay_approved_1&type=payment', {
    method: 'POST',
    body: JSON.stringify({ type: 'payment', data: { id: 'mock_pay_approved_1' } }),
  })
  const resPayNotFound = await webhookRoute.POST(reqPayNotFound)
  const jsonPayNotFound = await resPayNotFound.json()
  console.log('[9d.2] Webhook procesa llamada contra mock MP (pedido inexistente -> 200 payment_not_found):', resPayNotFound.status === 200 && jsonPayNotFound.status === 'payment_not_found' ? 'PASS' : 'FAIL')

  mockServer.close()
  delete process.env.MP_API_BASE_URL

  // =========================================================================
  // TEST 9h: Verificación de store-auth y Colaboradores
  // =========================================================================
  console.log('\n--- TEST 9h: Verificación de store-auth (lib/store-auth.ts) ---')
  const { verifyStoreAccess } = await import('../lib/store-auth')
  console.log('[9h.1] Módulo verifyStoreAccess importado correctamente:', typeof verifyStoreAccess === 'function' ? 'PASS' : 'FAIL')

  console.log('\n=== SUITE DE PRUEBAS COMPLETADA ===\n')
}

runTests().catch((err) => {
  console.error('[FATAL] Error en la ejecución de pruebas:', err)
  process.exit(1)
})
