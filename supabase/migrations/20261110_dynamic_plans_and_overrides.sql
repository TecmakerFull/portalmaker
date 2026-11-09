-- =============================================================================
-- PORTALMAKER — Migración: Planes Dinámicos, Overrides por Tienda y Auditoría
-- Fecha: 2026-11-10
--
-- 1. Tabla plans (valores por defecto de cada plan)
-- 2. Tabla store_plan_overrides (overrides específicos por tienda)
-- 3. Tabla config_audit_log (auditoría de cambios de planes y overrides)
-- 4. Soporte para seña en products y orders
-- 5. RPC get_effective_store_config(p_store_id)
-- 6. Migración selectiva de comisiones (excluyendo valor default histórico 2%)
-- =============================================================================

-- 1. TABLA PLANS
create table if not exists public.plans (
  id text primary key, -- 'free', 'starter', 'maker_pro', 'enterprise', 'bonificado'
  name text not null,
  description text,
  price_ars numeric(12,2) not null default 0,
  commission_pct numeric(5,2) not null default 0,
  max_active_products integer, -- null = ilimitado
  whatsapp_orders boolean not null default true,
  online_checkout boolean not null default true,
  mercadopago boolean not null default true,
  deposit_payments boolean not null default true,
  mp_surcharge boolean not null default true,
  bank_transfer boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed de planes oficiales según especificación
insert into public.plans (
  id, name, description, price_ars, commission_pct,
  max_active_products, whatsapp_orders, online_checkout,
  mercadopago, deposit_payments, mp_surcharge, bank_transfer
)
values
  ('free', 'Free', 'Plan inicial para comenzar a vender', 0, 3.00, 15, true, true, true, true, true, false),
  ('starter', 'Starter', 'Para tiendas en crecimiento', 12000, 2.00, 50, true, true, true, true, true, true),
  ('maker_pro', 'Maker Pro', 'Para marcas y negocios consolidados', 25000, 1.00, 150, true, true, true, true, true, true),
  ('enterprise', 'Enterprise', 'Para grandes negocios con volumen ilimitado', 50000, 0.00, null, true, true, true, true, true, true),
  ('bonificado', 'Bonificado', 'Cuenta bonificada para fundadores y partners', 0, 0.00, null, true, true, true, true, true, true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price_ars = excluded.price_ars,
  commission_pct = excluded.commission_pct,
  max_active_products = excluded.max_active_products,
  whatsapp_orders = excluded.whatsapp_orders,
  online_checkout = excluded.online_checkout,
  mercadopago = excluded.mercadopago,
  deposit_payments = excluded.deposit_payments,
  mp_surcharge = excluded.mp_surcharge,
  bank_transfer = excluded.bank_transfer,
  updated_at = now();

-- 2. TABLA STORE_PLAN_OVERRIDES
create table if not exists public.store_plan_overrides (
  store_id uuid primary key references public.stores(id) on delete cascade,
  commission_pct numeric(5,2) check (commission_pct is null or (commission_pct >= 0 and commission_pct <= 20)),
  max_active_products integer check (max_active_products is null or max_active_products >= 0),
  whatsapp_orders boolean,
  online_checkout boolean,
  mercadopago boolean,
  deposit_payments boolean,
  mp_surcharge boolean,
  bank_transfer boolean,
  override_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. TABLA CONFIG_AUDIT_LOG
create table if not exists public.config_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  entity_type text not null check (entity_type in ('plan', 'store_override', 'store_plan')),
  entity_id text not null, -- plan id o store_id
  variable_name text not null,
  old_value text,
  new_value text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_config_audit_entity on public.config_audit_log(entity_type, entity_id);
create index if not exists idx_config_audit_created on public.config_audit_log(created_at desc);

-- 4. EXTENSIÓN DE PRODUCTS (SEÑA)
alter table public.products
  add column if not exists deposit_enabled boolean not null default false,
  add column if not exists deposit_type text check (deposit_type is null or deposit_type in ('percent', 'fixed')),
  add column if not exists deposit_value numeric(12,2) check (deposit_value is null or deposit_value >= 0);

-- 5. EXTENSIÓN DE ORDERS (SNAPSHOTS DE COMISIÓN, MARKETPLACE_FEE Y SEÑA)
alter table public.orders
  add column if not exists marketplace_fee_applied numeric(12,2),
  add column if not exists fee_source text check (fee_source is null or fee_source in ('plan', 'override')),
  add column if not exists is_deposit boolean not null default false,
  add column if not exists deposit_amount numeric(12,2) default 0,
  add column if not exists balance_pending numeric(12,2) default 0,
  add column if not exists balance_paid boolean not null default false,
  add column if not exists balance_mp_preference_id text,
  add column if not exists balance_mp_payment_id text;

-- Permitir estado_pago 'sena_pagada'
alter table public.orders drop constraint if exists orders_estado_pago_check;
alter table public.orders
  add constraint orders_estado_pago_check
  check (estado_pago in ('pendiente', 'aprobado', 'rechazado', 'revision', 'reembolsado', 'contracargo', 'sena_pagada'));

-- 6. DEPRECAR COLUMNAS HISTÓRICAS EN STORES
comment on column public.stores.comision_portalmaker is 'DEPRECATED: Usar plans y store_plan_overrides via getEffectiveStoreConfig()';
comment on column public.stores.features_override is 'DEPRECATED: Usar store_plan_overrides via getEffectiveStoreConfig()';

-- 7. MIGRACIÓN DE DATOS EXISTENTES
-- Regla crítica: NO convertir stores.comision_portalmaker si su valor es 2 (default viejo global).
-- Solo migrar tiendas con valor explícito distinto de 2.
insert into public.store_plan_overrides (store_id, commission_pct)
select s.id, s.comision_portalmaker
from public.stores s
where s.comision_portalmaker is not null
  and s.comision_portalmaker <> 2
on conflict (store_id) do update
set commission_pct = excluded.commission_pct;

-- 8. RLS Y PERMISOS
alter table public.plans enable row level security;
alter table public.store_plan_overrides enable row level security;
alter table public.config_audit_log enable row level security;

-- Plans: lectura pública (catálogo de planes), escritura solo superadmin
drop policy if exists "plans_read_public" on public.plans;
create policy "plans_read_public" on public.plans
  for select to anon, authenticated
  using (true);

drop policy if exists "plans_write_superadmin" on public.plans;
create policy "plans_write_superadmin" on public.plans
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

grant select on public.plans to anon, authenticated;
grant all on public.plans to service_role;

-- Overrides: solo superadmin tiene acceso por RLS directo.
-- Los dueños consultan la config efectiva via get_effective_store_config().
drop policy if exists "overrides_superadmin_all" on public.store_plan_overrides;
create policy "overrides_superadmin_all" on public.store_plan_overrides
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

revoke all on public.store_plan_overrides from anon, public;
grant all on public.store_plan_overrides to service_role;

-- Audit Log: solo lectura para superadmin y escritura por service_role
drop policy if exists "audit_log_superadmin_read" on public.config_audit_log;
create policy "audit_log_superadmin_read" on public.config_audit_log
  for select to authenticated
  using (public.is_platform_admin());

revoke all on public.config_audit_log from anon, public;
grant all on public.config_audit_log to service_role;

-- 9. RPC FUNCTION: GET_EFFECTIVE_STORE_CONFIG
create or replace function public.get_effective_store_config(p_store_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store record;
  v_plan record;
  v_override record;
  v_is_override_active boolean := false;
  v_has_override boolean := false;
begin
  -- 1. Obtener tienda y plan
  select id, plan into v_store from public.stores where id = p_store_id;
  if not found then
    return null;
  end if;

  -- 2. Obtener plan (o fallback a 'free')
  select * into v_plan from public.plans where id = coalesce(v_store.plan, 'free');
  if not found then
    select * into v_plan from public.plans where id = 'free';
  end if;

  -- 3. Obtener override si existe
  select * into v_override from public.store_plan_overrides where store_id = p_store_id;
  if found then
    v_has_override := true;
    if v_override.override_until is null or v_override.override_until > now() then
      v_is_override_active := true;
    end if;
  end if;

  -- 4. Construir resultado con valores efectivos y metadata de origen
  return jsonb_build_object(
    'store_id', p_store_id,
    'plan_id', v_plan.id,
    'plan_name', v_plan.name,
    'commission_pct', case
      when v_is_override_active and v_override.commission_pct is not null then v_override.commission_pct
      else v_plan.commission_pct
    end,
    'commission_source', case
      when v_is_override_active and v_override.commission_pct is not null then 'override'
      else 'plan'
    end,
    'max_active_products', case
      when v_is_override_active and v_override.max_active_products is not null then v_override.max_active_products
      else v_plan.max_active_products
    end,
    'max_active_products_source', case
      when v_is_override_active and v_override.max_active_products is not null then 'override'
      else 'plan'
    end,
    'whatsapp_orders', case
      when v_is_override_active and v_override.whatsapp_orders is not null then v_override.whatsapp_orders
      else v_plan.whatsapp_orders
    end,
    'whatsapp_orders_source', case
      when v_is_override_active and v_override.whatsapp_orders is not null then 'override'
      else 'plan'
    end,
    'online_checkout', case
      when v_is_override_active and v_override.online_checkout is not null then v_override.online_checkout
      else v_plan.online_checkout
    end,
    'online_checkout_source', case
      when v_is_override_active and v_override.online_checkout is not null then 'override'
      else 'plan'
    end,
    'mercadopago', case
      when v_is_override_active and v_override.mercadopago is not null then v_override.mercadopago
      else v_plan.mercadopago
    end,
    'mercadopago_source', case
      when v_is_override_active and v_override.mercadopago is not null then 'override'
      else 'plan'
    end,
    'deposit_payments', case
      when v_is_override_active and v_override.deposit_payments is not null then v_override.deposit_payments
      else v_plan.deposit_payments
    end,
    'deposit_payments_source', case
      when v_is_override_active and v_override.deposit_payments is not null then 'override'
      else 'plan'
    end,
    'mp_surcharge', case
      when v_is_override_active and v_override.mp_surcharge is not null then v_override.mp_surcharge
      else v_plan.mp_surcharge
    end,
    'mp_surcharge_source', case
      when v_is_override_active and v_override.mp_surcharge is not null then 'override'
      else 'plan'
    end,
    'bank_transfer', case
      when v_is_override_active and v_override.bank_transfer is not null then v_override.bank_transfer
      else v_plan.bank_transfer
    end,
    'bank_transfer_source', case
      when v_is_override_active and v_override.bank_transfer is not null then 'override'
      else 'plan'
    end,
    'override_until', case when v_has_override then v_override.override_until else null end,
    'is_override_expired', case
      when v_has_override and v_override.override_until is not null and v_override.override_until <= now() then true
      else false
    end
  );
end;
$$;

revoke all on function public.get_effective_store_config(uuid) from public, anon;
grant execute on function public.get_effective_store_config(uuid) to authenticated, anon, service_role;
