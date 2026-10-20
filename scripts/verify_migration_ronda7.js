// Verificacion SOLO LECTURA de la migracion 20261021 via PostgREST (misma via que usa la app).
// No toca datos: las llamadas al RPC usan un monto nulo o un pedido inexistente, que retornan
// antes de cualquier escritura. Nunca imprime claves ni tokens.
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Cargar .env.local sin imprimirlo
const envPath = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const t = line.trim()
    if (!t || t.startsWith('#')) return
    const i = t.indexOf('=')
    if (i === -1) return
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v
  })
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const ref = (url.match(/https?:\/\/([^.]+)\.supabase\.co/) || [])[1] || ''

// Guarda obligatoria de scripts de prueba
if (process.env.ALLOW_TEST_SCRIPTS !== '1') {
  console.error('[ABORT] ALLOW_TEST_SCRIPTS no es 1.')
  process.exit(1)
}
const allowed = (process.env.TEST_ALLOWED_PROJECT_REFS || '').split(',').map((s) => s.trim()).filter(Boolean)
if (!ref || !allowed.includes(ref)) {
  console.error(`[ABORT] project ref "${ref}" no esta en TEST_ALLOWED_PROJECT_REFS.`)
  process.exit(1)
}

const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const ZERO_UUID = '00000000-0000-0000-0000-000000000000'

const results = []
const check = (name, ok, detail) => {
  results.push({ name, ok })
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ' -> ' + detail : ''}`)
}

;(async () => {
  console.log(`Project ref: ${ref} (produccion segun el dueño)\n`)

  // 1. Objetos creados por la migracion (service_role)
  let r = await admin.from('orders').select('mp_preference_created_at').limit(1)
  check('orders.mp_preference_created_at existe', !r.error, r.error?.message)

  r = await admin.from('mp_webhook_events').select('id', { count: 'exact', head: true })
  check('tabla mp_webhook_events existe', !r.error, r.error ? r.error.message : `filas=${r.count}`)

  r = await admin.from('store_admin_notes').select('store_id', { count: 'exact', head: true })
  check('tabla store_admin_notes existe', !r.error, r.error ? r.error.message : `filas=${r.count}`)

  // 2. Notas ya no legibles en stores (solo cuenta, no imprime contenido)
  r = await admin.from('stores').select('id', { count: 'exact', head: true }).not('notas_admin', 'is', null)
  check('stores.notas_admin vaciada tras copiarse', !r.error && r.count === 0,
    r.error ? r.error.message : `filas con nota restante=${r.count}`)

  // 3. RPC nueva sin defaults: monto nulo -> revision; pedido inexistente -> not_found
  r = await admin.rpc('process_approved_payment', {
    p_order_id: ZERO_UUID, p_payment_id: 'verify_zz', p_amount: null, p_fee: 0, p_net_received: 0, p_currency: 'ARS',
  })
  check('RPC con monto nulo devuelve revision', !r.error && r.data?.status === 'revision', r.error?.message || JSON.stringify(r.data))

  r = await admin.rpc('process_approved_payment', {
    p_order_id: ZERO_UUID, p_payment_id: 'verify_zz', p_amount: 100, p_fee: 0, p_net_received: 0, p_currency: 'ARS',
  })
  check('RPC con pedido inexistente devuelve not_found', !r.error && r.data?.status === 'not_found', r.error?.message || JSON.stringify(r.data))

  // 4. RPC sin argumentos obligatorios: ya no debe existir la version con defaults
  r = await admin.rpc('process_approved_payment', { p_order_id: ZERO_UUID, p_payment_id: 'verify_zz' })
  check('RPC sin p_amount/p_currency ya no resuelve (sin defaults)', !!r.error, r.error ? r.error.code + ' ' + r.error.message : 'respondio OK (hay defaults)')

  // 5. Superficie publica (anon)
  r = await anon.rpc('process_approved_payment', {
    p_order_id: ZERO_UUID, p_payment_id: 'verify_zz', p_amount: 100, p_fee: 0, p_net_received: 0, p_currency: 'ARS',
  })
  check('anon NO puede ejecutar process_approved_payment', !!r.error, r.error ? r.error.code + ' ' + r.error.message : 'ANON PUDO EJECUTARLA')

  r = await anon.from('mp_webhook_events').select('id').limit(1)
  check('anon NO lee mp_webhook_events', !!r.error || (r.data || []).length === 0, r.error?.message || `filas=${(r.data || []).length}`)

  r = await anon.from('store_admin_notes').select('store_id').limit(1)
  check('anon NO lee store_admin_notes', !!r.error || (r.data || []).length === 0, r.error?.message || `filas=${(r.data || []).length}`)

  r = await anon.from('stores').select('admin_email').limit(1)
  check('anon NO lee admin_email de stores', !!r.error || (r.data || []).length === 0, r.error?.message || `filas=${(r.data || []).length}`)

  // 6. Tiendas conectadas a MP (sin columnas de tokens) para elegir la de prueba
  r = await admin.from('stores').select('id, slug, mp_connected, checkout_activo, comision_portalmaker').eq('mp_connected', true)
  console.log('\nTiendas con mp_connected=true:')
  console.log(r.error ? r.error.message : JSON.stringify(r.data, null, 2))

  const fails = results.filter((x) => !x.ok).length
  console.log(`\nResumen: ${results.length - fails}/${results.length} OK`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error('[FATAL]', e.message); process.exit(1) })
