// =============================================================================
// PORTALMAKER — Validación de orígenes confiables para redirecciones de auth
//
// Por qué existe: los flujos de magic link, recuperación de contraseña y el
// puente de /auth/callback transportan `code`, `token_hash` o tokens en el
// fragmento de la URL. Si cualquiera de esos saltos acepta un origen arbitrario,
// un atacante puede pedir un enlace legítimo para el email de la víctima y
// recibir sus credenciales de sesión en su propio dominio (account takeover).
// Toda redirección de auth hacia un origen absoluto debe pasar por aquí.
// =============================================================================

import { createSupabaseAdminClient } from '@/lib/supabase/server'

const PLATFORM_BASE_DOMAINS = Array.from(
  new Set(
    [
      'portalmaker.ar',
      'portalmaker.com.ar',
      (process.env.NEXT_PUBLIC_PORTAL_DOMAIN || '').split(':')[0].toLowerCase(),
    ].filter(Boolean)
  )
)

const isDev = process.env.NODE_ENV !== 'production'

function extraAllowedOrigins(): Set<string> {
  const set = new Set<string>()
  for (const raw of (process.env.ALLOWED_RETURN_ORIGINS || '').split(',')) {
    try {
      const trimmed = raw.trim()
      if (trimmed) set.add(new URL(trimmed).origin)
    } catch {
      // Origen malformado en la variable de entorno: se ignora.
    }
  }
  return set
}

/**
 * Devuelve el origen normalizado si es confiable, o null si no lo es.
 *
 * Confiables:
 *   - El portal y cualquier subdominio de tienda (*.portalmaker.ar / *.portalmaker.com.ar)
 *   - localhost en desarrollo
 *   - Orígenes listados en ALLOWED_RETURN_ORIGINS (previews de Vercel, etc.)
 *   - Dominios propios de tiendas con custom_domain_verified = true. Se exige la
 *     verificación porque cualquier dueño podría cargar un dominio que controla.
 */
export async function getTrustedOrigin(candidate: string | null | undefined): Promise<string | null> {
  if (!candidate) return null

  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase()
  const isLocal = host === 'localhost' || host === '127.0.0.1'

  if (url.protocol !== 'https:' && !(isDev && isLocal && url.protocol === 'http:')) {
    return null
  }

  if (isLocal) return isDev ? url.origin : null

  if (PLATFORM_BASE_DOMAINS.some((base) => host === base || host.endsWith(`.${base}`))) {
    return url.origin
  }

  if (extraAllowedOrigins().has(url.origin)) return url.origin

  const apex = host.replace(/^www\./, '')
  try {
    const supabaseAdmin = createSupabaseAdminClient()
    const { data } = await supabaseAdmin
      .from('stores')
      .select('id')
      .in('custom_domain', [apex, `www.${apex}`])
      .eq('custom_domain_verified', true)
      .limit(1)
      .maybeSingle()
    return data ? url.origin : null
  } catch {
    return null
  }
}

/**
 * Valida una URL de redirección completa. Devuelve la URL si su origen es
 * confiable, o undefined para que Supabase use el Site URL por defecto.
 */
export async function getTrustedRedirectUrl(candidate: string | null | undefined): Promise<string | undefined> {
  if (!candidate) return undefined
  const origin = await getTrustedOrigin(candidate)
  return origin ? candidate : undefined
}
