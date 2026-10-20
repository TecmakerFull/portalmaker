import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'

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

    // Item 6: Comparación case-insensitive de emails mediante función centralizada
    const authResult = await verifyStoreAccess(user.email, storeId)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'No tienes permisos sobre esta tienda' }, { status: 403 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // Desvincular cuenta en la base de datos y limpiar store_mp_credentials
    await supabaseAdmin
      .from('store_mp_credentials')
      .delete()
      .eq('store_id', storeId)

    const { error: updateErr } = await supabaseAdmin
      .from('stores')
      .update({
        mp_connected: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storeId)

    if (updateErr) {
      return NextResponse.json({ error: 'Error al desvincular cuenta' }, { status: 500 })
    }

    // Item 6: Indicar que la autorización también se puede revocar desde la cuenta del vendedor
    return NextResponse.json({
      success: true,
      message: 'Cuenta de Mercado Pago desvinculada de la tienda. Recuerda que la autorización de la aplicación también puede ser revocada directamente desde tu cuenta de Mercado Pago (Seguridad > Aplicaciones con acceso).',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 })
  }
}
