import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getValidMpAccessToken } from '@/lib/mercadopago'
import { processMpPayment, getMpApiBaseUrl } from '@/lib/mp-payments'

// =============================================================================
// PORTALMAKER — Endpoint de Reconciliación de Pagos Mercado Pago (Cron Job)
// Protegido por CRON_SECRET. Busca pagos aprobados que hayan perdido su webhook.
// =============================================================================

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Validar autorización del cron
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.error('CRON_SECRET no está configurado en producción')
      return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 })
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const now = Date.now()
    const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString()
    const fortyEightHoursAgo = new Date(now - 48 * 60 * 60 * 1000).toISOString()

    // Buscar pedidos con mp_preference_id, estado pendiente o rechazado, creados entre 10 min y 48 h atrás
    const { data: candidateOrders, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, store_id, total, estado_pago, mp_preference_id, created_at')
      .not('mp_preference_id', 'is', null)
      .in('estado_pago', ['pendiente', 'rechazado'])
      .lte('created_at', tenMinutesAgo)
      .gte('created_at', fortyEightHoursAgo)
      .limit(30)

    if (orderErr) {
      console.error('Error al consultar pedidos candidatos en mp-reconcile:', orderErr)
      return NextResponse.json({ error: 'Error de base de datos' }, { status: 500 })
    }

    if (!candidateOrders || candidateOrders.length === 0) {
      return NextResponse.json({ message: 'No hay pedidos pendientes de reconciliación', reconciled: 0 })
    }

    let reconciledCount = 0
    const results: Array<{ orderId: string; paymentId?: string; status: string }> = []
    const baseUrl = getMpApiBaseUrl()

    for (const order of candidateOrders) {
      try {
        const { data: store } = await supabaseAdmin
          .from('stores')
          .select('*')
          .eq('id', order.store_id)
          .maybeSingle()

        if (!store || !store.mp_connected) continue

        const sellerToken = await getValidMpAccessToken(store)
        if (!sellerToken) continue

        // Buscar pagos por external_reference = order.id
        const searchUrl = `${baseUrl}/v1/payments/search?external_reference=${encodeURIComponent(order.id)}&sort=date_created&criteria=desc`
        const searchRes = await fetch(searchUrl, {
          headers: {
            Authorization: `Bearer ${sellerToken}`,
          },
        })

        if (!searchRes.ok) continue

        const searchData = await searchRes.json()
        const payments = Array.isArray(searchData.results) ? searchData.results : []

        for (const payment of payments) {
          if (payment && payment.id) {
            const procResult = await processMpPayment({
              paymentId: String(payment.id),
              orderId: order.id,
              eventType: 'reconciliation_cron',
            })

            results.push({
              orderId: order.id,
              paymentId: String(payment.id),
              status: procResult.status,
            })

            if (procResult.status === 'aprobado') {
              reconciledCount++
            }
          }
        }
      } catch (procErr) {
        console.error(`Error reconciliando pedido ${order.id}:`, procErr)
      }
    }

    return NextResponse.json({
      message: 'Reconciliación completada',
      processedOrders: candidateOrders.length,
      reconciledPayments: reconciledCount,
      details: results,
    })
  } catch (err: any) {
    console.error('Excepción en cron mp-reconcile:', err)
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 })
  }
}
