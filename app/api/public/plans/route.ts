import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { DEFAULT_PLANS_FALLBACK } from '@/lib/config/store-config'

export const revalidate = 60 // Cache for 60 seconds

/**
 * GET /api/public/plans
 * Endpoint público que expone la lista de planes y sus valores por defecto
 * para renderizar la tabla comparativa y tarjetas de precios.
 * Nunca expone datos de tiendas ni overrides individuales.
 */
export async function GET() {
  try {
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: plans, error } = await supabaseAdmin
      .from('plans')
      .select('*')
      .order('created_at', { ascending: true })

    if (error || !plans || plans.length === 0) {
      const fallbackList = Object.entries(DEFAULT_PLANS_FALLBACK).map(([id, p]) => ({
        id,
        nombre: id === 'maker_pro' ? 'Maker Pro' : id.charAt(0).toUpperCase() + id.slice(1),
        commission_pct: p.commission_pct,
        max_active_products: p.max_active_products,
        whatsapp_orders: p.whatsapp_orders,
        online_checkout: p.online_checkout,
        mercadopago: p.mercadopago,
        deposit_payments: p.deposit_payments,
        mp_surcharge: p.mp_surcharge,
        bank_transfer: p.bank_transfer,
        precio_mensual_ars: id === 'free' ? 0 : id === 'starter' ? 12000 : id === 'maker_pro' ? 25000 : 50000,
      }))
      return NextResponse.json({ plans: fallbackList })
    }

    return NextResponse.json({ plans })
  } catch {
    return NextResponse.json({
      plans: Object.entries(DEFAULT_PLANS_FALLBACK).map(([id, p]) => ({
        id,
        nombre: id === 'maker_pro' ? 'Maker Pro' : id.charAt(0).toUpperCase() + id.slice(1),
        commission_pct: p.commission_pct,
        max_active_products: p.max_active_products,
        whatsapp_orders: p.whatsapp_orders,
        online_checkout: p.online_checkout,
        mercadopago: p.mercadopago,
        deposit_payments: p.deposit_payments,
        mp_surcharge: p.mp_surcharge,
        bank_transfer: p.bank_transfer,
        precio_mensual_ars: id === 'free' ? 0 : id === 'starter' ? 12000 : id === 'maker_pro' ? 25000 : 50000,
      })),
    })
  }
}
