-- =============================================================================
-- Migración: Integración Mercado Pago Marketplace (Split de Pagos y OAuth)
-- Portalmaker — "El portal del Maker"
-- =============================================================================

-- 1. Campos de Mercado Pago y verificación en STORES
alter table stores
  add column if not exists custom_domain_verified boolean default false,
  add column if not exists mp_connected boolean default false,
  add column if not exists mp_user_id text,
  add column if not exists mp_access_token text,
  add column if not exists mp_refresh_token text,
  add column if not exists mp_public_key text,
  add column if not exists mp_token_expires_at timestamptz,
  add column if not exists mp_recargo_porcentaje numeric(5,2) default 0.00,
  add column if not exists comision_portalmaker numeric(5,2) default 0.00;

-- 2. Tabla segura de credenciales de Mercado Pago (aislada de anon/authenticated)
create table if not exists store_mp_credentials (
  store_id uuid primary key references stores(id) on delete cascade,
  mp_access_token text not null,
  mp_refresh_token text,
  mp_public_key text,
  mp_token_expires_at timestamptz,
  mp_user_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS estricta: solo accesible por service_role (backend seguro)
alter table store_mp_credentials enable row level security;
revoke all on store_mp_credentials from anon, authenticated;
grant all on store_mp_credentials to service_role;

-- Migración inicial de credenciales existentes en stores hacia store_mp_credentials
insert into store_mp_credentials (
  store_id,
  mp_access_token,
  mp_refresh_token,
  mp_public_key,
  mp_token_expires_at,
  mp_user_id
)
select
  id,
  mp_access_token,
  mp_refresh_token,
  mp_public_key,
  mp_token_expires_at,
  mp_user_id
from stores
where mp_access_token is not null
on conflict (store_id) do update
set
  mp_access_token = excluded.mp_access_token,
  mp_refresh_token = excluded.mp_refresh_token,
  mp_public_key = excluded.mp_public_key,
  mp_token_expires_at = excluded.mp_token_expires_at,
  mp_user_id = excluded.mp_user_id,
  updated_at = now();

-- 3. Campos de Mercado Pago en ORDERS
alter table orders
  add column if not exists mp_preference_id text,
  add column if not exists mp_init_point text,
  add column if not exists mp_payment_id text,
  add column if not exists mp_merchant_order_id text,
  add column if not exists mp_fee_portalmaker numeric(10,2) default 0.00,
  add column if not exists mp_net_received numeric(10,2) default 0.00;

-- 4. Ampliar estados de pago permitidos en ORDERS (soporte para revision, reembolsado, contracargo)
alter table orders drop constraint if exists orders_estado_pago_check;
alter table orders add constraint orders_estado_pago_check
  check (estado_pago in ('pendiente', 'aprobado', 'rechazado', 'revision', 'reembolsado', 'contracargo'));

-- 5. Tabla para resguardar estados de autenticación OAuth (anti-CSRF)
create table if not exists mp_oauth_states (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  state text not null unique,
  created_at timestamptz default now()
);

alter table mp_oauth_states enable row level security;
drop policy if exists "mp_oauth_states_policy" on mp_oauth_states;
create policy "mp_oauth_states_policy" on mp_oauth_states for all using (true) with check (true);
grant select, insert, delete on mp_oauth_states to anon, authenticated, service_role;

-- 6. Función RPC atómica para procesar pagos aprobados y descontar stock (idempotente)
create or replace function process_approved_payment(
  p_order_id uuid,
  p_payment_id text,
  p_net_received numeric,
  p_fee numeric
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_order record;
  v_item jsonb;
  v_qty int;
  v_variant_id uuid;
  v_product_id uuid;
begin
  -- 1. Intentar actualizar el pedido atómicamente solo si NO estaba aprobado
  update orders
  set
    estado_pago = 'aprobado',
    mp_payment_id = p_payment_id,
    mp_net_received = p_net_received,
    mp_fee_portalmaker = p_fee,
    updated_at = now()
  where id = p_order_id and estado_pago <> 'aprobado'
  returning id, store_id, total, items, stock_descontado into v_order;

  -- 2. Si no devolvió fila, significa que ya estaba aprobado (idempotencia)
  if v_order.id is null then
    return jsonb_build_object('success', true, 'already_processed', true, 'first_time', false);
  end if;

  -- 3. Descontar stock atómicamente si aún no estaba descontado
  if not coalesce(v_order.stock_descontado, false) then
    if v_order.items is not null and jsonb_typeof(v_order.items) = 'array' then
      for v_item in select * from jsonb_array_elements(v_order.items)
      loop
        v_qty := coalesce((v_item->>'cantidad')::int, 0);
        if v_qty > 0 then
          -- Descontar de variante si aplica
          if (v_item->>'variant_id') is not null and (v_item->>'variant_id') <> '' and (v_item->>'variant_id') <> 'null' then
            v_variant_id := (v_item->>'variant_id')::uuid;
            update product_variants
            set stock = greatest(stock - v_qty, 0)
            where id = v_variant_id and stock is not null;
          -- Descontar de producto simple si gestiona_stock = true
          elsif (v_item->>'product_id') is not null and (v_item->>'product_id') <> '' and (v_item->>'product_id') <> 'null' then
            v_product_id := (v_item->>'product_id')::uuid;
            update products
            set stock = greatest(stock - v_qty, 0)
            where id = v_product_id and gestiona_stock = true and stock is not null;
          end if;
        end if;
      end loop;
    end if;

    update orders set stock_descontado = true where id = p_order_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'first_time', true,
    'already_processed', false,
    'order_id', v_order.id,
    'store_id', v_order.store_id
  );
end;
$$;

grant execute on function process_approved_payment to service_role;
