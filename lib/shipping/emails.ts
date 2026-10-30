// =============================================================================
// PORTALMAKER — Notificaciones por Email para Envíos y Compradores (Resend)
// 1. Confirmación de pedido al comprador (retiro en local o con envío)
// 2. Notificación de pedido despachado con tracking
// 3. Notificación de pedido entregado
// REGLA CRÍTICA: CERO emojis en asuntos, textos y cuerpos generados.
// =============================================================================

import type { Store, Order } from '@/types/database'

interface EmailResult {
  ok: boolean
  error?: string
}

const RESEND_API_URL = 'https://api.resend.com/emails'

/**
 * 1. Envía confirmación de compra y detalles del envío/retiro al comprador
 */
export async function sendBuyerOrderConfirmationEmail(params: {
  store: Store
  order: Order
  trackingNumber?: string | null
  trackingUrl?: string | null
}): Promise<EmailResult> {
  const { store, order, trackingNumber, trackingUrl } = params
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('sendBuyerOrderConfirmationEmail: RESEND_API_KEY no configurado.')
    return { ok: false, error: 'RESEND_API_KEY no configurado' }
  }

  const buyerEmail = order.email_comprador?.trim()
  if (!buyerEmail) {
    console.warn('sendBuyerOrderConfirmationEmail: El pedido no tiene email del comprador.')
    return { ok: false, error: 'Sin email de comprador' }
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Portalmaker <info@portalmaker.ar>'
  const replyTo = store.email_contacto?.trim() || store.admin_email?.trim() || 'info@portalmaker.ar'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portalmaker.ar'
  const shortOrderId = order.id.slice(0, 8).toUpperCase()
  const trackingPageUrl = `${appUrl}/tienda/seguimiento/${order.public_token}`

  const isLocalPickup = order.envio_tipo === 'retiro_local'
  const shippingMethodText = isLocalPickup
    ? 'Retiro en el local del vendedor'
    : order.envio_servicio || order.envio_proveedor || 'Envío a domicilio'

  const shippingDetailsBlock = isLocalPickup
    ? `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <h3 style="margin-top: 0; font-size: 14px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">Instrucciones para el retiro</h3>
        <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Dirección de retiro:</strong> ${store.retiro_local_direccion || 'A coordinar con la tienda'}</p>
        <p style="margin: 4px 0; font-size: 13px; color: #64748b;">El vendedor preparará tu pedido. Puedes coordinar el día y horario directamente por WhatsApp.</p>
      </div>
    `
    : `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <h3 style="margin-top: 0; font-size: 14px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">Detalles del Envío</h3>
        <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Método:</strong> ${shippingMethodText}</p>
        ${trackingNumber ? `<p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Número de guía / seguimiento:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${trackingNumber}</span></p>` : ''}
        <p style="margin: 4px 0; font-size: 13px; color: #64748b;">Podrás consultar las actualizaciones en tiempo real desde la página de seguimiento de tu pedido.</p>
      </div>
    `

  // Fila de items
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

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><title>Confirmación de Pedido</title></head>
    <body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px 32px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">${store.nombre}</h1>
          <p style="margin: 6px 0 0; color: #94a3b8; font-size: 13px;">Confirmación de Pedido #${shortOrderId}</p>
        </div>

        <div style="padding: 32px;">
          <p style="margin-top: 0; font-size: 15px; color: #334155;">Hola <strong>${order.nombre_comprador || 'Cliente'}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">
            Recibimos y confirmamos tu compra en <strong>${store.nombre}</strong>. El vendedor ya se encuentra procesando tu pedido.
          </p>

          ${shippingDetailsBlock}

          <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0;">
                <th style="text-align: left; padding: 8px 0; font-size: 11px; text-transform: uppercase; color: #64748b;">Producto</th>
                <th style="text-align: right; padding: 8px 0; font-size: 11px; text-transform: uppercase; color: #64748b;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              ${Number(order.costo_envio) > 0 ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; font-size: 13px; color: #1e293b;">Costo de envío</td>
                  <td style="padding: 10px 0; font-size: 13px; color: #0f172a; text-align: right; font-weight: 600;">$${Number(order.costo_envio).toLocaleString('es-AR')}</td>
                </tr>
              ` : ''}
              <tr>
                <td style="padding: 14px 0 0; font-size: 14px; font-weight: 700; color: #0f172a;">Total</td>
                <td style="padding: 14px 0 0; font-size: 16px; font-weight: 700; color: #0f172a; text-align: right;">$${Number(order.total).toLocaleString('es-AR')}</td>
              </tr>
            </tbody>
          </table>

          <div style="text-align: center; margin-top: 36px;">
            <a href="${trackingPageUrl}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
              Ver Estado del Pedido
            </a>
          </div>
        </div>

        <div style="background-color: #f1f5f9; padding: 16px 32px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          Portalmaker — Plataforma para Creadores y Makers de Argentina
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [buyerEmail],
        reply_to: replyTo,
        subject: `Pedido #${shortOrderId} confirmado en ${store.nombre}`,
        html,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('Error enviando email de confirmación a comprador:', errBody)
      return { ok: false, error: errBody }
    }

    return { ok: true }
  } catch (err: any) {
    console.error('Excepción al enviar email de confirmación a comprador:', err)
    return { ok: false, error: err?.message }
  }
}

/**
 * 2. Envía notificación de pedido despachado con número de tracking y link en tiempo real
 */
export async function sendBuyerOrderDispatchedEmail(params: {
  store: Store
  order: Order
  trackingNumber: string
  trackingUrl?: string | null
  providerName: string
}): Promise<EmailResult> {
  const { store, order, trackingNumber, trackingUrl, providerName } = params
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY no configurado' }

  const buyerEmail = order.email_comprador?.trim()
  if (!buyerEmail) return { ok: false, error: 'Sin email de comprador' }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Portalmaker <info@portalmaker.ar>'
  const replyTo = store.email_contacto?.trim() || store.admin_email?.trim() || 'info@portalmaker.ar'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portalmaker.ar'
  const shortOrderId = order.id.slice(0, 8).toUpperCase()
  const trackingPageUrl = `${appUrl}/tienda/seguimiento/${order.public_token}`

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><title>Tu pedido fue despachado</title></head>
    <body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px 32px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">${store.nombre}</h1>
          <p style="margin: 6px 0 0; color: #94a3b8; font-size: 13px;">Tu pedido está en camino</p>
        </div>

        <div style="padding: 32px;">
          <p style="margin-top: 0; font-size: 15px; color: #334155;">Hola <strong>${order.nombre_comprador || 'Cliente'}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">
            El vendedor ya entregó tu paquete al transportista. A continuación tienes los datos de tu envío:
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #334155;"><strong>Transportista:</strong> ${providerName}</p>
            <p style="margin: 0 0 12px; font-size: 14px; color: #334155;"><strong>Número de guía:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-size: 15px; font-weight: 600;">${trackingNumber}</span></p>
            <p style="margin: 0; font-size: 13px; color: #64748b;">
              El tiempo de entrega estimado depende del servicio seleccionado y la distancia de destino.
            </p>
          </div>

          <div style="text-align: center; margin-top: 32px;">
            <a href="${trackingPageUrl}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
              Seguir Envío en Vivo
            </a>
          </div>

          ${trackingUrl ? `
            <div style="text-align: center; margin-top: 12px;">
              <a href="${trackingUrl}" target="_blank" rel="noopener noreferrer" style="color: #64748b; text-decoration: underline; font-size: 12px;">
                Ver en la plataforma del transportista
              </a>
            </div>
          ` : ''}
        </div>

        <div style="background-color: #f1f5f9; padding: 16px 32px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          Pedido #${shortOrderId} en ${store.nombre}
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [buyerEmail],
        reply_to: replyTo,
        subject: `Tu pedido #${shortOrderId} de ${store.nombre} ya fue despachado`,
        html,
      }),
    })
    return { ok: res.ok }
  } catch (err: any) {
    return { ok: false, error: err?.message }
  }
}

/**
 * 3. Envía notificación de pedido entregado
 */
export async function sendBuyerOrderDeliveredEmail(params: {
  store: Store
  order: Order
}): Promise<EmailResult> {
  const { store, order } = params
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY no configurado' }

  const buyerEmail = order.email_comprador?.trim()
  if (!buyerEmail) return { ok: false, error: 'Sin email de comprador' }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Portalmaker <info@portalmaker.ar>'
  const replyTo = store.email_contacto?.trim() || store.admin_email?.trim() || 'info@portalmaker.ar'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portalmaker.ar'
  const shortOrderId = order.id.slice(0, 8).toUpperCase()
  const trackingPageUrl = `${appUrl}/tienda/seguimiento/${order.public_token}`

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><title>Pedido Entregado</title></head>
    <body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px 32px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">${store.nombre}</h1>
          <p style="margin: 6px 0 0; color: #94a3b8; font-size: 13px;">Pedido Entregado</p>
        </div>

        <div style="padding: 32px;">
          <p style="margin-top: 0; font-size: 15px; color: #334155;">Hola <strong>${order.nombre_comprador || 'Cliente'}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">
            El transportista informó que tu pedido <strong>#${shortOrderId}</strong> fue entregado con éxito en el destino pactado.
          </p>

          <p style="font-size: 14px; color: #475569; line-height: 1.5;">
            ¡Esperamos que disfrutes de tu compra! Si tienes alguna consulta o necesitas contactar al taller de ${store.nombre}, puedes comunicarte mediante WhatsApp o responder a este correo.
          </p>

          <div style="text-align: center; margin-top: 32px;">
            <a href="${trackingPageUrl}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
              Ver Detalles del Pedido
            </a>
          </div>
        </div>

        <div style="background-color: #f1f5f9; padding: 16px 32px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          Gracias por apoyar a los creadores de Portalmaker.
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [buyerEmail],
        reply_to: replyTo,
        subject: `Tu pedido #${shortOrderId} de ${store.nombre} fue entregado`,
        html,
      }),
    })
    return { ok: res.ok }
  } catch (err: any) {
    return { ok: false, error: err?.message }
  }
}
