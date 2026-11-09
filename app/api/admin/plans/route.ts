import { NextRequest, NextResponse } from 'next/server'
import { verifySuperadmin } from '@/lib/store-auth'
import { invalidateStoreConfigCache, DEFAULT_PLANS_FALLBACK } from '@/lib/config/store-config'

/**
 * GET /api/admin/plans
 * Lista todos los planes configurados en la plataforma con sus valores por defecto.
 */
export async function GET() {
  const auth = await verifySuperadmin()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const { supabaseAdmin } = auth
  const { data: plans, error } = await supabaseAdmin
    .from('plans')
    .select('*')
    .order('created_at', { ascending: true })

  if (error || !plans || plans.length === 0) {
    // Si la tabla no tiene filas todavía, retornar el fallback estándar
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
      precio_mensual_ars: id === 'free' ? 0 : id === 'starter' ? 4900 : id === 'maker_pro' ? 9900 : 19900,
    }))
    return NextResponse.json({ plans: fallbackList })
  }

  return NextResponse.json({ plans })
}

/**
 * PATCH /api/admin/plans
 * Actualiza los valores por defecto de un plan y audita cada modificación en config_audit_log.
 */
export async function PATCH(req: NextRequest) {
  const auth = await verifySuperadmin()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body || !body.planId) {
    return NextResponse.json({ error: 'Falta planId en la solicitud' }, { status: 400 })
  }

  const { planId } = body
  const { supabaseAdmin, user, email } = auth

  // 1. Obtener estado previo del plan
  const { data: currentPlan, error: fetchErr } = await supabaseAdmin
    .from('plans')
    .select('*')
    .eq('id', planId)
    .maybeSingle()

  if (fetchErr) {
    return NextResponse.json({ error: 'Error al consultar el plan' }, { status: 500 })
  }

  // 2. Validaciones de negocio requeridas
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (body.commission_pct !== undefined) {
    const comm = Number(body.commission_pct)
    if (isNaN(comm) || comm < 0 || comm > 20) {
      return NextResponse.json(
        { error: 'La comisión de Portalmaker debe estar entre 0% y 20%' },
        { status: 400 }
      )
    }
    updates.commission_pct = Number(comm.toFixed(2))
  }

  if (body.max_active_products !== undefined) {
    if (body.max_active_products === null || body.max_active_products === '') {
      updates.max_active_products = null
    } else {
      const maxProd = parseInt(body.max_active_products, 10)
      if (isNaN(maxProd) || maxProd < 0) {
        return NextResponse.json(
          { error: 'El límite de productos activos debe ser mayor o igual a 0, o null para ilimitado' },
          { status: 400 }
        )
      }
      updates.max_active_products = maxProd
    }
  }

  const booleanKeys = [
    'whatsapp_orders',
    'online_checkout',
    'mercadopago',
    'deposit_payments',
    'mp_surcharge',
    'bank_transfer',
  ] as const

  for (const key of booleanKeys) {
    if (body[key] !== undefined) {
      updates[key] = Boolean(body[key])
    }
  }

  if (body.precio_mensual_ars !== undefined) {
    const precio = Number(body.precio_mensual_ars)
    if (!isNaN(precio) && precio >= 0) {
      updates.precio_mensual_ars = Number(precio.toFixed(2))
    }
  }

  // 3. Registrar auditoría para cada variable que haya cambiado
  const auditEntries: Array<{
    target_type: 'plan'
    target_id: string
    variable_name: string
    old_value: string | null
    new_value: string | null
    changed_by_user_id: string | null
    changed_by_email: string | null
  }> = []

  for (const [key, val] of Object.entries(updates)) {
    if (key === 'updated_at') continue
    const oldVal = currentPlan ? currentPlan[key] : null
    const oldStr = oldVal !== null && oldVal !== undefined ? String(oldVal) : null
    const newStr = val !== null && val !== undefined ? String(val) : null

    if (oldStr !== newStr) {
      auditEntries.push({
        target_type: 'plan',
        target_id: planId,
        variable_name: key,
        old_value: oldStr,
        new_value: newStr,
        changed_by_user_id: user?.id || null,
        changed_by_email: email,
      })
    }
  }

  // 4. Actualizar plan en la base de datos
  const { data: updatedPlan, error: updateErr } = await supabaseAdmin
    .from('plans')
    .upsert(
      {
        id: planId,
        nombre: currentPlan?.nombre || planId,
        ...updates,
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single()

  if (updateErr) {
    return NextResponse.json(
      { error: `Error al actualizar el plan: ${updateErr.message}` },
      { status: 500 }
    )
  }

  // 5. Insertar logs de auditoría si hubo cambios
  if (auditEntries.length > 0) {
    await supabaseAdmin.from('config_audit_log').insert(auditEntries)
  }

  // 6. Invalidar caché global de configuración para que impacte de inmediato en todas las tiendas
  invalidateStoreConfigCache()

  return NextResponse.json({ success: true, plan: updatedPlan, changesCount: auditEntries.length })
}

