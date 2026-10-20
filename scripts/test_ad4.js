// Guard clause obligatoria para scripts de prueba
const fs = require('fs')
const path = require('path')

const envLocalPath = path.resolve(__dirname, '../.env.local')
let projectRef = ''
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8')
  const match = content.match(/NEXT_PUBLIC_SUPABASE_URL=https?:\/\/([^.]+)\.supabase\.co/)
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

console.log(`[OK] Script test_ad4 ejecutado de forma segura contra project ref: ${projectRef}`)
