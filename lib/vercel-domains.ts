// =============================================================================
// PORTALMAKER — Integración Automática con Vercel Domains API
// Da de alta, desvincula y verifica dominios propios en tiempo real sin
// intervención manual del superadmin.
// =============================================================================

export interface VercelDomainResult {
  success: boolean
  domain: string
  verified?: boolean
  error?: string
}

/**
 * Agrega automáticamente el dominio y su subdominio www al proyecto de Vercel.
 */
export async function addDomainToVercel(rawDomain: string): Promise<VercelDomainResult> {
  const token = process.env.VERCEL_AUTH_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID

  if (!token || !projectId) {
    console.warn('Vercel API credentials not configured in environment variables')
    return { success: false, domain: rawDomain, error: 'Credenciales de Vercel no configuradas' }
  }

  const cleanDomain = rawDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const apexDomain = cleanDomain.replace(/^www\./, '')
  const wwwDomain = `www.${apexDomain}`

  try {
    // 1. Agregar primero la variante www al proyecto para que el apex pueda redirigir a ella sin error 400
    const resWww = await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: wwwDomain,
      }),
    })

    const dataWww = await resWww.json()

    // 2. Agregar el apex domain con zone: true (para habilitar la Zona DNS de Vercel y resolver el desafío ACME)
    // y configurar la redirección permanente (308) a wwwDomain
    const resApex = await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: apexDomain,
        zone: true,
        redirect: wwwDomain,
        redirectStatusCode: 308,
      }),
    })

    const dataApex = await resApex.json()

    if (dataApex.error && dataApex.error.code !== 'domain_already_in_use') {
      console.warn('Apex domain Vercel warning:', dataApex.error)
    }

    if (dataWww.error && dataWww.error.code !== 'domain_already_in_use') {
      console.warn('Www domain Vercel warning:', dataWww.error)
    }

    return {
      success: true,
      domain: cleanDomain,
      verified: Boolean(dataWww.verified || dataApex.verified),
    }
  } catch (err: any) {
    console.error('Error llamando a Vercel Domains API:', err)
    return { success: false, domain: cleanDomain, error: err.message }
  }
}

/**
 * Elimina automáticamente el dominio y su variante www de Vercel al desvincular.
 */
export async function removeDomainFromVercel(rawDomain: string): Promise<VercelDomainResult> {
  const token = process.env.VERCEL_AUTH_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID

  if (!token || !projectId) {
    return { success: false, domain: rawDomain, error: 'Credenciales de Vercel no configuradas' }
  }

  const cleanDomain = rawDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const apexDomain = cleanDomain.replace(/^www\./, '')
  const wwwDomain = `www.${apexDomain}`

  try {
    await fetch(`https://api.vercel.com/v9/projects/${projectId}/domains/${apexDomain}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    await fetch(`https://api.vercel.com/v9/projects/${projectId}/domains/${wwwDomain}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    return { success: true, domain: cleanDomain }
  } catch (err: any) {
    return { success: false, domain: cleanDomain, error: err.message }
  }
}

/**
 * Consulta en tiempo real el estado de configuración DNS y verificación en Vercel.
 */
export async function checkDomainStatusInVercel(rawDomain: string): Promise<{
  configured: boolean
  verified: boolean
  misconfigured: boolean
  error?: string
}> {
  const token = process.env.VERCEL_AUTH_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID

  if (!token || !projectId) {
    return { configured: false, verified: false, misconfigured: false, error: 'Credenciales no configuradas' }
  }

  const cleanDomain = rawDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const domainToCheck = cleanDomain.startsWith('www.') ? cleanDomain : `www.${cleanDomain}`

  try {
    const res = await fetch(`https://api.vercel.com/v6/domains/${domainToCheck}/config`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await res.json()
    const isConfigured = Boolean(data.configuredBy) && !data.misconfigured

    return {
      configured: isConfigured,
      misconfigured: Boolean(data.misconfigured),
      verified: isConfigured,
    }
  } catch (err: any) {
    return { configured: false, verified: false, misconfigured: true, error: err.message }
  }
}
