import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'

// =============================================================================
// PORTALMAKER — API para Configuración de Cobros de Tienda (D2d)
// Valida permisos de dueño/superadmin, rango de recargo (0% - 15%) y sanitiza datos.
// =============================================================================

const MAX_MP_RECARGO_PORCENTAJE = 15.0 // Límite máximo estándar para recargo de Mercado Pago

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const {
      storeId,
      mpRecargoPorcentaje,
      transferenciaActiva,
      transferenciaAlias,
      transferenciaCbuCvu,
      transferenciaBanco,
      transferenciaTitular,
      transferenciaCuit,
      transferenciaInstrucciones,
    } = body

    if (!storeId) {
      return NextResponse.json({ error: 'storeId es requerido' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // 1. Obtener la tienda y verificar pertenencia
    const { data: store, error: storeErr } = await supabaseAdmin
      .from('stores')
      .select('id, admin_email')
      .eq('id', storeId)
      .single()

    if (storeErr || !store) {
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    }

    const userEmail = (user.email || '').trim().toLowerCase()
    const storeAdminEmail = (store.admin_email || '').trim().toLowerCase()

    const { data: platformAdmin } = await supabaseAdmin
      .from('platform_admins')
      .select('id')
      .ilike('email', userEmail)
      .maybeSingle()

    const isOwner = storeAdminEmail === userEmail
    const isSuperadmin = Boolean(platformAdmin)

    if (!isOwner && !isSuperadmin) {
      return NextResponse.json({ error: 'No tienes permisos sobre esta tienda' }, { status: 403 })
    }

    // 2. Validación estricta de mp_recargo_porcentaje (D2d)
    const rawRecargo = Number(mpRecargoPorcentaje)
    if (
      typeof mpRecargoPorcentaje === 'boolean' ||
      isNaN(rawRecargo) ||
      rawRecargo < 0 ||
      rawRecargo > MAX_MP_RECARGO_PORCENTAJE
    ) {
      return NextResponse.json(
        {
          error: `El recargo por servicio de cobro debe ser un número entre 0% y ${MAX_MP_RECARGO_PORCENTAJE}%.`,
        },
        { status: 400 }
      )
    }

    const cleanRecargo = Number(rawRecargo.toFixed(2))

    // 3. Sanitizar campos de transferencia bancaria
    const cleanAlias = transferenciaAlias ? String(transferenciaAlias).trim().slice(0, 100) : null
    const cleanCbuCvu = transferenciaCbuCvu ? String(transferenciaCbuCvu).trim().slice(0, 50) : null
    const cleanBanco = transferenciaBanco ? String(transferenciaBanco).trim().slice(0, 100) : null
    const cleanTitular = transferenciaTitular ? String(transferenciaTitular).trim().slice(0, 150) : null
    const cleanCuit = transferenciaCuit ? String(transferenciaCuit).trim().slice(0, 30) : null
    const cleanInstrucciones = transferenciaInstrucciones
      ? String(transferenciaInstrucciones).trim().slice(0, 1000)
      : null

    // 4. Guardar exclusivamente las columnas permitidas (NUNCA comision_portalmaker ni credenciales)
    const { error: updateErr } = await supabaseAdmin
      .from('stores')
      .update({
        mp_recargo_porcentaje: cleanRecargo,
        transferencia_activa: Boolean(transferenciaActiva),
        transferencia_alias: cleanAlias,
        transferencia_cbu_cvu: cleanCbuCvu,
        transferencia_banco: cleanBanco,
        transferencia_titular: cleanTitular,
        transferencia_cuit: cleanCuit,
        transferencia_instrucciones: cleanInstrucciones,
        updated_at: new Date().toISOString(),
      })
      .eq('id', store.id)

    if (updateErr) {
      console.error('Error al actualizar datos de cobro de tienda:', updateErr)
      return NextResponse.json({ error: 'Error interno al guardar la configuración' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración de cobros guardada correctamente',
      recargo: cleanRecargo,
    })
  } catch (err: any) {
    console.error('Excepción en /api/store/payment-settings:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
