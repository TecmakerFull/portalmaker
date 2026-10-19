-- =============================================================================
-- Migración: Integración Mercado Pago Marketplace (Split de Pagos y OAuth)
-- Portalmaker — "El portal del Maker"
-- Ronda 3: Seguridad de Stores, Pedidos en Servidor, Triggers Invoker y RLS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Campos de Mercado Pago y verificación en STORES
-- -----------------------------------------------------------------------------
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

-- Restricciones de rango en porcentajes (I2: mp_recargo_porcentaje entre 0 y 15%)
alter table stores drop constraint if exists stores_comision_portalmaker_check;
alter table stores add constraint stores_comision_portalmaker_check
  check (comision_portalmaker >= 0.00 and comision_portalmaker < 100.00);

alter table stores drop constraint if exists stores_mp_recargo_porcentaje_check;
alter table stores add constraint stores_mp_recargo_porcentaje_check
  check (mp_recargo_porcentaje >= 0.00 and mp_recargo_porcentaje <= 15.00);

-- -----------------------------------------------------------------------------
-- 2. Tabla segura de credenciales de Mercado Pago (aislada de anon/authenticated)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 3. Tabla de auditoría de comisiones de plataforma (D3b)
-- -----------------------------------------------------------------------------
create table if not exists store_commission_audit (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  changed_by text,
  old_value numeric(5,2),
  new_value numeric(5,2),
  changed_at timestamptz default now()
);

alter table store_commission_audit enable row level security;
revoke all on store_commission_audit from anon, authenticated;
grant all on store_commission_audit to service_role;

-- Trigger para registrar cambios de comisión en auditoría
create or replace function trg_audit_store_commission()
returns trigger
language plpgsql
security definer
as $$
begin
  if old.comision_portalmaker is distinct from new.comision_portalmaker then
    insert into store_commission_audit (
      store_id,
      changed_by,
      old_value,
      new_value,
      changed_at
    )
    values (
      new.id,
      coalesce(auth.jwt() ->> 'email', 'service_role'),
      old.comision_portalmaker,
      new.comision_portalmaker,
      now()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_store_commission_audit on stores;
create trigger trg_store_commission_audit
  after update on stores
  for each row
  execute function trg_audit_store_commission();

-- -----------------------------------------------------------------------------
-- 4. Trigger SECURITY INVOKER para proteger columnas críticas de STORES (I1, I3)
-- -----------------------------------------------------------------------------
create or replace function protect_store_sensitive_columns()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_is_superadmin boolean;
begin
  -- Si la sesión es service_role, postgres o supabase_admin (backend seguro / migraciones), permitir
  if current_user in ('service_role', 'postgres', 'supabase_admin') or
     (auth.jwt() ->> 'role') = 'service_role' or
     auth.role() = 'service_role' then
    return new;
  end if;

  -- Comprobar si el usuario autenticado es superadmin (is_platform_admin())
  v_is_superadmin := is_platform_admin();

  -- Columnas reservadas exclusivamente para superadmin o service_role
  if not v_is_superadmin then
    if old.comision_portalmaker is distinct from new.comision_portalmaker then
      raise exception 'No tienes permisos para modificar comision_portalmaker';
    end if;
    if old.plan is distinct from new.plan then
      raise exception 'No tienes permisos para modificar el plan de la tienda';
    end if;
    if old.precio_mensual is distinct from new.precio_mensual then
      raise exception 'No tienes permisos para modificar precio_mensual';
    end if;
    if old.limite_productos is distinct from new.limite_productos then
      raise exception 'No tienes permisos para modificar limite_productos';
    end if;
    if old.suscripcion_activa is distinct from new.suscripcion_activa then
      raise exception 'No tienes permisos para modificar suscripcion_activa';
    end if;
    if old.custom_domain_verified is distinct from new.custom_domain_verified then
      raise exception 'No tienes permisos para modificar custom_domain_verified';
    end if;
    if old.mp_access_token is distinct from new.mp_access_token or
       old.mp_refresh_token is distinct from new.mp_refresh_token or
       old.mp_public_key is distinct from new.mp_public_key or
       old.mp_user_id is distinct from new.mp_user_id or
       old.mp_token_expires_at is distinct from new.mp_token_expires_at or
       old.mp_connected is distinct from new.mp_connected then
      raise exception 'Las credenciales y estado de conexión de Mercado Pago solo pueden modificarse mediante el flujo seguro de backend';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_store_columns on stores;
create trigger trg_protect_store_columns
  before update on stores
  for each row
  execute function protect_store_sensitive_columns();

-- -----------------------------------------------------------------------------
-- 5. Vista pública STORES_PUBLIC y hardening de RLS en STORES (G2, G3, J2)
-- -----------------------------------------------------------------------------
create or replace view public.stores_public as
select
  id,
  nombre,
  slug,
  custom_domain,
  custom_domain_verified,
  modo_operacion,
  checkout_activo,
  whatsapp_numero,
  plan,
  suscripcion_activa,
  logo_url,
  icono_url,
  favicon_url,
  hero_banner_url,
  banners_activo,
  slogan,
  logo_tamano,
  mostrar_nombre_header,
  color_primario,
  color_secundario,
  color_fondo,
  color_texto,
  color_primario_dark,
  color_secundario_dark,
  color_fondo_dark,
  color_texto_dark,
  tema_por_defecto,
  font_heading,
  font_body,
  instagram_url,
  facebook_url,
  tiktok_url,
  email_contacto,
  horario_atencion,
  direccion,
  meta_title,
  meta_description,
  ga_measurement_id,
  meta_pixel_id,
  google_maps_embed_url,
  transferencia_activa,
  mp_connected,
  mp_recargo_porcentaje,
  created_at,
  updated_at
from public.stores;

grant select on public.stores_public to anon, authenticated, service_role;

-- Restringir lectura de stores: anon NO puede leer stores directamente (G3)
drop policy if exists "public_read_stores" on stores;
drop policy if exists "owner_admin_read_stores" on stores;
create policy "owner_admin_read_stores" on stores for select
  using (
    is_platform_admin()
    or lower(admin_email) = lower(coalesce(auth.jwt()->>'email', ''))
    or current_user in ('service_role', 'postgres', 'supabase_admin')
    or (auth.jwt() ->> 'role') = 'service_role'
  );

-- Actualizar política de escritura en stores con lower() case-insensitive (J2)
drop policy if exists "admin_write_stores" on stores;
create policy "admin_write_stores" on stores for update
  using (
    is_platform_admin()
    or lower(admin_email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

-- -----------------------------------------------------------------------------
-- 6. Campos de Mercado Pago, snapshots y hardening en ORDERS (H1, H2, J2)
-- -----------------------------------------------------------------------------
alter table orders
  add column if not exists mp_preference_id text,
  add column if not exists mp_init_point text,
  add column if not exists mp_payment_id text,
  add column if not exists mp_merchant_order_id text,
  add column if not exists mp_fee_portalmaker numeric(10,2) default 0.00,
  add column if not exists mp_net_received numeric(10,2) default 0.00,
  add column if not exists comision_portalmaker_pct numeric(5,2) default 0.00,
  add column if not exists mp_recargo_pct numeric(5,2) default 0.00;

-- Ampliar estados de pago permitidos en ORDERS
alter table orders drop constraint if exists orders_estado_pago_check;
alter table orders add constraint orders_estado_pago_check
  check (estado_pago in ('pendiente', 'aprobado', 'rechazado', 'revision', 'reembolsado', 'contracargo'));

-- Eliminar insert público de orders (H1)
drop policy if exists "public_insert_orders" on orders;

-- Actualizar política de administración de pedidos con lower() case-insensitive (J2)
drop policy if exists "admin_all_orders" on orders;
create policy "admin_all_orders" on orders for all
  using (
    is_platform_admin()
    or lower(coalesce(auth.jwt() ->> 'email', '')) = lower((select admin_email from stores where id = orders.store_id))
  );

-- Ajustar permisos de orders: anon no puede insertar ni actualizar directamente
revoke insert, update on orders from anon;
revoke insert on orders from authenticated;
grant select, update on orders to authenticated;
grant all on orders to service_role;

-- Trigger BEFORE UPDATE en ORDERS para proteger snapshots, total, items y MP (H2)
create or replace function protect_order_sensitive_columns()
returns trigger
language plpgsql
security invoker
as $$
begin
  -- Dejar pasar a service_role, postgres y supabase_admin
  if current_user in ('service_role', 'postgres', 'supabase_admin') or
     (auth.jwt() ->> 'role') = 'service_role' or
     auth.role() = 'service_role' then
    return new;
  end if;

  -- Dejar pasar a platform_admin
  if is_platform_admin() then
    return new;
  end if;

  -- Para cualquier otro rol (dueño de tienda / usuario regular):
  if old.total is distinct from new.total then
    raise exception 'No está permitido modificar el total de un pedido existente';
  end if;

  if old.items is distinct from new.items then
    raise exception 'No está permitido modificar los productos o variantes de un pedido existente';
  end if;

  if old.comision_portalmaker_pct is distinct from new.comision_portalmaker_pct then
    raise exception 'No está permitido modificar el snapshot de comision_portalmaker_pct';
  end if;

  if old.mp_recargo_pct is distinct from new.mp_recargo_pct then
    raise exception 'No está permitido modificar el snapshot de mp_recargo_pct';
  end if;

  if old.mp_payment_id is distinct from new.mp_payment_id or
     old.mp_preference_id is distinct from new.mp_preference_id or
     old.mp_merchant_order_id is distinct from new.mp_merchant_order_id or
     old.mp_fee_portalmaker is distinct from new.mp_fee_portalmaker or
     old.mp_net_received is distinct from new.mp_net_received then
    raise exception 'Los campos de liquidación de Mercado Pago solo pueden ser modificados por el webhook oficial';
  end if;

  -- Modificación de estado_pago:
  if old.estado_pago is distinct from new.estado_pago then
    -- Si el pedido es de Mercado Pago, el dueño no puede alterarlo a mano
    if old.metodo_pago = 'mercadopago' or old.mp_payment_id is not null or old.mp_preference_id is not null then
      raise exception 'Los pedidos con Mercado Pago no pueden cambiar su estado de pago manualmente. El estado se actualiza por webhook.';
    end if;
    -- Si es transferencia bancaria o efectivo, se permite cambiar el estado de pago
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_order_columns on orders;
create trigger trg_protect_order_columns
  before update on orders
  for each row
  execute function protect_order_sensitive_columns();

-- -----------------------------------------------------------------------------
-- 7. Tabla segura para estados OAuth (D1, E1, E2)
-- -----------------------------------------------------------------------------
create table if not exists mp_oauth_states (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  state text not null unique,
  user_id text,
  expires_at timestamptz,
  created_at timestamptz default now()
);

alter table mp_oauth_states
  add column if not exists user_id text,
  add column if not exists expires_at timestamptz;

alter table mp_oauth_states enable row level security;
drop policy if exists "mp_oauth_states_policy" on mp_oauth_states;

-- Sin policies abiertas: solo service_role
revoke all on mp_oauth_states from anon, authenticated;
grant all on mp_oauth_states to service_role;

-- -----------------------------------------------------------------------------
-- 8. Función RPC atómica para procesar pagos aprobados y descontar stock (idempotente)
-- -----------------------------------------------------------------------------
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
