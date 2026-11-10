-- =============================================================================
-- PORTALMAKER — Corrección: encadenar el período solo si el pago llega dentro de la gracia
-- Fecha: 2026-11-10
--
-- Antes la RPC encadenaba el nuevo período al vencimiento anterior mientras la tienda
-- siguiera activa, sin mirar la fecha. Ahora exige hoy <= vencimiento + dias_gracia;
-- fuera de ese plazo el período corre desde hoy. Reemplaza la función de
-- 20261110_subscription_billing_system.sql (mismos permisos).
-- =============================================================================

create or replace function public.process_subscription_payment(
  p_invoice_id uuid,
  p_mp_payment_id text,
  p_amount_paid numeric,
  p_store_patch jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.subscription_invoices%rowtype;
  v_store public.stores%rowtype;
  v_today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_base date;
  v_new_due date;
  v_anchor int;
  v_extends boolean;
  v_plan_changed boolean;
  v_old_plan text;
begin
  if p_mp_payment_id is null or length(trim(p_mp_payment_id)) = 0 then
    return jsonb_build_object('success', false, 'reason', 'missing_payment_id');
  end if;

  select * into v_invoice from public.subscription_invoices where id = p_invoice_id for update;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'invoice_not_found');
  end if;

  -- Idempotencia: el mismo pago ya aplicado, o la factura ya cobrada con otro pago.
  if v_invoice.status = 'paid' then
    if v_invoice.mp_payment_id = p_mp_payment_id then
      return jsonb_build_object('success', true, 'already_processed', true, 'store_id', v_invoice.store_id);
    end if;
    return jsonb_build_object('success', false, 'reason', 'duplicate_payment', 'store_id', v_invoice.store_id);
  end if;

  -- Un pago ya usado en otra factura nunca se reaplica.
  if exists (select 1 from public.subscription_payments where mp_payment_id = p_mp_payment_id) then
    return jsonb_build_object('success', true, 'already_processed', true, 'store_id', v_invoice.store_id);
  end if;

  -- Facturas canceladas/reembolsadas: hubo plata real, se avisa para revisión manual.
  if v_invoice.status in ('cancelled', 'refunded') then
    return jsonb_build_object('success', false, 'reason', 'invoice_closed', 'store_id', v_invoice.store_id);
  end if;

  if p_amount_paid is null or p_amount_paid < v_invoice.amount then
    return jsonb_build_object('success', false, 'reason', 'amount_mismatch', 'store_id', v_invoice.store_id,
      'expected', v_invoice.amount, 'received', p_amount_paid);
  end if;

  select * into v_store from public.stores where id = v_invoice.store_id for update;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'store_not_found');
  end if;

  -- Si paga al día o en gracia, el nuevo período se encadena al vencimiento previo
  -- (no pierde días por pagar antes). Si estaba pausada o venía de Free, corre desde hoy.
  -- Además del estado se valida la fecha: si el cron no corrió, una tienda vencida más
  -- allá de la gracia seguiría figurando activa y se le regalaría el hueco sin cobrar.
  v_extends := v_store.fecha_proximo_vencimiento is not null
    and coalesce(v_store.plan, 'free') not in ('free')
    and coalesce(v_store.estado_pago, 'al_dia') <> 'vencido'
    and v_store.suscripcion_activa is not false
    and v_today <= (v_store.fecha_proximo_vencimiento + coalesce(v_store.dias_gracia, 3));

  v_base := case when v_extends then v_store.fecha_proximo_vencimiento else v_today end;
  v_anchor := coalesce(v_invoice.billing_anchor_day, extract(day from v_base)::int);
  v_new_due := public.sub_add_month(v_base, v_anchor);

  v_old_plan := coalesce(v_store.plan, 'free');
  v_plan_changed := v_old_plan is distinct from v_invoice.target_plan;

  insert into public.subscription_payments (
    store_id, monto, metodo_pago, periodo_desde, periodo_hasta, fecha_pago,
    registrado_por, notas, plan_pagado, mp_payment_id, invoice_id, estado
  ) values (
    v_invoice.store_id, p_amount_paid, 'mercadopago', v_base, v_new_due, v_today,
    'sistema', 'Acreditado automáticamente desde Mercado Pago (' || v_invoice.source || ')',
    v_invoice.target_plan, p_mp_payment_id, v_invoice.id, 'aprobado'
  );

  update public.subscription_invoices
  set status = 'paid', mp_payment_id = p_mp_payment_id, paid_at = now(),
      period_start = v_base, period_end = v_new_due, billing_anchor_day = v_anchor
  where id = v_invoice.id;

  -- Esta función corre como owner: el trigger de columnas protegidas la deja pasar
  -- porque current_user es postgres, igual que al operar con service_role.
  update public.stores
  set
    plan = v_invoice.target_plan,
    precio_mensual = v_invoice.amount,
    estado_pago = 'al_dia',
    suscripcion_activa = true,
    fecha_proximo_vencimiento = v_new_due,
    fecha_inicio_suscripcion = coalesce(fecha_inicio_suscripcion, v_today),
    -- Valores por defecto del plan, solo cuando el plan cambia (allowlist explícita).
    limite_productos = case when v_plan_changed and p_store_patch ? 'limite_productos'
      then (p_store_patch->>'limite_productos')::int else limite_productos end,
    comision_portalmaker = case when v_plan_changed and p_store_patch ? 'comision_portalmaker'
      then (p_store_patch->>'comision_portalmaker')::numeric else comision_portalmaker end,
    modo_operacion = case when v_plan_changed and p_store_patch ? 'modo_operacion'
      then p_store_patch->>'modo_operacion' else modo_operacion end,
    checkout_activo = case when v_plan_changed and p_store_patch ? 'checkout_activo'
      then (p_store_patch->>'checkout_activo')::boolean else checkout_activo end,
    features_override = case when v_plan_changed and p_store_patch ? 'features_override'
      then p_store_patch->'features_override' else features_override end,
    updated_at = now()
  where id = v_invoice.store_id;

  insert into public.config_audit_log (user_email, entity_type, entity_id, variable_name, old_value, new_value, metadata)
  values (
    'sistema', 'store_plan', v_invoice.store_id::text, 'plan_cobro_suscripcion',
    v_old_plan, v_invoice.target_plan,
    jsonb_build_object('invoice_id', v_invoice.id, 'mp_payment_id', p_mp_payment_id,
      'amount', p_amount_paid, 'source', v_invoice.source, 'new_due', v_new_due)
  );

  return jsonb_build_object(
    'success', true, 'already_processed', false,
    'store_id', v_invoice.store_id, 'plan', v_invoice.target_plan,
    'period_from', v_base, 'new_due', v_new_due, 'plan_changed', v_plan_changed
  );
end;
$$;

revoke all on function public.process_subscription_payment(uuid, text, numeric, jsonb) from public, anon, authenticated;
grant execute on function public.process_subscription_payment(uuid, text, numeric, jsonb) to service_role;
