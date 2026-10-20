-- =============================================================================
-- Migración: Hardening de Mercado Pago Marketplace, Tokens y Permisos (Ronda 5)
-- Portalmaker — "El portal del Maker"
-- S1: Migración complementaria 100% idempotente (ejecutable múltiples veces)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- S3: Verificar y asegurar columnas críticas en ORDERS (metodo_pago, observaciones_admin, public_token)
-- -----------------------------------------------------------------------------
alter table orders
  add column if not exists metodo_pago text default 'efectivo',
  add column if not exists observaciones_admin text,
  add column if not exists public_token text default gen_random_uuid()::text;

-- Asegurar que filas existentes no queden con public_token nulo antes de marcar NOT NULL
update orders set public_token = gen_random_uuid()::text where public_token is null;

alter table orders
  alter column public_token set default gen_random_uuid()::text,
  alter column public_token set not null;

create unique index if not exists idx_orders_public_token on orders(public_token);

-- -----------------------------------------------------------------------------
-- S2: Copia segura de credenciales y eliminación de columnas legacy en STORES
-- Se valida antes del drop que no existan tiendas mp_connected = true sin credenciales
-- -----------------------------------------------------------------------------
do $$
declare
  v_missing_creds_count int;
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'stores' and column_name = 'mp_access_token'
  ) then
    -- Copiar credenciales existentes a store_mp_credentials sin pisar existentes
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

    -- Validar que no queden tiendas con mp_connected sin credenciales o con token nulo antes de eliminar columnas
    select count(*) into v_missing_creds_count
    from stores s
    left join store_mp_credentials c on c.store_id = s.id
    where s.mp_connected = true and (c.store_id is null or c.mp_access_token is null or trim(c.mp_access_token) = '');

    if v_missing_creds_count > 0 then
      raise exception 'Abortando migración: existen % tiendas con mp_connected = true sin credencial válida (mp_access_token no nulo) en store_mp_credentials', v_missing_creds_count;
    end if;

    -- Blanquear columnas legacy y eliminarlas de stores
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
-- L2: Hardening de is_platform_admin() (search_path fijo y lower(email))
-- -----------------------------------------------------------------------------
create or replace function is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from platform_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- -----------------------------------------------------------------------------
-- L2: Hardening de trg_audit_store_commission() (search_path fijo y revocación)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- O1, N2: Trigger protect_store_sensitive_columns con forzado de custom_domain_verified
-- -----------------------------------------------------------------------------
create or replace function protect_store_sensitive_columns()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_is_superadmin boolean;
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') or
     (auth.jwt() ->> 'role') = 'service_role' or
     auth.role() = 'service_role' then
    return new;
  end if;

  v_is_superadmin := is_platform_admin();

  if not v_is_superadmin then
    -- O1: Si cambia custom_domain, forzar invalidación de verificación
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

-- -----------------------------------------------------------------------------
-- O2: Trigger protect_order_sensitive_columns con protección de store_id, public_token, envio y metodo
-- -----------------------------------------------------------------------------
create or replace function protect_order_sensitive_columns()
returns trigger
language plpgsql
security invoker
as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') or
     (auth.jwt() ->> 'role') = 'service_role' or
     auth.role() = 'service_role' then
    return new;
  end if;

  if is_platform_admin() then
    return new;
  end if;

  -- O2: Inmutable para cualquier rol regular en todos los pedidos
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

  -- O2: Proteger costo_envio y metodo_pago para pedidos con Mercado Pago
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

-- -----------------------------------------------------------------------------
-- O3: Revocar DELETE en ORDERS para usuarios anon y authenticated
-- -----------------------------------------------------------------------------
revoke delete on orders from anon, authenticated;

-- -----------------------------------------------------------------------------
-- O4: Configuración segura de mp_oauth_states con expires_at e índice
-- -----------------------------------------------------------------------------
alter table mp_oauth_states
  alter column expires_at set default (now() + interval '10 minutes');

update mp_oauth_states set expires_at = created_at + interval '10 minutes' where expires_at is null;
alter table mp_oauth_states alter column expires_at set not null;

create index if not exists idx_mp_oauth_states_expires_at on mp_oauth_states(expires_at);

-- -----------------------------------------------------------------------------
-- M1: Función auxiliar store_is_active(uuid)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- S4, L1, L3: Eliminar sobrecarga vieja de process_approved_payment y definir la nueva con 6 argumentos
-- -----------------------------------------------------------------------------
drop function if exists process_approved_payment(uuid, text, numeric, numeric);

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
  v_current_stock int;
  v_variant_id uuid;
  v_product_id uuid;
  v_stock_warning boolean := false;
  v_warning_notes text := '';
begin
  -- 1. Consultar el pedido actual
  select id, store_id, total, items, stock_descontado, estado_pago, observaciones_admin
  into v_order
  from orders
  where id = p_order_id;

  if v_order.id is null then
    return jsonb_build_object('success', false, 'error', 'order_not_found', 'status', 'error');
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

  -- AA3: No permitir aprobar pedidos que hayan sido reembolsados o tengan contracargo
  if v_order.estado_pago in ('reembolsado', 'contracargo') then
    return jsonb_build_object(
      'success', false,
      'error', 'cannot_approve_refunded_or_chargeback_order',
      'status', v_order.estado_pago,
      'first_time', false
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

  -- 4. Actualizar pedido a 'aprobado' solo si no estaba aprobado ni en reembolso/contracargo
  update orders
  set
    estado_pago = 'aprobado',
    mp_payment_id = p_payment_id,
    mp_net_received = p_net_received,
    mp_fee_portalmaker = p_fee,
    updated_at = now()
  where id = p_order_id
    and estado_pago is distinct from 'aprobado'
    and estado_pago not in ('reembolsado', 'contracargo');

  -- 5. AA2: Descontar stock atómicamente; si es insuficiente, descontar igual y reportar stock_warning
  if not coalesce(v_order.stock_descontado, false) then
    if v_order.items is not null and jsonb_typeof(v_order.items) = 'array' then
      for v_item in select * from jsonb_array_elements(v_order.items)
      loop
        v_qty := coalesce((v_item->>'cantidad')::int, 0);
        if v_qty > 0 then
          -- Variante de producto
          if (v_item->>'variant_id') is not null and (v_item->>'variant_id') <> '' and (v_item->>'variant_id') <> 'null' then
            v_variant_id := (v_item->>'variant_id')::uuid;

            select stock into v_current_stock
            from product_variants
            where id = v_variant_id and stock is not null;

            if v_current_stock is not null then
              if v_current_stock < v_qty then
                v_stock_warning := true;
                v_warning_notes := concat(
                  v_warning_notes,
                  E'\nAlerta de sobreventa (variante ' || coalesce(v_item->>'variante', v_variant_id::text) || '): stock disponible ' || v_current_stock || ' menor a cantidad ' || v_qty
                );
              end if;
              -- Descontar igual (refleja faltante real)
              update product_variants
              set stock = stock - v_qty
              where id = v_variant_id;
            end if;

          -- Producto simple
          elsif (v_item->>'product_id') is not null and (v_item->>'product_id') <> '' and (v_item->>'product_id') <> 'null' then
            v_product_id := (v_item->>'product_id')::uuid;

            select stock into v_current_stock
            from products
            where id = v_product_id and gestiona_stock = true and stock is not null;

            if v_current_stock is not null then
              if v_current_stock < v_qty then
                v_stock_warning := true;
                v_warning_notes := concat(
                  v_warning_notes,
                  E'\nAlerta de sobreventa (producto ' || coalesce(v_item->>'nombre', v_product_id::text) || '): stock disponible ' || v_current_stock || ' menor a cantidad ' || v_qty
                );
              end if;
              -- Descontar igual
              update products
              set stock = stock - v_qty
              where id = v_product_id and gestiona_stock = true;
            end if;
          end if;
        end if;
      end loop;
    end if;

    -- Registrar observaciones de stock si hubo sobreventa
    if v_stock_warning then
      update orders
      set stock_descontado = true,
          observaciones_admin = concat(coalesce(observaciones_admin, ''), v_warning_notes)
      where id = p_order_id;
    else
      update orders set stock_descontado = true where id = p_order_id;
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'first_time', true,
    'already_processed', false,
    'status', 'aprobado',
    'stock_warning', v_stock_warning,
    'order_id', v_order.id,
    'store_id', v_order.store_id
  );
end;
$$;

revoke all on function process_approved_payment(uuid, text, numeric, numeric, numeric, text) from public, anon, authenticated;
grant execute on function process_approved_payment(uuid, text, numeric, numeric, numeric, text) to service_role;
