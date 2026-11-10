// =============================================================================
// PORTALMAKER — Cobro de planes: operaciones de servidor (Mercado Pago + Supabase)
// Solo se importa desde Route Handlers, webhooks y crons: usa service_role.
// Quien llame a createManualInvoice debe haber validado antes la sesión y el rol
// con verifyStoreAccess(); este módulo no confía en nada que venga del cliente.
// =============================================================================

import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getMpApiBaseUrl } from '@/lib/mp-payments'
import { getSafeReturnOrigin } from '@/lib/mercadopago'
import { notifyPlatformAlert } from '@/lib/email-notifications'
import { getPlanConfig } from '@/lib/plans'
import { sendSubscriptionEmail } from '@/lib/subscriptions/emails'
import {
  buildPlanStorePatch,
  checkPaymentAmount,
  computeNextDue,
  resolveInvoiceAmount,
  resolveListPrice,
  todayArgentina,
  addDays,
} from '@/lib/subscriptions/billing'
import type { BillablePlan, Store, SubscriptionInvoice } from '@/types/database'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Vigencia del link de pago: cubre pagos en efectivo, que se acreditan en 1 a 3 días. */
const INVOICE_TTL_DAYS = 7

/** Token propio de Portalmaker. Sin fallback a MP_ACCESS_TOKEN para no mezclar credenciales. */
export function getPlatformMpToken(): string | null {
  const t = process.env.MP_PLATFORM_ACCESS_TOKEN?.trim()
  return t || null
}

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://portalmaker.com.ar').replace(/\/$/, '')
}

// -----------------------------------------------------------------------------
// Crear (o reutilizar) la factura manual y su preferencia de Checkout Pro
// -----------------------------------------------------------------------------
export async function createManualInvoice(params: {
  store: Store
  targetPlan: BillablePlan
  returnOrigin?: string | null
}): Promise<{ invoice: SubscriptionInvoice; initPoint: string }> {
  const { store, targetPlan } = params
  const token = getPlatformMpToken()
  if (!token) throw new Error('PLATFORM_TOKEN_MISSING')

  const admin = createSupabaseAdminClient()
  const today = todayArgentina()

  const { data: planRow } = await admin.from('plans').select('price_ars').eq('id', targetPlan).maybeSingle()
  const listPrice = resolveListPrice(planRow ? Number(planRow.price_ars) : null, targetPlan)
  const amount = resolveInvoiceAmount(store, targetPlan, listPrice)
  if (!(amount > 0)) throw new Error('INVALID_AMOUNT')

  // Reutilizar la factura pendiente si sigue vigente y el monto no cambió.
  const { data: existing } = await admin
    .from('subscription_invoices')
    .select('*')
    .eq('store_id', store.id)
    .eq('target_plan', targetPlan)
    .eq('status', 'pending')
    .eq('source', 'manual')
    .maybeSingle()

  if (existing) {
    const ageDays = (Date.now() - new Date(existing.created_at).getTime()) / 86_400_000
    const reusable = Number(existing.amount) === amount && existing.mp_init_point && ageDays < INVOICE_TTL_DAYS - 1
    if (reusable) return { invoice: existing as SubscriptionInvoice, initPoint: existing.mp_init_point }
    // Vencida o con monto desactualizado: se cierra y se genera una nueva.
    await admin.from('subscription_invoices').update({ status: 'expired' }).eq('id', existing.id).eq('status', 'pending')
  }

  const next = computeNextDue(store, today)
  const { data: created, error: insErr } = await admin
    .from('subscription_invoices')
    .insert({
      store_id: store.id,
      target_plan: targetPlan,
      amount,
      period_start: next.periodFrom,
      period_end: next.newDue,
      due_date: store.fecha_proximo_vencimiento ?? today,
      source: 'manual',
      billing_anchor_day: Number(next.periodFrom.slice(8, 10)),
    })
    .select('*')
    .single()

  if (insErr || !created) {
    // Carrera: otra solicitud creó la pendiente entre el select y el insert.
    if (insErr?.code === '23505') {
      const { data: again } = await admin
        .from('subscription_invoices')
        .select('*')
        .eq('store_id', store.id)
        .eq('target_plan', targetPlan)
        .eq('status', 'pending')
        .eq('source', 'manual')
        .maybeSingle()
      if (again?.mp_init_point) return { invoice: again as SubscriptionInvoice, initPoint: again.mp_init_point }
    }
    throw new Error(`INVOICE_INSERT_FAILED:${insErr?.message ?? 'sin detalle'}`)
  }

  const safeOrigin = getSafeReturnOrigin(params.returnOrigin, store)
  const planName = getPlanConfig(targetPlan).nombre
  const expires = new Date(Date.now() + INVOICE_TTL_DAYS * 86_400_000).toISOString()

  const preference = {
    items: [
      {
        id: created.id,
        title: `Suscripción Portalmaker - Plan ${planName}`,
        quantity: 1,
        unit_price: amount,
        currency_id: 'ARS',
      },
    ],
    payer: store.admin_email ? { email: store.admin_email } : undefined,
    back_urls: {
      success: `${safeOrigin}/tienda/admin/suscripcion?payment=success`,
      failure: `${safeOrigin}/tienda/admin/suscripcion?payment=failure`,
      pending: `${safeOrigin}/tienda/admin/suscripcion?payment=pending`,
    },
    // MP exige una URL pública (https) para volver automáticamente: en desarrollo local
    // se omite y el comprador vuelve con el botón de la pantalla de MP.
    ...(safeOrigin.startsWith('https://') ? { auto_return: 'approved' } : {}),
    external_reference: `sub_${created.id}`,
    // kind=sub es solo una pista de enrutado: el pago se vuelve a consultar en MP y
    // se valida su external_reference, así que alterarla no acredita nada.
    notification_url: `${appBaseUrl()}/api/webhooks/mercadopago?kind=sub`,
    statement_descriptor: 'PORTALMAKER',
    expires: true,
    expiration_date_from: new Date().toISOString(),
    expiration_date_to: expires,
    metadata: { invoice_id: created.id, store_id: store.id, kind: 'subscription' },
  }

  let initPoint: string | undefined
  let prefId: string | undefined
  try {
    const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Idempotency-Key': created.id },
      body: JSON.stringify(preference),
    })
    if (!res.ok) {
      // El cuerpo de error de MP no lleva credenciales; se recorta para no llenar logs.
      const detail = (await res.text().catch(() => '')).slice(0, 400)
      throw new Error(`MP_PREFERENCE_FAILED:${res.status}:${detail}`)
    }
    const data = await res.json()
    initPoint = data.init_point
    prefId = data.id
    if (!initPoint) throw new Error('MP_PREFERENCE_NO_INIT_POINT')
  } catch (err) {
    await admin.from('subscription_invoices').update({ status: 'cancelled' }).eq('id', created.id)
    throw err
  }

  const { data: updated } = await admin
    .from('subscription_invoices')
    .update({ mp_preference_id: prefId, mp_init_point: initPoint })
    .eq('id', created.id)
    .select('*')
    .single()

  return { invoice: (updated ?? created) as SubscriptionInvoice, initPoint }
}

// -----------------------------------------------------------------------------
// Acreditar un pago de la cuenta de Portalmaker (webhook y reconciliación)
// -----------------------------------------------------------------------------
export interface PlatformPaymentResult {
  /** false = el pago no es de suscripción: el llamador sigue con el flujo de pedidos. */
  handled: boolean
  status: string
  httpStatus: number
  storeId?: string
}

export async function creditPlatformPayment(paymentId: string): Promise<PlatformPaymentResult> {
  const token = getPlatformMpToken()
  if (!token) return { handled: false, status: 'platform_token_missing', httpStatus: 200 }

  let res: Response
  try {
    res = await fetch(`${getMpApiBaseUrl()}/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
  } catch {
    return { handled: true, status: 'mp_fetch_network_error', httpStatus: 500 }
  }

  // Con el token de la plataforma solo se ven pagos de la plataforma: 404 o 401
  // significa que el pago es de una tienda y sigue el flujo normal de pedidos.
  if (res.status === 404 || res.status === 401 || res.status === 403) {
    return { handled: false, status: 'not_platform_payment', httpStatus: 200 }
  }
  if (!res.ok) return { handled: true, status: 'mp_fetch_error', httpStatus: 500 }

  const payment = await res.json()
  const ref = String(payment.external_reference ?? '')
  if (!ref.startsWith('sub_')) return { handled: false, status: 'not_subscription_payment', httpStatus: 200 }

  const invoiceId = ref.slice(4)
  if (!UUID_RE.test(invoiceId)) return { handled: true, status: 'invalid_reference', httpStatus: 200 }

  const admin = createSupabaseAdminClient()
  const { data: invoice } = await admin.from('subscription_invoices').select('*').eq('id', invoiceId).maybeSingle()
  if (!invoice) return { handled: true, status: 'invoice_not_found', httpStatus: 200 }

  const { data: store } = await admin.from('stores').select('*').eq('id', invoice.store_id).maybeSingle()

  // Reembolsos y contracargos: se revierte el período y se avisa al equipo.
  if (payment.status === 'refunded' || payment.status === 'charged_back') {
    const { data: rev } = await admin.rpc('reverse_subscription_payment', { p_mp_payment_id: String(payment.id) })
    if (rev?.success && !rev.already_processed) {
      await notifyPlatformAlert({
        type: 'subscription_refunded',
        store: store as Store | null,
        details: `Pago ${payment.status} sobre la factura ${invoice.id}. Se retrocedió el vencimiento; revisar si corresponde bajar el plan.`,
        paymentId: String(payment.id),
      })
    }
    return { handled: true, status: `reversed_${payment.status}`, httpStatus: 200, storeId: invoice.store_id }
  }

  if (payment.status !== 'approved') {
    return { handled: true, status: `ignored_${payment.status}`, httpStatus: 200, storeId: invoice.store_id }
  }

  if (payment.currency_id !== 'ARS') {
    await notifyPlatformAlert({
      type: 'subscription_amount_mismatch',
      store: store as Store | null,
      details: `Moneda inesperada ${payment.currency_id} en la factura ${invoice.id}.`,
      paymentId: String(payment.id),
    })
    return { handled: true, status: 'currency_mismatch', httpStatus: 200, storeId: invoice.store_id }
  }

  const received = Number(payment.transaction_amount)
  const amountCheck = checkPaymentAmount(Number(invoice.amount), received)
  if (amountCheck === 'under') {
    await notifyPlatformAlert({
      type: 'subscription_amount_mismatch',
      store: store as Store | null,
      details: `Se esperaban $${invoice.amount} y se recibieron $${received} (factura ${invoice.id}). No se acreditó el plan.`,
      paymentId: String(payment.id),
    })
    return { handled: true, status: 'amount_mismatch', httpStatus: 200, storeId: invoice.store_id }
  }

  const { data: rpc, error: rpcErr } = await admin.rpc('process_subscription_payment', {
    p_invoice_id: invoice.id,
    p_mp_payment_id: String(payment.id),
    p_amount_paid: received,
    p_store_patch: buildPlanStorePatch(invoice.target_plan),
  })

  if (rpcErr) {
    console.error('process_subscription_payment falló:', rpcErr.message)
    return { handled: true, status: 'rpc_error', httpStatus: 500, storeId: invoice.store_id }
  }

  if (!rpc?.success) {
    if (rpc?.reason === 'duplicate_payment' || rpc?.reason === 'invoice_closed') {
      await notifyPlatformAlert({
        type: 'subscription_invoice_closed',
        store: store as Store | null,
        details: `Pago aprobado ${payment.id} para la factura ${invoice.id}, que está en estado ${invoice.status} (${rpc.reason}). Reembolsar o conciliar a mano.`,
        paymentId: String(payment.id),
      })
    }
    return { handled: true, status: rpc?.reason ?? 'rpc_rejected', httpStatus: 200, storeId: invoice.store_id }
  }

  if (rpc.already_processed) {
    return { handled: true, status: 'already_processed', httpStatus: 200, storeId: invoice.store_id }
  }

  if (amountCheck === 'over') {
    await notifyPlatformAlert({
      type: 'subscription_overpaid',
      store: store as Store | null,
      details: `Se esperaban $${invoice.amount} y se recibieron $${received} (factura ${invoice.id}). Se acreditó un período; evaluar devolver la diferencia.`,
      paymentId: String(payment.id),
    })
  }

  // Comprobante por email. El log con restricción única evita duplicados si MP reenvía.
  if (store) {
    const { error: logErr } = await admin.from('subscription_notifications_log').insert({
      store_id: store.id,
      due_date: rpc.new_due,
      notification_type: 'payment_confirmed',
      sent_to: store.admin_email ?? '',
    })
    if (!logErr) {
      const sent = await sendSubscriptionEmail('payment_confirmed', store, {
        amount: received,
        planName: getPlanConfig(invoice.target_plan).nombre,
        dueDate: rpc.new_due,
      })
      if (!sent.ok) {
        await admin.from('subscription_notifications_log').delete().eq('store_id', store.id).eq('due_date', rpc.new_due).eq('notification_type', 'payment_confirmed')
      }
    }
  }

  return { handled: true, status: 'credited', httpStatus: 200, storeId: invoice.store_id }
}

/** Reconciliación ante webhooks perdidos: busca en MP los pagos de las facturas pendientes recientes. */
export async function reconcilePendingInvoices(): Promise<{ checked: number; credited: number }> {
  const token = getPlatformMpToken()
  if (!token) return { checked: 0, credited: 0 }

  const admin = createSupabaseAdminClient()
  const since = addDays(todayArgentina(), -INVOICE_TTL_DAYS)
  const { data: pending } = await admin
    .from('subscription_invoices')
    .select('id')
    .eq('status', 'pending')
    .gte('created_at', `${since}T00:00:00Z`)
    .limit(200)

  let credited = 0
  for (const inv of pending ?? []) {
    try {
      const res = await fetch(
        `${getMpApiBaseUrl()}/v1/payments/search?external_reference=${encodeURIComponent(`sub_${inv.id}`)}&sort=date_created&criteria=desc&limit=5`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
      )
      if (!res.ok) continue
      const data = await res.json()
      for (const p of data.results ?? []) {
        if (p.status === 'approved') {
          const r = await creditPlatformPayment(String(p.id))
          if (r.status === 'credited') credited++
          break
        }
      }
    } catch {
      // Un error en una factura no frena el resto; se reintenta en la próxima corrida.
    }
  }
  return { checked: pending?.length ?? 0, credited }
}
