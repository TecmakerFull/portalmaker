-- =============================================================================
-- Migración: Integración Mercado Pago Marketplace (Split de Pagos y OAuth)
-- Portalmaker — "El portal del Maker"
-- Ronda 4: SECURITY DEFINER hardening, public_token, legacy cleanup y triggers
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Campos de Mercado Pago y verificación en STORES (N2)
-- -----------------------------------------------------------------------------
alter table stores
  add column if not exists custom_domain_verified boolean default false,
  add column if not exists mp_connected boolean default false,
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
revoke all on store_mp_credentials from anon, authenticated, public;
grant all on store_mp_credentials to service_role;

-- N1: Migración inicial de credenciales existentes en stores hacia store_mp_credentials
-- Usar 'do nothing' para que una re-ejecución nunca pise tokens frescos con viejos
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'stores' and column_name = 'mp_access_token'
  ) then
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
    on conflict (store_id) do nothing;

    -- N2: Poner columnas legacy en null y luego eliminarlas de stores
    update stores set
      mp_access_token = null,
      mp_refresh_token = null,
      mp_public_key = null,
      mp_token_expires_at = null,
      mp_user_id = null;

    alter table stores
      drop column if exists mp_access_token,
      drop column if exists mp_refresh_token,
      drop column if exists mp_public_key,
      drop column if exists mp_token_expires_at,
      drop column if exists mp_user_id;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Tabla de auditoría de comisiones de plataforma (D3b, L2)
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
revoke all on store_commission_audit from anon, authenticated, public;
grant all on store_commission_audit to service_role;

-- L2: Trigger con search_path fijo y revocación de permisos públicos
create or replace function trg_audit_store_commission()
returns trigger
language plpgsql
security definer
set search_path = public
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

revoke all on function trg_audit_store_commission() from public, anon, authenticated;

drop trigger if exists trg_store_commission_audit on stores;
create trigger trg_store_commission_audit
  after update on stores
  for each row
  execute function trg_audit_store_commission();

-- -----------------------------------------------------------------------------
-- 4. Trigger SECURITY INVOKER para proteger columnas críticas de STORES (I1, I3, O1, N2)
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
    -- O1: Si cambia custom_domain, forzar custom_domain_verified := false
    if old.custom_domain is distinct from new.custom_domain then
      new.custom_domain_verified := false;
    end if;

    if old.custom_domain_verified is distinct from new.custom_domain_verified then
      raise exception 'No tienes permisos para modificar custom_domain_verified';
    end if;

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
    if old.mp_connected is distinct from new.mp_connected then
      raise exception 'El estado de conexión de Mercado Pago solo puede modificarse mediante el flujo seguro de backend';
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
-- 5. Vista pública STORES_PUBLIC, función store_is_active y hardening de RLS en STORES (G2, G3, J2, M1)
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

-- M1: Función auxiliar para verificar si una tienda está activa sin consultar la tabla stores directamente
create or replace function store_is_active(p_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from stores
    where id = p_store_id
      and suscripcion_activa is not false
  );
$$;

grant execute on function store_is_active(uuid) to anon, authenticated, service_role;

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
-- 6. Campos de Mercado Pago, snapshots, public_token y hardening en ORDERS (H1, H2, J2, O2, O3, P1)
-- -----------------------------------------------------------------------------
alter table orders
  add column if not exists public_token text not null default gen_random_uuid()::text,
  add column if not exists mp_preference_id text,
  add column if not exists mp_init_point text,
  add column if not exists mp_payment_id text,
  add column if not exists mp_merchant_order_id text,
  add column if not exists mp_fee_portalmaker numeric(10,2) default 0.00,
  add column if not exists mp_net_received numeric(10,2) default 0.00,
  add column if not exists comision_portalmaker_pct numeric(5,2) default 0.00,
  add column if not exists mp_recargo_pct numeric(5,2) default 0.00;

create unique index if not exists idx_orders_public_token on orders(public_token);

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

-- O3: Ajustar permisos de orders: anon no puede insertar, actualizar ni borrar. Authenticated solo select y update.
revoke insert, update, delete on orders from anon;
revoke insert, delete on orders from authenticated;
grant select, update on orders to authenticated;
grant all on orders to service_role;

-- Trigger BEFORE UPDATE en ORDERS para proteger snapshots, total, items, store_id, public_token y MP (H2, O2)
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

  -- O2: Inmutable para cualquier otro rol en todos los pedidos
  if old.store_id is distinct from new.store_id then
    raise exception 'No está permitido modificar la tienda (store_id) de un pedido';
  end if;

  if old.public_token is distinct from new.public_token then
    raise exception 'No está permitido modificar el public_token de un pedido';
  end if;

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

  -- O2: Si el pedido es o fue Mercado Pago, proteger costo_envio, metodo_pago y campos de liquidación
  if old.metodo_pago = 'mercadopago' or old.mp_payment_id is not null or old.mp_preference_id is not null then
    if old.costo_envio is distinct from new.costo_envio then
      raise exception 'No está permitido modificar el costo de envío de un pedido de Mercado Pago';
    end if;

    if old.metodo_pago is distinct from new.metodo_pago then
      raise exception 'No está permitido cambiar el método de pago de un pedido de Mercado Pago';
    end if;

    if old.mp_payment_id is distinct from new.mp_payment_id or
       old.mp_preference_id is distinct from new.mp_preference_id or
       old.mp_merchant_order_id is distinct from new.mp_merchant_order_id or
       old.mp_fee_portalmaker is distinct from new.mp_fee_portalmaker or
       old.mp_net_received is distinct from new.mp_net_received then
      raise exception 'Los campos de liquidación de Mercado Pago solo pueden ser modificados por el webhook oficial';
    end if;
  end if;

  -- Modificación de estado_pago:
  if old.estado_pago is distinct from new.estado_pago then
    if old.metodo_pago = 'mercadopago' or old.mp_payment_id is not null or old.mp_preference_id is not null then
      raise exception 'Los pedidos con Mercado Pago no pueden cambiar su estado de pago manualmente. El estado se actualiza por webhook.';
    end if;
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
-- 7. Tabla segura para estados OAuth con expires_at de 10 min e índice (D1, E1, E2, O4)
-- -----------------------------------------------------------------------------
create table if not exists mp_oauth_states (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  state text not null unique,
  user_id text,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz default now()
);

alter table mp_oauth_states
  add column if not exists user_id text,
  add column if not exists expires_at timestamptz not null default (now() + interval '10 minutes');

-- Asegurar valor default e índice para limpieza de vencidos (O4)
update mp_oauth_states set expires_at = created_at + interval '10 minutes' where expires_at is null;
alter table mp_oauth_states alter column expires_at set not null;
create index if not exists idx_mp_oauth_states_expires_at on mp_oauth_states(expires_at);

alter table mp_oauth_states enable row level security;
revoke all on mp_oauth_states from anon, authenticated, public;
grant all on mp_oauth_states to service_role;

-- -----------------------------------------------------------------------------
-- 8. Función RPC atómica para procesar pagos aprobados (L1, L2, L3)
-- -----------------------------------------------------------------------------
create or replace function process_approved_payment(
  p_order_id uuid,
  p_payment_id text,
  p_net_received numeric,
  p_fee numeric,
  p_amount numeric default null,
  p_currency text default 'ARS'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_item jsonb;
  v_qty int;
  v_variant_id uuid;
  v_product_id uuid;
begin
  -- 1. Consultar el pedido actual
  select id, store_id, total, items, stock_descontado, estado_pago
  into v_order
  from orders
  where id = p_order_id;

  if v_order.id is null then
    return jsonb_build_object('success', false, 'error', 'order_not_found');
  end if;

  -- 2. Si ya estaba aprobado, responder idempotentemente
  if v_order.estado_pago = 'aprobado' then
    return jsonb_build_object(
      'success', true,
      'already_processed', true,
      'first_time', false,
      'status', 'aprobado'
    );
  end if;

  -- 3. L3: Validar que la moneda sea ARS y el monto pagado no sea menor a (total - 1)
  if (p_currency is not null and upper(trim(p_currency)) <> 'ARS') or
     (p_amount is not null and p_amount < (v_order.total - 1.00)) then
    -- Dejar pedido en 'revision', NO descontar stock
    update orders
    set
      estado_pago = 'revision',
      mp_payment_id = coalesce(p_payment_id, mp_payment_id),
      observaciones_admin = concat(
        coalesce(observaciones_admin || E'\n', ''),
        'Revisión requerida (RPC): Moneda recibida: ', coalesce(p_currency, 'null'),
        ', Monto recibido: $', coalesce(p_amount::text, 'null'),
        ' vs Total esperado: $', v_order.total::text
      ),
      updated_at = now()
    where id = p_order_id and estado_pago is distinct from 'aprobado';

    return jsonb_build_object(
      'success', true,
      'status', 'revision',
      'first_time', true,
      'already_processed', false,
      'order_id', v_order.id,
      'store_id', v_order.store_id
    );
  end if;

  -- 4. Actualizar pedido a 'aprobado' si estado_pago is distinct from 'aprobado'
  update orders
  set
    estado_pago = 'aprobado',
    mp_payment_id = p_payment_id,
    mp_net_received = p_net_received,
    mp_fee_portalmaker = p_fee,
    updated_at = now()
  where id = p_order_id and estado_pago is distinct from 'aprobado';

  -- 5. Descontar stock atómicamente si aún no estaba descontado
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
    'status', 'aprobado',
    'order_id', v_order.id,
    'store_id', v_order.store_id
  );
end;
$$;

-- L1: Revocar de public, anon, authenticated y grant solo a service_role
revoke all on function process_approved_payment(uuid, text, numeric, numeric) from public, anon, authenticated;
revoke all on function process_approved_payment(uuid, text, numeric, numeric, numeric, text) from public, anon, authenticated;
grant execute on function process_approved_payment(uuid, text, numeric, numeric, numeric, text) to service_role;
