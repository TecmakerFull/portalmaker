// =============================================================================
// PORTALMAKER — Emails del ciclo de cobro de planes (Resend)
// Los datos de la tienda se leen de la base y todo valor interpolado se escapa.
// Sin emojis (regla del proyecto). El botón apunta siempre al panel de la tienda,
// nunca a un link con identificadores sueltos.
// =============================================================================

import type { Store } from '@/types/database'

export type SubscriptionEmailKind =
  | 'reminder_7d'
  | 'reminder_1d'
  | 'grace_started'
  | 'store_paused'
  | 'payment_confirmed'
  | 'payment_failed'

export interface SubscriptionEmailData {
  amount?: number
  planName?: string
  dueDate?: string // YYYY-MM-DD
  graceEnds?: string // YYYY-MM-DD
  graceDays?: number
  autoDebit?: boolean
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fmtDate(iso?: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function fmtMoney(n?: number): string {
  return `$${Number(n ?? 0).toLocaleString('es-AR')}`
}

export function buildSubscriptionEmail(
  kind: SubscriptionEmailKind,
  storeName: string,
  data: SubscriptionEmailData
): { subject: string; heading: string; lines: string[]; cta: string } {
  const amount = fmtMoney(data.amount)
  const due = fmtDate(data.dueDate)
  const graceEnds = fmtDate(data.graceEnds)
  const plan = data.planName || 'tu plan'

  switch (kind) {
    case 'reminder_7d':
      return {
        subject: `Tu suscripción de ${storeName} vence en 7 días`,
        heading: 'Tu suscripción vence en 7 días',
        lines: data.autoDebit
          ? [`El ${due} se cobrará ${amount} por ${plan} con tu débito automático de Mercado Pago.`, 'No tenés que hacer nada. Si querés cambiar el medio de pago, podés hacerlo desde el panel.']
          : [`El ${due} vence ${plan} de ${storeName}. Monto a abonar: ${amount}.`, `Después del vencimiento tenés ${data.graceDays ?? 3} días de gracia antes de que la tienda se pause.`],
        cta: data.autoDebit ? 'Ver mi suscripción' : 'Pagar con Mercado Pago',
      }
    case 'reminder_1d':
      return {
        subject: `Último aviso: la suscripción de ${storeName} vence mañana`,
        heading: 'Tu suscripción vence mañana',
        lines: [`Mañana (${due}) vence ${plan}. Monto: ${amount}.`, `Si no se registra el pago, tenés ${data.graceDays ?? 3} días de gracia antes de que la tienda se pause.`],
        cta: 'Pagar con Mercado Pago',
      }
    case 'grace_started':
      return {
        subject: `La suscripción de ${storeName} está en período de gracia`,
        heading: 'Entraste en período de gracia',
        lines: [`La suscripción venció el ${due}. Tu tienda sigue funcionando hasta el ${graceEnds}.`, `Si el pago no se registra para esa fecha, la tienda se pausa y no podrá recibir pedidos ni turnos. Monto: ${amount}.`],
        cta: 'Regularizar el pago',
      }
    case 'store_paused':
      return {
        subject: `Tu tienda ${storeName} fue pausada por falta de pago`,
        heading: 'Tu tienda fue pausada',
        lines: ['Terminó el período de gracia y no registramos el pago de la suscripción. Mientras esté pausada, no recibe pedidos ni turnos.', `Podés reactivarla al instante abonando ${amount}. Tu información y catálogo se conservan.`],
        cta: 'Pagar y reactivar',
      }
    case 'payment_confirmed':
      return {
        subject: `Recibimos el pago de la suscripción de ${storeName}`,
        heading: 'Pago confirmado',
        lines: [`Acreditamos ${amount} correspondientes a ${plan}.`, `Tu próximo vencimiento es el ${due}.`],
        cta: 'Ver mi suscripción',
      }
    case 'payment_failed':
      return {
        subject: `No pudimos cobrar la suscripción de ${storeName}`,
        heading: 'No se pudo realizar el cobro automático',
        lines: ['Mercado Pago no pudo procesar el débito automático de tu suscripción. Va a reintentar por su cuenta.', 'Para evitar que la tienda se pause, podés abonar ahora de forma manual.'],
        cta: 'Pagar ahora',
      }
  }
}

export async function sendSubscriptionEmail(
  kind: SubscriptionEmailKind,
  store: Pick<Store, 'nombre' | 'admin_email'>,
  data: SubscriptionEmailData
): Promise<{ ok: boolean; error?: string; to?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const to = store.admin_email?.trim()
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY no configurado' }
  if (!to) return { ok: false, error: 'La tienda no tiene admin_email' }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://portalmaker.com.ar').replace(/\/$/, '')
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Portalmaker <info@portalmaker.ar>'
  const mail = buildSubscriptionEmail(kind, store.nombre || 'tu tienda', data)

  // El panel de cada tienda vive en su subdominio; desde el portal el dueño llega a
  // su tienda con un clic, así que el botón apunta al dashboard común.
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
      <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 16px;">${esc(mail.heading)}</h1>
      ${mail.lines.map((l) => `<p style="font-size: 14px; line-height: 1.6; margin: 0 0 12px;">${esc(l)}</p>`).join('')}
      <p style="margin: 24px 0;">
        <a href="${esc(appUrl)}/dashboard/maker" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;">${esc(mail.cta)}</a>
      </p>
      <p style="font-size: 12px; color: #64748b;">Mensaje automático de Portalmaker. Ingresá al panel de tu tienda, sección Suscripción, para ver el detalle.</p>
    </div>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromEmail, to: [to], subject: mail.subject, html }),
    })
    if (!res.ok) return { ok: false, error: `Resend ${res.status}`, to }
    return { ok: true, to }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error de red', to }
  }
}
