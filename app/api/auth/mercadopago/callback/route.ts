import { NextResponse } from 'next/server'
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server'

// =============================================================================
// PORTALMAKER — Mercado Pago OAuth: Callback
// Recibe el código de autorización, lo intercambia por el Access Token
// y lo vincula permanentemente a la tienda del maker en Supabase.
// =============================================================================

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  const supabaseAdmin = createSupabaseAdminClient()

  // Fallback de URL de retorno
  let returnUrl = `${origin}/tienda/admin/pagos`

  if (errorParam) {
    console.warn('Autorización de Mercado Pago cancelada o rechazada:', errorParam)
    return NextResponse.redirect(`${returnUrl}?error=mp_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${returnUrl}?error=mp_missing_params`)
  }

  try {
    // 1. Consumir el state de forma atómica (DELETE ... RETURNING) para prevenir replays (E2)
    const { data: stateRecord, error: stateErr } = await supabaseAdmin
      .from('mp_oauth_states')
      .delete()
      .eq('state', state)
      .select('id, store_id, user_id, expires_at')
      .maybeSingle()

    if (stateErr || !stateRecord) {
      console.error('State inválido, ya consumido o inexistente:', state)
      return NextResponse.redirect(`${returnUrl}?error=mp_invalid_state`)
    }

    // Validar expiración del state
    if (stateRecord.expires_at && new Date(stateRecord.expires_at).getTime() < Date.now()) {
      console.error('State OAuth expirado:', state)
      return NextResponse.redirect(`${returnUrl}?error=mp_state_expired`)
    }

    // Validar que el usuario que inició el flujo coincida con la sesión activa si existe
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (stateRecord.user_id && (!user || stateRecord.user_id !== user.id)) {
      console.error(`Mismatch de usuario OAuth: esperado ${stateRecord.user_id}, actual ${user?.id || 'sin_sesion'}`)
      return NextResponse.redirect(`${returnUrl}?error=mp_user_mismatch`)
    }

    const storeId = stateRecord.store_id

    // Obtener datos de la tienda para construir la URL de retorno correcta
    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('id, slug, custom_domain')
      .eq('id', storeId)
      .single()

    if (store) {
      const host = req.headers.get('host') || ''
      if (store.custom_domain) {
        returnUrl = `https://${store.custom_domain}/admin/pagos`
      } else if (host.includes('localhost') || host.includes('vercel.app')) {
        returnUrl = `${origin}/tienda/admin/pagos?tenant=${store.slug}`
      } else {
        returnUrl = `https://${store.slug}.portalmaker.ar/admin/pagos`
      }
    }

    const clientId = process.env.MP_CLIENT_ID
    const clientSecret = process.env.MP_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error('Faltan credenciales de MP en variables de entorno')
      return NextResponse.redirect(`${returnUrl}?error=mp_server_config`)
    }

    // Determinar la redirect_uri exacta usada en la autorización
    let redirectUri = process.env.MP_REDIRECT_URI
    if (!redirectUri) {
      if (origin.includes('localhost')) {
        redirectUri = `${origin}/api/auth/mercadopago/callback`
      } else {
        redirectUri = 'https://www.portalmaker.ar/api/auth/mercadopago/callback'
      }
    }

    // 2. Intercambiar el código por el token de la tienda
    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_secret: clientSecret,
        client_id: clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Error al intercambiar token en Mercado Pago:', tokenData)
      return NextResponse.redirect(`${returnUrl}?error=mp_token_exchange_failed`)
    }

    // 3. Calcular fecha de expiración
    const expiresInSeconds = tokenData.expires_in || 15552000 // 180 días por defecto
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()

    // 4. Guardar credenciales vinculadas en la tabla segura store_mp_credentials y sincronizar stores
    const { error: credErr } = await supabaseAdmin
      .from('store_mp_credentials')
      .upsert({
        store_id: storeId,
        mp_access_token: tokenData.access_token,
        mp_refresh_token: tokenData.refresh_token || null,
        mp_public_key: tokenData.public_key || null,
        mp_token_expires_at: expiresAt,
        mp_user_id: String(tokenData.user_id || ''),
        updated_at: new Date().toISOString(),
      })

    if (credErr) {
      console.error('Error guardando en store_mp_credentials:', credErr)
      return NextResponse.redirect(`${returnUrl}?error=mp_db_save_failed`)
    }

    // Actualizar flag de conexión en stores (sin almacenar tokens en la tabla stores)
    const { error: updateErr } = await supabaseAdmin
      .from('stores')
      .update({
        mp_connected: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storeId)

    if (updateErr) {
      console.error('Error al actualizar mp_connected en la tienda:', updateErr)
      return NextResponse.redirect(`${returnUrl}?error=mp_db_save_failed`)
    }

    // 5. Redirigir con éxito a la administración de pagos
    return NextResponse.redirect(`${returnUrl}?success=mp_connected`)
  } catch (err: any) {
    console.error('Excepción en /api/auth/mercadopago/callback:', err)
    return NextResponse.redirect(`${returnUrl}?error=mp_exception`)
  }
}
