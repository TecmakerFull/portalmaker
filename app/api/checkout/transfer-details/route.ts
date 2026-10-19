import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

// =============================================================================
// PORTALMAKER — Endpoint Seguro para Datos Bancarios en Checkout (G3)
// Retorna información de transferencia bancaria solo bajo demanda de checkout.
// =============================================================================

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('store_id')

    if (!storeId) {
      return NextResponse.json({ error: 'store_id es requerido' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const { data: store, error } = await supabaseAdmin
      .from('stores')
      .select('id, transferencia_activa, transferencia_alias, transferencia_cbu_cvu, transferencia_banco, transferencia_titular, transferencia_cuit, transferencia_instrucciones')
      .eq('id', storeId)
      .single()

    if (error || !store || !store.transferencia_activa) {
      return NextResponse.json({ transferencia_activa: false }, { status: 200 })
    }

    return NextResponse.json({
      transferencia_activa: true,
      alias: store.transferencia_alias,
      cbuCvu: store.transferencia_cbu_cvu,
      banco: store.transferencia_banco,
      titular: store.transferencia_titular,
      cuit: store.transferencia_cuit,
      instrucciones: store.transferencia_instrucciones,
    })
  } catch (err: any) {
    console.error('Error en /api/checkout/transfer-details:', err)
    return NextResponse.json({ error: 'Error interno al consultar datos de cobro' }, { status: 500 })
  }
}
