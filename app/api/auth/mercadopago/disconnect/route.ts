import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'

// =============================================================================
// PORTALMAKER — Mercado Pago: Desvincular Cuenta
// Permite al dueño de la tienda desconectar su cuenta de Mercado Pago.
// =============================================================================

export async function POST(req: Request) {
  try {
    const { storeId } = await req.json()

    if (!storeId) {
      return NextResponse.json({ error: 'storeId es requerido' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // Verificar que el usuario sea el dueño de la tienda o platform admin
    const { data: store, error: storeErr } = await supabaseAdmin
      .from('stores')
      .select('id, admin_email')
      .eq('id', storeId)
      .single()

    if (storeErr || !store) {
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    }

    const { data: isAdmin } = await supabaseAdmin
      .from('platform_admins')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()

    if (store.admin_email !== user.email && !isAdmin) {
      return NextResponse.json({ error: 'No tienes permisos sobre esta tienda' }, { status: 403 })
    }

    // Desvincular cuenta en la base de datos y limpiar store_mp_credentials
    await supabaseAdmin
      .from('store_mp_credentials')
      .delete()
      .eq('store_id', storeId)

    const { error: updateErr } = await supabaseAdmin
      .from('stores')
      .update({
        mp_connected: false,
        mp_user_id: null,
        mp_access_token: null,
        mp_refresh_token: null,
        mp_public_key: null,
        mp_token_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storeId)

    if (updateErr) {
      return NextResponse.json({ error: 'Error al desvincular cuenta' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Cuenta de Mercado Pago desvinculada correctamente' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 })
  }
}
