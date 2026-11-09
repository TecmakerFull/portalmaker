import { NextResponse } from 'next/server'
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'
import { getValidMpAccessToken, calcularMarketplaceFeeSobreTotal } from '@/lib/mercadopago'
import { getEffectiveStoreConfig } from '@/lib/config/store-config'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const adminClient = createSupabaseAdminClient()
    const { data: order, error: orderErr } = await adminClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    const authCheck = await verifyStoreAccess(user.email, order.store_id)
    if (!authCheck.authorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (!order.is_deposit || Number(order.balance_pending) <= 0 || order.balance_paid) {
      return NextResponse.json(
        { error: 'El pedido no tiene saldo pendiente por cobrar' },
        { status: 400 }
      )
    }

    const { data: store } = await adminClient
      .from('stores')
      .select('*')
      .eq('id', order.store_id)
      .maybeSingle()

    if (!store || !store.mp_connected) {
      return NextResponse.json(
        { error: 'La tienda no tiene Mercado Pago vinculado' },
        { status: 400 }
      )
    }

    const storeAccessToken = await getValidMpAccessToken(store)
    if (!storeAccessToken) {
      return NextResponse.json(
        { error: 'Token de Mercado Pago no disponible o revocado' },
        { status: 400 }
      )
    }

    const storeConfig = await getEffectiveStoreConfig(store.id)
    const balanceAmount = Number(Number(order.balance_pending).toFixed(2))
    const comisionPct = Number(storeConfig.commission_pct) || 0
    const balanceFee = comisionPct > 0 ? calcularMarketplaceFeeSobreTotal(balanceAmount, comisionPct) : 0

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.portalmaker.ar').replace(/\/$/, '')
    const webhookUrl = `${appUrl}/api/webhooks/mercadopago?order_id=${order.id}`
    const returnUrl = `${appUrl}/tienda/pedido-confirmado?order_id=${order.id}&token=${order.public_token || ''}&status=approved`

    const preferencePayload: any = {
      items: [
        {
          id: `saldo_${order.id}`,
          title: `Saldo pendiente - Pedido #${order.id.slice(0, 8)} (${store.nombre})`,
          quantity: 1,
          unit_price: balanceAmount,
          currency_id: 'ARS',
        },
      ],
      payer: {
        name: order.nombre_comprador || 'Cliente',
        email: order.email_comprador || 'cliente@portalmaker.ar',
      },
      back_urls: {
        success: returnUrl,
        failure: returnUrl,
        pending: returnUrl,
      },
      auto_return: 'approved',
      external_reference: order.id,
      notification_url: webhookUrl,
      statement_descriptor: ((store.nombre || 'Tienda').trim()).slice(0, 16),
      metadata: {
        order_id: order.id,
        store_id: store.id,
        tipo_cobro: 'saldo_pendiente',
      },
    }

    if (balanceFee > 0 && balanceFee < balanceAmount) {
      preferencePayload.marketplace_fee = balanceFee
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storeAccessToken}`,
      },
      body: JSON.stringify(preferencePayload),
    })

    const mpData = await mpRes.json()

    if (!mpRes.ok || !mpData.id) {
      console.error('Error generando preferencia para saldo en MP:', mpData)
      return NextResponse.json(
        { error: 'No se pudo generar el link de pago en Mercado Pago' },
        { status: 500 }
      )
    }

    const initPoint =
      process.env.MP_SANDBOX === 'true' && mpData.sandbox_init_point
        ? mpData.sandbox_init_point
        : mpData.init_point

    await adminClient
      .from('orders')
      .update({
        balance_mp_preference_id: mpData.id,
      })
      .eq('id', order.id)

    return NextResponse.json({
      initPoint,
      preferenceId: mpData.id,
      amount: balanceAmount,
    })
  } catch (err: any) {
    console.error('Error al generar preferencia por saldo:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
