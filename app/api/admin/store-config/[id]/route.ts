import { NextRequest, NextResponse } from 'next/server'
import { verifySuperadmin } from '@/lib/store-auth'
import {
  getEffectiveStoreConfig,
  invalidateStoreConfigCache,
  DEFAULT_PLANS_FALLBACK,
} from '@/lib/config/store-config'

interface Params {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/store-config/[id]
 * Devuelve la configuración del plan, los overrides y la configuración efectiva de una tienda.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { id: storeId } = await params
  const auth = await verifySuperadmin()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const { supabaseAdmin } = auth

  // 1. Obtener la tienda
  const { data: store, error: storeErr } = await supabaseAdmin
    .from('stores')
    .select('id, nombre, slug, plan, admin_email')
    .eq('id', storeId)
    .maybeSingle()

  if (storeErr || !store) {
    return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
  }

  // 2. Obtener plan por defecto
  const planKey = (store.plan || 'maker_pro').toLowerCase()
  const { data: planData } = await supabaseAdmin
    .from('plans')
    .select('*')
    .eq('id', planKey)
    .maybeSingle()

  const planDefaults = planData || DEFAULT_PLANS_FALLBACK[planKey] || DEFAULT_PLANS_FALLBACK.maker_pro

  // 3. Obtener override actual
  const { data: overrideRow } = await supabaseAdmin
    .from('store_plan_overrides')
    .select('*')
    .eq('store_id', storeId)
    .maybeSingle()

  // 4. Obtener configuración efectiva (única fuente de verdad)
  const effectiveConfig = await getEffectiveStoreConfig(storeId)

  // 5. Obtener historial de auditoría de esta tienda
  const { data: auditLogs } = await supabaseAdmin
    .from('config_audit_log')
    .select('*')
    .eq('target_type', 'store')
    .eq('target_id', storeId)
    .order('created_at', { ascending: false })
    .limit(30)

  return NextResponse.json({
    store,
    plan_defaults: planDefaults,
    override: overrideRow || null,
    effective: effectiveConfig,
    audit_logs: auditLogs || [],
  })
}

/**
 * PATCH /api/admin/store-config/[id]
 * Actualiza el plan o los overrides de una tienda y audita cada variable modificada en config_audit_log.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: storeId } = await params
  const auth = await verifySuperadmin()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  const { supabaseAdmin, user, email } = auth

  // 1. Obtener tienda actual
  const { data: store, error: storeErr } = await supabaseAdmin
    .from('stores')
    .select('id, nombre, slug, plan')
    .eq('id', storeId)
    .maybeSingle()

  if (storeErr || !store) {
    return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
  }

  const auditEntries: Array<{
    target_type: 'store'
    target_id: string
    variable_name: string
    old_value: string | null
    new_value: string | null
    changed_by_user_id: string | null
    changed_by_email: string | null
  }> = []

  // 2. Si se solicitó cambio de plan asignado
  if (body.plan !== undefined && body.plan !== store.plan) {
    const nuevoPlan = String(body.plan).toLowerCase()
    const { error: planUpdateErr } = await supabaseAdmin
      .from('stores')
      .update({ plan: nuevoPlan, updated_at: new Date().toISOString() })
      .eq('id', storeId)

    if (planUpdateErr) {
      return NextResponse.json(
        { error: `Error al actualizar plan: ${planUpdateErr.message}` },
        { status: 500 }
      )
    }

    auditEntries.push({
      target_type: 'store',
      target_id: storeId,
      variable_name: 'assigned_plan',
      old_value: store.plan,
      new_value: nuevoPlan,
      changed_by_user_id: user?.id || null,
      changed_by_email: email,
    })
  }

  // 3. Obtener overrides previos
  const { data: prevOverride } = await supabaseAdmin
    .from('store_plan_overrides')
    .select('*')
    .eq('store_id', storeId)
    .maybeSingle()

  // 4. Si se envían cambios a los overrides
  if (body.overrides !== undefined) {
    const rawOverrides = body.overrides || {}
    const overrideUpdates: Record<string, any> = {
      store_id: storeId,
      updated_at: new Date().toISOString(),
    }

    // Validar y procesar commission_pct (0 a 20 o null)
    if ('commission_pct' in rawOverrides) {
      if (rawOverrides.commission_pct === null || rawOverrides.commission_pct === '') {
        overrideUpdates.commission_pct = null
      } else {
        const comm = Number(rawOverrides.commission_pct)
        if (isNaN(comm) || comm < 0 || comm > 20) {
          return NextResponse.json(
            { error: 'La comisión personalizada debe estar entre 0% y 20%' },
            { status: 400 }
          )
        }
        overrideUpdates.commission_pct = Number(comm.toFixed(2))
      }
    }

    // Validar y procesar max_active_products (>= 0 o null)
    if ('max_active_products' in rawOverrides) {
      if (rawOverrides.max_active_products === null || rawOverrides.max_active_products === '') {
        overrideUpdates.max_active_products = null
      } else {
        const maxProd = parseInt(rawOverrides.max_active_products, 10)
        if (isNaN(maxProd) || maxProd < 0) {
          return NextResponse.json(
            { error: 'El límite de productos debe ser mayor o igual a 0, o null para usar el del plan' },
            { status: 400 }
          )
        }
        overrideUpdates.max_active_products = maxProd
      }
    }

    // Procesar flags booleanos (boolean o null)
    const booleanOverrideKeys = [
      'whatsapp_orders',
      'online_checkout',
      'mercadopago',
      'deposit_payments',
      'mp_surcharge',
      'bank_transfer',
    ] as const

    for (const key of booleanOverrideKeys) {
      if (key in rawOverrides) {
        if (rawOverrides[key] === null || rawOverrides[key] === '') {
          overrideUpdates[key] = null
        } else {
          overrideUpdates[key] = Boolean(rawOverrides[key])
        }
      }
    }

    // Procesar override_until (ISO date o null)
    if ('override_until' in rawOverrides) {
      if (rawOverrides.override_until === null || rawOverrides.override_until === '') {
        overrideUpdates.override_until = null
      } else {
        const parsed = new Date(rawOverrides.override_until)
        if (isNaN(parsed.getTime())) {
          return NextResponse.json(
            { error: 'Fecha de vencimiento de override inválida' },
            { status: 400 }
          )
        }
        overrideUpdates.override_until = parsed.toISOString()
      }
    }

    // Comparar con el estado previo y registrar auditoría
    for (const [key, val] of Object.entries(overrideUpdates)) {
      if (key === 'store_id' || key === 'updated_at') continue
      const prevVal = prevOverride ? prevOverride[key] : null
      const prevStr = prevVal !== null && prevVal !== undefined ? String(prevVal) : null
      const newStr = val !== null && val !== undefined ? String(val) : null

      if (prevStr !== newStr) {
        auditEntries.push({
          target_type: 'store',
          target_id: storeId,
          variable_name: key,
          old_value: prevStr,
          new_value: newStr,
          changed_by_user_id: user?.id || null,
          changed_by_email: email,
        })
      }
    }

    // Guardar en store_plan_overrides
    const { error: upsertErr } = await supabaseAdmin
      .from('store_plan_overrides')
      .upsert(
        {
          ...(prevOverride || {}),
          ...overrideUpdates,
        },
        { onConflict: 'store_id' }
      )

    if (upsertErr) {
      return NextResponse.json(
        { error: `Error al guardar overrides: ${upsertErr.message}` },
        { status: 500 }
      )
    }
  }

  // 5. Guardar entradas de auditoría
  if (auditEntries.length > 0) {
    await supabaseAdmin.from('config_audit_log').insert(auditEntries)
  }

  // 6. Invalidar caché para esta tienda
  invalidateStoreConfigCache(storeId)

  // 7. Retornar la nueva configuración efectiva
  const effectiveConfig = await getEffectiveStoreConfig(storeId)

  return NextResponse.json({
    success: true,
    effective: effectiveConfig,
    auditCount: auditEntries.length,
  })
}

