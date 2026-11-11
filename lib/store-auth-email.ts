// =============================================================================
// PORTALMAKER — Emails de acceso con identidad de tienda (magic link y recovery)
//
// Por qué existe: ambos endpoints públicos (/api/auth/store-magic-link y
// /api/auth/store-recover) envían correos desde el dominio verificado de la
// plataforma. Si el nombre, logo o color de la tienda vinieran del cliente,
// cualquiera podría mandar emails de phishing con HTML arbitrario "a nombre"
// de cualquier marca. Por eso la identidad se lee SIEMPRE de la base de datos
// y todo valor interpolado se escapa.
// =============================================================================

import { createSupabaseAdminClient } from '@/lib/supabase/server'

export interface StoreBranding {
  id: string
  nombre: string
  slug: string
  logo_url: string | null
  color_primario: string | null
}

/** Identidad del portal para correos de acceso que no pertenecen a ninguna tienda (login del portal). */
export const PORTAL_BRANDING: StoreBranding = {
  id: 'portal',
  nombre: 'Portalmaker',
  slug: 'portal',
  logo_url: null,
  color_primario: '#FF5500',
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Busca la tienda por slug usando la vista pública (sin datos sensibles). */
export async function getStoreBrandingBySlug(slug: unknown): Promise<StoreBranding | null> {
  const cleanSlug = String(slug || '').trim().toLowerCase()
  if (!/^[a-z0-9-]{1,63}$/.test(cleanSlug)) return null

  const supabaseAdmin = createSupabaseAdminClient()
  const { data } = await supabaseAdmin
    .from('stores_public')
    .select('id, nombre, slug, logo_url, color_primario')
    .eq('slug', cleanSlug)
    .maybeSingle()

  return (data as StoreBranding | null) ?? null
}

function safeColor(value: string | null): string {
  return value && /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : '#0f172a'
}

function safeImageUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export function buildStoreAuthEmail(params: {
  store: StoreBranding
  actionLink: string
  kind: 'magiclink' | 'recovery'
}): { subject: string; html: string; fromName: string } {
  const storeName = escapeHtml(params.store.nombre || 'Tu tienda')
  const logo = safeImageUrl(params.store.logo_url)
  const brandColor = safeColor(params.store.color_primario)
  const link = escapeHtml(params.actionLink)

  const copy =
    params.kind === 'magiclink'
      ? {
          title: 'Tu enlace de acceso directo',
          body: `Recibimos una solicitud para iniciar sesión en tu cuenta de <strong>${storeName}</strong> con este correo electrónico. Haz clic en el botón para ingresar sin necesidad de contraseña:`,
          cta: `Ingresar a ${storeName}`,
          subject: `Tu enlace de acceso rápido a ${params.store.nombre}`,
        }
      : {
          title: 'Restablecer tu contraseña',
          body: `Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>${storeName}</strong>. Haz clic en el botón para elegir una nueva:`,
          cta: 'Elegir nueva contraseña',
          subject: `Restablecer contraseña en ${params.store.nombre}`,
        }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${storeName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 32px 16px; }
    .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 36px 28px; text-align: center; }
    .logo { max-height: 52px; max-width: 200px; object-fit: contain; margin-bottom: 24px; }
    .store-badge { display: inline-block; padding: 5px 14px; background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 600; color: #0f172a; margin: 0 0 12px 0; line-height: 1.25; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 26px 0; }
    .btn-action { display: inline-block; background-color: ${brandColor}; color: #ffffff !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 12px; margin-bottom: 24px; }
    .notice { font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 8px; }
    .footer { font-size: 11px; color: #94a3b8; margin-top: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    ${logo ? `<img src="${escapeHtml(logo)}" alt="${storeName}" class="logo" />` : ''}
    <div><span class="store-badge">${storeName}</span></div>
    <h1>${copy.title}</h1>
    <p>${copy.body}</p>
    <div><a href="${link}" target="_blank" class="btn-action">${copy.cta}</a></div>
    <div class="notice">
      Este enlace es de uso único y vence en poco tiempo.<br/>
      Si no lo solicitaste, puedes ignorar este mensaje con tranquilidad.
    </div>
  </div>
  <div class="footer">${params.store.id === 'portal' ? 'Enviado por <strong>Portalmaker</strong>' : `Enviado por <strong>${storeName}</strong> vía Portalmaker`}</div>
</body>
</html>`

  // El display name del remitente no admite comillas ni "<>" (romperían el header From).
  const fromName = String(params.store.nombre || 'Tu tienda').replace(/["<>\r\n]/g, '').slice(0, 80)

  return { subject: copy.subject, html, fromName }
}

/** Envía el email por Resend. Devuelve false si Resend no está configurado o falla. */
export async function sendStoreAuthEmail(params: {
  to: string
  subject: string
  html: string
  fromName: string
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return false

  const rawFrom = process.env.RESEND_FROM_EMAIL || 'Portalmaker <info@portalmaker.ar>'
  const match = rawFrom.match(/<([^>]+)>/)
  const baseEmail = match ? match[1] : rawFrom.trim()

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${params.fromName} <${baseEmail}>`,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}
