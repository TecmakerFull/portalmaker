// =============================================================================
// PORTALMAKER — API para envío de invitaciones por correo con Resend
// Notifica a los nuevos colaboradores cuando el dueño de una tienda los agrega.
// =============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'
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
    // 1. Limitar tasa de envíos por IP (máx 15 invitaciones cada 10 minutos)
    const ip = getClientIp(request)
    const rate = await checkRateLimit({
      ip: `invite-collab:${ip}`,
      maxPerIp: 15,
      windowMs: 10 * 60 * 1000,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor espera unos minutos.' },
        { status: 429 }
      )
    }

    // 2. Exigir usuario autenticado
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }

    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY no está configurado en las variables de entorno.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const {
      email,
      rol = 'colaborador',
      storeName,
      storeSlug,
      invitadoPor,
    } = body

    if (!email || !storeName || !storeSlug) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos (email, storeName, storeSlug).' },
        { status: 400 }
      )
    }

    // 3. Verificar que el usuario autenticado sea dueño, co-admin o superadmin de la tienda
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: targetStore } = await supabaseAdmin
      .from('stores')
      .select('id, slug, nombre')
      .eq('slug', String(storeSlug).trim().toLowerCase())
      .maybeSingle()

    if (!targetStore) {
      return NextResponse.json({ error: 'Tienda no encontrada.' }, { status: 404 })
    }

    const authResult = await verifyStoreAccess(user.email, targetStore.id, {
      allowCollaborators: true,
      requiredCollaboratorRoles: ['admin'],
    })

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'No tienes permisos para invitar colaboradores en esta tienda.' },
        { status: 403 }
      )
    }

    const cleanEmail = String(email).trim().toLowerCase()
    const safeStoreName = escapeHtml(String(targetStore.nombre || storeName).trim())
    const safeInvitadoPor = escapeHtml(String(invitadoPor || user.email).trim())
    const safeRol = rol === 'admin' ? 'admin' : 'colaborador'
    const safeEmail = escapeHtml(cleanEmail)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portalmaker.ar'
    const loginLink = `${appUrl}/tienda/admin?tenant=${encodeURIComponent(String(targetStore.slug))}`

    // Remitente oficial verificado de Portalmaker en Resend
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Portalmaker <info@portalmaker.ar>'
    const replyTo = user.email

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
    .badge { display: inline-block; padding: 4px 12px; background: #fef3c7; color: #92400e; font-size: 12px; font-weight: 700; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0; line-height: 1.3; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .store-box { background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 20px 0; }
    .store-name { font-size: 16px; font-weight: 700; color: #0f172a; }
    .store-role { font-size: 13px; color: #64748b; margin-top: 2px; }
    .button-container { text-align: center; margin: 28px 0 16px 0; }
    .btn { display: inline-block; background-color: #facc15; color: #1e293b; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 12px; box-shadow: 0 2px 6px rgba(250, 204, 21, 0.3); }
    .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Invitación de Equipo</div>
    <h1>Te han invitado a colaborar en una tienda</h1>
    <p>
      Hola, <strong>${safeInvitadoPor}</strong> te ha agregado como <strong>${safeRol}</strong> en el panel de administración de su tienda en <strong>Portalmaker</strong>.
    </p>

    <div class="store-box">
      <div class="store-name">${safeStoreName}</div>
      <div class="store-role">Rol asignado: ${safeRol === 'admin' ? 'Co-administrador' : 'Colaborador'}</div>
    </div>

    <p>
      Desde este panel podrás gestionar el catálogo de productos, actualizar pedidos y coordinar consultas de clientes.
    </p>

    <div class="button-container">
      <a href="${loginLink}" class="btn">Ingresar al Panel de Tienda</a>
    </div>

    <p style="font-size: 12px; color: #64748b; text-align: center;">
      Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
      <a href="${loginLink}" style="color: #ca8a04; word-break: break-all;">${loginLink}</a>
    </p>

    <div class="footer">
      Portalmaker — "El portal del Maker"<br>
      Este es un correo automático enviado a ${safeEmail}.
    </div>
  </div>
</body>
</html>
`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [cleanEmail],
        reply_to: replyTo,
        subject: `Invitación para colaborar en la tienda ${targetStore.nombre || storeName} — Portalmaker`,
        html: htmlContent,
      }),
    })

    const resData = await response.json()

    if (!response.ok) {
      console.warn('Advertencia al enviar email con Resend:', resData)
      return NextResponse.json(
        {
          error: resData?.message || 'Error al despachar el correo con Resend.',
          details: resData,
        },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      id: resData.id,
    })
  } catch (error: any) {
    console.error('Error en /api/colaboradores/invitar:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno al procesar el envío de correo.' },
      { status: 500 }
    )
  }
}
