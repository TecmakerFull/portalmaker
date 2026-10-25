import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

// =============================================================================
// PORTALMAKER — Magic Link Personalizado con Identidad de Tienda
// Genera un enlace oficial de Supabase Auth y envía un correo con el nombre,
// logo y colores de la tienda vía Resend para que el cliente no reciba correos
// genéricos a nombre de Portalmaker.
// =============================================================================

export async function POST(req: Request) {
  try {
    const {
      email,
      storeName,
      storeSlug,
      storeLogoUrl,
      colorPrimario,
      redirectTo,
    } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'El correo electrónico es requerido' }, { status: 400 })
    }

    const cleanEmail = String(email).trim().toLowerCase()
    const supabaseAdmin = createSupabaseAdminClient()

    // 1. Generar enlace oficial de Supabase Auth
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: cleanEmail,
      options: {
        redirectTo,
        data: {
          store_name: storeName,
          store_slug: storeSlug,
        },
      },
    })

    if (linkErr || !linkData?.properties?.action_link) {
      console.warn('generateLink en Supabase falló o no retornó link, indicando fallback OTP:', linkErr)
      return NextResponse.json({ useFallbackOtp: true }, { status: 200 })
    }

    const actionLink = linkData.properties.action_link
    const apiKey = process.env.RESEND_API_KEY

    // Si Resend no está configurado en el entorno, retornar flag de fallback a Supabase OTP
    if (!apiKey) {
      console.warn('RESEND_API_KEY no configurado en store-magic-link, usando fallback OTP')
      return NextResponse.json({ useFallbackOtp: true }, { status: 200 })
    }

    // 2. Extraer dirección base del remitente (ej: "Portalmaker <notificaciones@portalmaker.ar>")
    const rawFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const emailMatch = rawFrom.match(/<([^>]+)>/)
    const baseEmail = emailMatch ? emailMatch[1] : rawFrom.trim()
    const senderDisplayName = storeName ? `${storeName}` : 'Tu Tienda'
    const fromSender = `${senderDisplayName} <${baseEmail}>`

    const brandColor = colorPrimario || '#0f172a'

    // Plantilla HTML elegante, responsive y con la identidad de la tienda
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acceso a ${storeName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 32px 16px; -webkit-font-smoothing: antialiased; }
    .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 36px 28px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); text-align: center; }
    .logo { max-height: 52px; max-width: 200px; object-fit: contain; margin-bottom: 24px; }
    .store-badge { display: inline-block; padding: 5px 14px; background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 700; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; line-height: 1.25; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 26px 0; }
    .btn-action { display: inline-block; background-color: ${brandColor}; color: #ffffff !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.12); margin-bottom: 24px; }
    .notice { font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 8px; }
    .footer { font-size: 11px; color: #94a3b8; margin-top: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    ${storeLogoUrl ? `<img src="${storeLogoUrl}" alt="${storeName}" class="logo" />` : ''}
    <div>
      <span class="store-badge">${storeName}</span>
    </div>
    <h1>Tu enlace de acceso directo</h1>
    <p>
      Recibimos una solicitud para iniciar sesión en tu cuenta de <strong>${storeName}</strong> con este correo electrónico. Haz clic en el botón a continuación para ingresar de inmediato sin necesidad de contraseña:
    </p>
    <div>
      <a href="${actionLink}" target="_blank" class="btn-action">
        Ingresar a ${storeName}
      </a>
    </div>
    <div class="notice">
      Este enlace es de uso único y tiene una validez de 15 minutos.<br/>
      Si no solicitaste este acceso, puedes ignorar este mensaje con total tranquilidad.
    </div>
  </div>
  <div class="footer">
    Enviado por <strong>${storeName}</strong> vía Portalmaker
  </div>
</body>
</html>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromSender,
        to: [cleanEmail],
        subject: `Tu enlace de acceso rápido a ${storeName}`,
        html: htmlContent,
      }),
    })

    const resData = await res.json()
    if (!res.ok) {
      console.warn('Fallo en API de Resend, usando fallback OTP:', resData)
      return NextResponse.json({ useFallbackOtp: true }, { status: 200 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error en /api/auth/store-magic-link:', err)
    return NextResponse.json({ useFallbackOtp: true }, { status: 200 })
  }
}
