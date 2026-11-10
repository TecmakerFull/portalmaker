-- =============================================================================
-- PORTALMAKER — Migración: sistema de cobro de planes (pago manual + débito automático)
-- Fecha: 2026-11-10
-- Plan: documentacion/plan_cobro_suscripciones.md
--
-- 1. subscription_invoices   : cada cobro esperado (manual o débito automático)
-- 2. subscription_mandates   : suscripción de MP (preapproval) por tienda
-- 3. subscription_notifications_log : evita avisos duplicados por vencimiento
-- 4. subscription_payments   : columnas de MP + trigger de vencimiento corregido
-- 5. RPC process_subscription_payment / reverse_subscription_payment
--
-- Todas las escrituras de estas tablas las hace service_role (webhook, cron y
-- endpoints validados con verifyStoreAccess). El dueño solo lee lo suyo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. subscription_invoices
-- -----------------------------------------------------------------------------
create table if not exists public.subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  target_plan text not null check (target_plan in ('starter', 'maker_pro', 'enterprise')),
  amount numeric(12,2) not null check (amount > 0),
  period_start date not null,
  period_end date not null,
  due_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'expired', 'cancelled', 'refunded')),
  source text not null default 'manual' check (source in ('manual', 'auto_debit')),
  -- Día del mes que ancla el ciclo: evita la deriva 31/01 -> 28/02 -> 28/03.
  billing_anchor_day smallint check (billing_anchor_day between 1 and 31),
  mp_preference_id text,
  mp_init_point text,
  mp_payment_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_sub_invoices_store on public.subscription_invoices(store_id, created_at desc);
create index if not exists idx_sub_invoices_pending on public.subscription_invoices(status, created_at) where status = 'pending';

-- Una sola factura manual pendiente por tienda y plan: el botón de pagar
-- reutiliza la existente en vez de generar una nueva en cada clic.
create unique index if not exists uq_sub_invoices_one_pending_manual
  on public.subscription_invoices(store_id, target_plan)
  where status = 'pending' and source = 'manual';

alter table public.subscription_invoices enable row level security;

drop policy if exists "read_own_subscription_invoices" on public.subscription_invoices;
create policy "read_own_subscription_invoices" on public.subscription_invoices
  for select to authenticated
  using (
    auth.jwt() ->> 'email' = (select admin_email from public.stores where id = subscription_invoices.store_id)
    or public.is_platform_admin()
  );

revoke all on public.subscription_invoices from anon, public;
grant select on public.subscription_invoices to authenticated;
grant all on public.subscription_invoices to service_role;

-- -----------------------------------------------------------------------------
-- 2. subscription_mandates (débito automático opcional)
-- -----------------------------------------------------------------------------
create table if not exists public.subscription_mandates (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references public.stores(id) on delete cascade,
  mp_preapproval_id text unique,
  status text not null default 'pending'
    check (status in ('pending', 'authorized', 'paused', 'cancelled')),
  target_plan text not null check (target_plan in ('starter', 'maker_pro', 'enterprise')),
  amount numeric(12,2) not null check (amount > 0),
  payer_email text not null,
  billing_day smallint check (billing_day between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscription_mandates enable row level security;

drop policy if exists "read_own_subscription_mandate" on public.subscription_mandates;
create policy "read_own_subscription_mandate" on public.subscription_mandates
  for select to authenticated
  using (
    auth.jwt() ->> 'email' = (select admin_email from public.stores where id = subscription_mandates.store_id)
    or public.is_platform_admin()
  );

revoke all on public.subscription_mandates from anon, public;
grant select on public.subscription_mandates to authenticated;
grant all on public.subscription_mandates to service_role;

-- -----------------------------------------------------------------------------
-- 3. subscription_notifications_log
-- -----------------------------------------------------------------------------
create table if not exists public.subscription_notifications_log (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  due_date date not null,
  notification_type text not null
    check (notification_type in ('reminder_7d', 'reminder_1d', 'grace_started', 'store_paused', 'payment_confirmed', 'payment_failed')),
  sent_to text not null,
  sent_at timestamptz not null default now(),
  unique (store_id, due_date, notification_type)
);

alter table public.subscription_notifications_log enable row level security;
-- Sin políticas: solo service_role (bypassa RLS) accede.
revoke all on public.subscription_notifications_log from anon, authenticated, public;
grant all on public.subscription_notifications_log to service_role;

-- -----------------------------------------------------------------------------
-- 4. subscription_payments: columnas de MP y trigger de vencimiento corregido
-- -----------------------------------------------------------------------------
alter table public.subscription_payments
  add column if not exists plan_pagado text,
  add column if not exists mp_payment_id text,
  add column if not exists invoice_id uuid references public.subscription_invoices(id) on delete set null,
  add column if not exists estado text not null default 'aprobado' check (estado in ('aprobado', 'reembolsado'));

create unique index if not exists uq_subpayments_mp_payment on public.subscription_payments(mp_payment_id) where mp_payment_id is not null;

-- El trigger original pisaba el vencimiento con periodo_hasta en cada insert, lo
-- que permitía ACORTARLO con un pago manual retroactivo. Ahora solo lo adelanta,
-- y no actúa sobre pagos de Mercado Pago (los resuelve la RPC con sus reglas).
create or replace function public.actualizar_vencimiento_suscripcion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.mp_payment_id is not null or new.estado <> 'aprobado' then
    return new;
  end if;

  update public.stores
  set
    fecha_proximo_vencimiento = greatest(coalesce(fecha_proximo_vencimiento, new.periodo_hasta), new.periodo_hasta),
    suscripcion_activa = true,
    estado_pago = case when estado_pago = 'bonificado' then estado_pago else 'al_dia' end,
    updated_at = now()
  where id = new.store_id;

  -- Un pago registrado a mano cierra las facturas pendientes de la tienda para
  -- no cobrar dos veces el mismo período.
  update public.subscription_invoices
  set status = 'cancelled'
  where store_id = new.store_id and status = 'pending';

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5a. Helper: suma un mes respetando el día ancla (y el último día del mes)
-- -----------------------------------------------------------------------------
create or replace function public.sub_add_month(p_base date, p_anchor int)
returns date
language sql
immutable
as $$
  with m as (
    select (date_trunc('month', p_base) + interval '1 month')::date as first_day
  )
  select (m.first_day
    + (least(coalesce(p_anchor, extract(day from p_base)::int),
             extract(day from (m.first_day + interval '1 month' - interval '1 day'))::int) - 1))::date
  from m;
$$;

-- -----------------------------------------------------------------------------
-- 5b. RPC process_subscription_payment
-- Acredita un pago aprobado de Mercado Pago contra una factura. Idempotente:
-- bloquea la factura y la tienda, así que webhook y cron concurrentes no pueden
-- aplicar el mismo pago dos veces. p_store_patch trae los valores por defecto del
-- plan (límites, checkout, etc.) calculados en el servidor desde lib/plans.ts y
-- solo se aplican cuando el plan cambia (no pisa overrides en una renovación).
-- -----------------------------------------------------------------------------
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
  v_extends := v_store.fecha_proximo_vencimiento is not null
    and coalesce(v_store.plan, 'free') not in ('free')
    and coalesce(v_store.estado_pago, 'al_dia') <> 'vencido'
    and v_store.suscripcion_activa is not false;

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

-- -----------------------------------------------------------------------------
-- 5c. RPC reverse_subscription_payment (reembolso o contracargo)
-- Quita el período acreditado. No baja el plan automáticamente: lo evalúa el
-- superadmin (la alerta se dispara desde el webhook).
-- -----------------------------------------------------------------------------
create or replace function public.reverse_subscription_payment(p_mp_payment_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay public.subscription_payments%rowtype;
  v_store public.stores%rowtype;
  v_prev_due date;
begin
  select * into v_pay from public.subscription_payments where mp_payment_id = p_mp_payment_id for update;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'payment_not_found');
  end if;
  if v_pay.estado = 'reembolsado' then
    return jsonb_build_object('success', true, 'already_processed', true, 'store_id', v_pay.store_id);
  end if;

  update public.subscription_payments set estado = 'reembolsado' where id = v_pay.id;
  update public.subscription_invoices set status = 'refunded' where id = v_pay.invoice_id;

  select * into v_store from public.stores where id = v_pay.store_id for update;

  -- Solo se retrocede el vencimiento si el pago revertido es el último período
  -- acreditado; si ya hay uno posterior, el vencimiento actual no se toca.
  if v_store.fecha_proximo_vencimiento = v_pay.periodo_hasta then
    v_prev_due := v_pay.periodo_desde;
    update public.stores
    set fecha_proximo_vencimiento = v_prev_due, updated_at = now()
    where id = v_pay.store_id;
  end if;

  insert into public.config_audit_log (user_email, entity_type, entity_id, variable_name, old_value, new_value, metadata)
  values ('sistema', 'store_plan', v_pay.store_id::text, 'reverso_cobro_suscripcion',
    v_pay.periodo_hasta::text, coalesce(v_prev_due::text, v_store.fecha_proximo_vencimiento::text),
    jsonb_build_object('mp_payment_id', p_mp_payment_id, 'payment_id', v_pay.id));

  return jsonb_build_object('success', true, 'already_processed', false, 'store_id', v_pay.store_id);
end;
$$;

revoke all on function public.reverse_subscription_payment(text) from public, anon, authenticated;
grant execute on function public.reverse_subscription_payment(text) to service_role;
