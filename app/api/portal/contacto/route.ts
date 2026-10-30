// =============================================================================
// PORTALMAKER — API para recepción de consultas de la Landing y Portales
// Envía los mensajes desde el remitente oficial (info@portalmaker.ar) hacia
// la casilla de administración (temperini@gmail.com) con reply_to al usuario.
// =============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(request: NextRequest) {
  try {
    // Limitar tasa de envíos por IP (máx 5 mensajes cada 10 minutos)
    const ip = getClientIp(request)
    const rate = await checkRateLimit({
      ip: `portal-contact:${ip}`,
      maxPerIp: 5,
      windowMs: 10 * 60 * 1000,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Has enviado demasiadas consultas recientemente. Por favor intenta en unos minutos.' },
        { status: 429 }
      )
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Servicio de correo no configurado.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const nombre = String(body?.nombre || '').trim().slice(0, 120)
    const email = String(body?.email || '').trim().toLowerCase().slice(0, 160)
    const motivo = String(body?.motivo || 'Consulta desde Portalmaker.ar').trim().slice(0, 160)
    const mensaje = String(body?.mensaje || '').trim().slice(0, 4000)

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Por favor ingresa un correo electrónico válido.' },
        { status: 400 }
      )
    }

    if (!mensaje) {
      return NextResponse.json(
        { error: 'Por favor escribe tu consulta o mensaje.' },
        { status: 400 }
      )
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Portalmaker <info@portalmaker.ar>'
    const toEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'temperini@gmail.com'

    const safeNombre = escapeHtml(nombre || 'Visitante')
    const safeEmail = escapeHtml(email)
    const safeMotivo = escapeHtml(motivo)
    const safeMensaje = escapeHtml(mensaje).replace(/\n/g, '<br/>')

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
    .badge { display: inline-block; padding: 4px 12px; background: #fff7ed; color: #c2410c; font-size: 11px; font-weight: 700; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; border: 1px solid #ffedd5; }
    h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    .meta { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px; color: #334155; }
    .meta-row { margin-bottom: 6px; }
    .meta-row:last-child { margin-bottom: 0; }
    .msg-box { background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #ff5500; border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.6; color: #1e293b; }
    .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Consulta de Portal</div>
    <h1>Nuevo mensaje desde portalmaker.ar</h1>
    <div class="meta">
      <div class="meta-row"><strong>Nombre:</strong> ${safeNombre}</div>
      <div class="meta-row"><strong>Correo (Responder a):</strong> <a href="mailto:${safeEmail}" style="color: #ea580c;">${safeEmail}</a></div>
      <div class="meta-row"><strong>Asunto:</strong> ${safeMotivo}</div>
    </div>
    <div class="msg-box">
      ${safeMensaje}
    </div>
    <div class="footer">
      Puedes responder directamente a este correo para contestarle a ${safeNombre} (${safeEmail}).<br/>
      Enviado desde info@portalmaker.ar — Portalmaker
    </div>
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
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: `[Consulta Portalmaker] ${motivo} — ${nombre || email}`,
        html: htmlContent,
      }),
    })

    const resData = await res.json()
    if (!res.ok) {
      console.error('Error al despachar consulta desde landing con Resend:', resData)
      return NextResponse.json(
        { error: 'No se pudo enviar el mensaje en este momento.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true, id: resData.id })
  } catch (error) {
    console.error('Error interno en /api/portal/contacto:', error)
    return NextResponse.json(
      { error: 'Error interno al procesar tu consulta.' },
      { status: 500 }
    )
  }
}

