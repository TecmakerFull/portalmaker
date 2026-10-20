const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

// Lista de archivos de la Ronda 7
const FILES = [
  'supabase/migrations/20261021_mercadopago_ronda7.sql',
  'lib/store-auth.ts',
  'lib/mp-payments.ts',
  'app/api/cron/mp-reconcile/route.ts',
  'lib/mercadopago.ts',
  'lib/tenant.ts',
  'lib/email-notifications.ts',
  'middleware.ts',
  'app/api/auth/mercadopago/authorize/route.ts',
  'app/api/auth/mercadopago/callback/route.ts',
  'app/api/auth/mercadopago/disconnect/route.ts',
  'app/api/store/payment-settings/route.ts',
  'app/api/checkout/orders/route.ts',
  'app/api/checkout/mercadopago/preference/route.ts',
  'app/api/webhooks/mercadopago/route.ts',
  'app/(portal)/dashboard/maker/page.tsx',
  'app/tienda/pedido-confirmado/page.tsx',
  'scripts/test_ad4.js',
  'scripts/test_ad5.js',
  'scripts/test_ronda7.ts',
]

// Extraer secretos de .env.local para redactarlos si aparecen de forma literal
const sensitiveLiterals = new Set()
const envLocalPath = path.join(ROOT, '.env.local')
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8')
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim()
      let val = trimmed.slice(eqIdx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (val.length >= 6) {
        if (/SECRET|TOKEN|KEY|PASSWORD|PRIVATE/i.test(key)) {
          sensitiveLiterals.add(val)
        }
      }
    }
  })
}

function redactSecrets(text) {
  let result = text
  // Redactar literales conocidos
  for (const secret of sensitiveLiterals) {
    if (secret && secret.length >= 6) {
      result = result.split(secret).join('[REDACTED]')
    }
  }
  // Redactar patrones genéricos
  result = result.replace(/APP_USR-[a-zA-Z0-9_\-]+/g, '[REDACTED]')
  result = result.replace(/TEST-[a-zA-Z0-9_\-]+/g, '[REDACTED]')
  result = result.replace(/eyJ[a-zA-Z0-9_\-\.]{20,}/g, '[REDACTED]')
  return result
}

let revisionText = '================================================================================\n'
revisionText += 'PORTALMAKER — REVISION DE ARCHIVOS MODIFICADOS Y NUEVOS — RONDA 7\n'
revisionText += `Generado: ${new Date().toISOString()}\n`
revisionText += '================================================================================\n\n'

for (const relPath of FILES) {
  const fullPath = path.join(ROOT, relPath)
  if (!fs.existsSync(fullPath)) {
    console.warn(`Archivo no encontrado: ${relPath}`)
    continue
  }
  const content = fs.readFileSync(fullPath, 'utf8')
  revisionText += `\n${'='.repeat(80)}\n`
  revisionText += `FILE: ${relPath}\n`
  revisionText += `${'='.repeat(80)}\n\n`
  revisionText += redactSecrets(content)
  revisionText += '\n'
}

const outDir = path.join(ROOT, 'evidencia')
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}
const outPath = path.join(outDir, 'revision-ronda7.txt')
fs.writeFileSync(outPath, revisionText, 'utf8')
console.log(`[OK] revision-ronda7.txt generado exitosamente en ${outPath}`)

// Escanear evidencia/
console.log('\n--- ESCANEO DE SEGURIDAD EN CARPETA EVIDENCIA/ ---')
const filesToScan = ['revision-ronda7.txt', 'evidencia-ronda7.md']
let findings = []

for (const file of filesToScan) {
  const target = path.join(outDir, file)
  if (!fs.existsSync(target)) continue
  const content = fs.readFileSync(target, 'utf8')
  const lines = content.split('\n')
  lines.forEach((line, idx) => {
    if (/APP_USR-[a-zA-Z0-9_\-]+/.test(line)) {
      findings.push(`${file}:${idx + 1} -> Contiene prefijo APP_USR-`)
    }
    if (/TEST-[a-zA-Z0-9_\-]+/.test(line)) {
      findings.push(`${file}:${idx + 1} -> Contiene prefijo TEST-`)
    }
    if (/eyJ[a-zA-Z0-9_\-\.]{25,}/.test(line)) {
      findings.push(`${file}:${idx + 1} -> Contiene JWT eyJ...`)
    }
    for (const secret of sensitiveLiterals) {
      if (line.includes(secret)) {
        findings.push(`${file}:${idx + 1} -> Contiene secreto de entorno literal`)
      }
    }
  })
}

if (findings.length > 0) {
  console.error('[PELIGRO] Se encontraron posibles secretos en evidencia/:')
  findings.forEach((f) => console.error('  ', f))
  process.exit(1)
} else {
  console.log('[SCAN OK] Salida vacía de secretos: 0 coincidencias en evidencia/.')
}
