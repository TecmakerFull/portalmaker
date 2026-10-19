// =============================================================================
// PORTALMAKER — Servicio de Notificaciones por Email (Resend)
// Envía alertas de ventas confirmadas y pedidos al dueño de la tienda.
// =============================================================================

import type { Store, Order } from '@/types/database'

interface SendOrderNotificationParams {
  store: Store
  order: Order
}

export async function sendOrderPaidNotification({ store, order }: SendOrderNotificationParams) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('sendOrderPaidNotification: RESEND_API_KEY no configurado, se omite el envío.')
    return { ok: false, error: 'RESEND_API_KEY no configurado' }
  }

  const recipientEmail = store.email_contacto?.trim() || store.admin_email?.trim()
  if (!recipientEmail) {
    console.warn('sendOrderPaidNotification: La tienda no tiene email de destino.')
    return { ok: false, error: 'Sin email de destino' }
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Portalmaker <onboarding@resend.dev>'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.portalmaker.ar'
  const shortOrderId = order.id.slice(0, 8).toUpperCase()

  // Limpiar teléfono del comprador para enlace de WhatsApp
  const cleanBuyerPhone = order.telefono_comprador
    ? order.telefono_comprador.replace(/[^0-9]/g, '')
    : ''

  const buyerName = order.nombre_comprador || 'Cliente'
  const waPreloadedText = encodeURIComponent(
    `¡Hola ${buyerName}! Recibimos tu pago por el pedido #${shortOrderId} en ${store.nombre}. Tu pedido ya está en preparación.`
  )
  const waDirectLink = cleanBuyerPhone ? `https://wa.me/${cleanBuyerPhone}?text=${waPreloadedText}` : null
  const panelOrdersUrl = `${appUrl}/tienda/admin/ventas`

  // Construir filas de productos
  const itemsHtml = (order.items || [])
    .map((item: any) => {
      const variantText = item.variante ? ` <span style="color:#64748b; font-size:12px;">(${item.variante})</span>` : ''
      const subtotal = (Number(item.cantidad) || 1) * (Number(item.precio_unitario) || 0)
      return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; font-size: 13px; color: #1e293b;">
            <strong>${item.cantidad}x</strong> ${item.nombre}${variantText}
          </td>
          <td style="padding: 10px 0; font-size: 13px; color: #0f172a; text-align: right; font-weight: 600;">
            $${subtotal.toLocaleString('es-AR')}
          </td>
        </tr>
      `
    })
    .join('')

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px 12px; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 28px; box-shadow: 0 4px 14px rgba(0,0,0,0.05); }
    .badge { display: inline-block; padding: 5px 12px; background: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .highlight-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 16px; margin: 18px 0; }
    .amount { font-size: 26px; font-weight: 800; color: #15803d; }
    .client-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin: 18px 0; }
    .client-row { font-size: 13px; margin-bottom: 6px; color: #334155; }
    .btn-wa { display: inline-block; background-color: #25d366; color: #ffffff !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 12px; margin: 10px 0; text-align: center; }
    .btn-panel { display: inline-block; background-color: #0f172a; color: #ffffff !important; font-size: 13px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 10px; margin-top: 14px; }
    .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Venta Confirmada — Pago Aprobado</div>
    <h1>¡Felicitaciones! Recibiste un nuevo pago</h1>
    <p>Un cliente acaba de abonar un pedido a través de Mercado Pago en tu tienda <strong>${store.nombre}</strong>.</p>

    <div class="highlight-box">
      <div style="font-size: 12px; color: #166534; font-weight: 600; text-transform: uppercase;">Monto Total Cobrado</div>
      <div class="amount">$${Number(order.total).toLocaleString('es-AR')}</div>
      <div style="font-size: 12px; color: #15803d; margin-top: 4px;">Pedido #${shortOrderId} — Acreditado en tu cuenta</div>
    </div>

    <div class="client-box">
      <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 10px;">Datos del Comprador</div>
      <div class="client-row"><strong>Nombre:</strong> ${buyerName}</div>
      <div class="client-row"><strong>Teléfono:</strong> ${order.telefono_comprador || 'No especificado'}</div>
      <div class="client-row"><strong>Email:</strong> ${order.email_comprador || 'No especificado'}</div>
      <div class="client-row"><strong>Entrega:</strong> ${order.tipo_entrega === 'envio' ? 'Envío a domicilio' : order.tipo_entrega === 'retiro' ? 'Retiro en taller / local' : 'A convenir'}</div>
      ${order.direccion_entrega ? `<div class="client-row"><strong>Dirección:</strong> ${order.direccion_entrega}</div>` : ''}
      ${order.notas ? `<div class="client-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #cbd5e1;"><strong>Aclaraciones del cliente:</strong> <em>"${order.notas}"</em></div>` : ''}

      ${
        waDirectLink
          ? `<div style="text-align: center; margin-top: 16px;">
              <a href="${waDirectLink}" target="_blank" class="btn-wa">
                Escribirle al Comprador por WhatsApp
              </a>
            </div>`
          : ''
      }
    </div>

    <div style="margin: 20px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Productos del Pedido:</div>
      <table style="width: 100%; border-collapse: collapse;">
        ${itemsHtml}
      </table>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${panelOrdersUrl}" target="_blank" class="btn-panel">
        Ver Detalle del Pedido en el Panel
      </a>
    </div>

    <div class="footer">
      Este correo fue generado automáticamente por <strong>Portalmaker</strong> para tu tienda <strong>${store.nombre}</strong>.<br/>
      portalmaker.com.ar — El portal del Maker
    </div>
  </div>
</body>
</html>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject: `¡Nueva venta confirmada! $${Number(order.total).toLocaleString('es-AR')} - Pedido #${shortOrderId} (${store.nombre})`,
        html: htmlContent,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('Error enviando email de venta con Resend:', data)
      return { ok: false, error: data }
    }

    return { ok: true, data }
  } catch (err: any) {
    console.error('Excepción al enviar email de notificación:', err)
    return { ok: false, error: err?.message }
  }
}
