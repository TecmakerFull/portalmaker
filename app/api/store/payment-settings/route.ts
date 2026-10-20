import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'

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
      section, // 'mp' | 'transferencia' | undefined (ambos)
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

    // 1. Obtener la tienda y verificar pertenencia con verifyStoreAccess
    const authResult = await verifyStoreAccess(user.email, storeId, {
      allowCollaborators: true,
      requiredCollaboratorRoles: ['admin'],
    })

    if (!authResult.authorized || !authResult.store) {
      return NextResponse.json({ error: authResult.error || 'No tienes permisos sobre esta tienda' }, { status: 403 })
    }

    const store = authResult.store

    let cleanRecargo = store.mp_recargo_porcentaje ?? 0
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (section === 'mp' || !section) {
      // 2. Validación estricta de mp_recargo_porcentaje (D2d)
      const rawRecargo = Number(mpRecargoPorcentaje ?? 0)
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
      cleanRecargo = Number(rawRecargo.toFixed(2))
      updatePayload.mp_recargo_porcentaje = cleanRecargo
    }

    if (section === 'transferencia' || !section) {
      // 3. Sanitizar campos de transferencia bancaria
      const cleanAlias = transferenciaAlias ? String(transferenciaAlias).trim().slice(0, 100) : null
      const cleanCbuCvu = transferenciaCbuCvu ? String(transferenciaCbuCvu).trim().slice(0, 50) : null
      const cleanBanco = transferenciaBanco ? String(transferenciaBanco).trim().slice(0, 100) : null
      const cleanTitular = transferenciaTitular ? String(transferenciaTitular).trim().slice(0, 150) : null
      const cleanCuit = transferenciaCuit ? String(transferenciaCuit).trim().slice(0, 30) : null
      const cleanInstrucciones = transferenciaInstrucciones
        ? String(transferenciaInstrucciones).trim().slice(0, 1000)
        : null

      updatePayload.transferencia_activa = Boolean(transferenciaActiva)
      updatePayload.transferencia_alias = cleanAlias
      updatePayload.transferencia_cbu_cvu = cleanCbuCvu
      updatePayload.transferencia_banco = cleanBanco
      updatePayload.transferencia_titular = cleanTitular
      updatePayload.transferencia_cuit = cleanCuit
      updatePayload.transferencia_instrucciones = cleanInstrucciones
    }

    // 4. Guardar exclusivamente las columnas permitidas (NUNCA comision_portalmaker ni credenciales)
    const { error: updateErr } = await supabaseAdmin
      .from('stores')
      .update(updatePayload)
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
