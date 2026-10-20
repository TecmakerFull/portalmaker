import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'
import crypto from 'crypto'

// =============================================================================
// PORTALMAKER — Mercado Pago OAuth: Iniciar Autorización
// Redirige al dueño de la tienda a Mercado Pago para autorizar a Portalmaker.
// =============================================================================

export async function GET(req: Request) {
  try {
    const { searchParams, origin } = new URL(req.url)
    const storeId = searchParams.get('store_id')
    const returnTo = searchParams.get('return_to') || '/tienda/admin/pagos'

    if (!storeId) {
      return NextResponse.json({ error: 'store_id es requerido' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // Verificar que el usuario sea el dueño de la tienda o un platform admin
    const authResult = await verifyStoreAccess(user.email, storeId)
    if (!authResult.authorized || !authResult.store) {
      return NextResponse.json({ error: authResult.error || 'No tienes permisos sobre esta tienda' }, { status: 403 })
    }
    const store = authResult.store

    const clientId = process.env.MP_CLIENT_ID
    if (!clientId) {
      return NextResponse.json({ error: 'MP_CLIENT_ID no configurado en el servidor' }, { status: 500 })
    }

    // Determinar la URL de redirección configurada en Mercado Pago Developers
    // Si estamos en localhost y no hay MP_REDIRECT_URI explícito, permitir localhost para tests
    let redirectUri = process.env.MP_REDIRECT_URI
    if (!redirectUri) {
      if (origin.includes('localhost')) {
        redirectUri = `${origin}/api/auth/mercadopago/callback`
      } else {
        redirectUri = 'https://www.portalmaker.ar/api/auth/mercadopago/callback'
      }
    }

    // Generar un state seguro para prevenir ataques CSRF con 10 min de vigencia (O4)
    const stateToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // O4: Limpiar estados vencidos usando expires_at
    await supabaseAdmin
      .from('mp_oauth_states')
      .delete()
      .or(`expires_at.lt.${new Date().toISOString()},created_at.lt.${new Date(Date.now() - 3600000).toISOString()}`)

    const { error: stateInsertErr } = await supabaseAdmin.from('mp_oauth_states').insert({
      store_id: store.id,
      user_id: user.id,
      state: stateToken,
      expires_at: expiresAt,
    })

    if (stateInsertErr) {
      console.error('Error al guardar state OAuth:', stateInsertErr)
      return NextResponse.json({ error: 'Error al iniciar flujo OAuth' }, { status: 500 })
    }

    // Construir la URL oficial de autorización de Mercado Pago
    const mpAuthUrl = new URL('https://auth.mercadopago.com.ar/authorization')
    mpAuthUrl.searchParams.set('client_id', clientId)
    mpAuthUrl.searchParams.set('response_type', 'code')
    mpAuthUrl.searchParams.set('platform_id', 'mp')
    mpAuthUrl.searchParams.set('state', stateToken)
    mpAuthUrl.searchParams.set('redirect_uri', redirectUri)

    return NextResponse.redirect(mpAuthUrl.toString())
  } catch (err: any) {
    console.error('Error en /api/auth/mercadopago/authorize:', err)
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 })
  }
}
