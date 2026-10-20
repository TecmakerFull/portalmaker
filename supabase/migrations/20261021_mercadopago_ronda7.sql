-- =============================================================================
-- PORTALMAKER — Migración Ronda 7: Mercado Pago Hardening, Concurrencia y Control
-- Fecha: 2026-10-21
-- Idempotente y no destructiva
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Campo mp_preference_created_at en ORDERS
-- -----------------------------------------------------------------------------
alter table orders
  add column if not exists mp_preference_created_at timestamptz;

-- -----------------------------------------------------------------------------
-- 2. Tabla para Eventos de Webhook (Auditoría e Inmutabilidad)
-- -----------------------------------------------------------------------------
create table if not exists mp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  payment_id text,
  order_id uuid references orders(id) on delete set null,
  store_id uuid references stores(id) on delete set null,
  type text not null,
  status text,
  received_at timestamptz default now(),
  processed_at timestamptz,
  result jsonb,
  error text
);

create index if not exists idx_mp_webhook_events_payment on mp_webhook_events(payment_id);
create index if not exists idx_mp_webhook_events_order on mp_webhook_events(order_id);

alter table mp_webhook_events enable row level security;
revoke all on mp_webhook_events from public, anon, authenticated;
grant all on mp_webhook_events to service_role;

-- -----------------------------------------------------------------------------
-- 3. Tabla STORE_ADMIN_NOTES (Notas exclusivas de Superadmin, inaccesibles al Maker)
-- -----------------------------------------------------------------------------
create table if not exists store_admin_notes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  notas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uq_store_admin_notes_store unique (store_id)
);

alter table store_admin_notes enable row level security;
revoke all on store_admin_notes from public, anon, authenticated;
grant all on store_admin_notes to service_role;

-- El superadmin usa el cliente del navegador (JWT authenticated): necesita grant de tabla
-- y una policy basada en is_platform_admin(). Sin policy para el resto, el dueño no ve nada.
grant select, insert, update on store_admin_notes to authenticated;
drop policy if exists "superadmin_all_store_admin_notes" on store_admin_notes;
create policy "superadmin_all_store_admin_notes" on store_admin_notes for all
  using (is_platform_admin())
  with check (is_platform_admin());

-- Migración idempotente de notas existentes desde stores hacia store_admin_notes.
-- Solo se vacía stores.notas_admin en las filas cuya nota YA quedó copiada y es idéntica,
-- para que el dueño (que puede leer su fila de stores) deje de ver las notas internas.
-- No se pierde información: el contenido queda en store_admin_notes.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stores' and column_name = 'notas_admin'
  ) then
    insert into store_admin_notes (store_id, notas)
    select id, notas_admin from stores
    where notas_admin is not null and trim(notas_admin) <> ''
    on conflict (store_id) do nothing;

    update stores s
    set notas_admin = null
    from store_admin_notes n
    where n.store_id = s.id
      and s.notas_admin is not null
      and n.notas = s.notas_admin;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 4. CHECK de formato de slug y nombres reservados en STORES
-- Formato: ^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$
-- Reservados: www, api, admin, app, auth, tienda, dashboard, portal
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stores_slug_format_check'
  ) then
    alter table stores add constraint stores_slug_format_check
      check (
        slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
        and lower(slug) not in ('www', 'api', 'admin', 'app', 'auth', 'tienda', 'dashboard', 'portal')
      ) not valid;
    alter table stores validate constraint stores_slug_format_check;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 5. Trigger en STORES: Corrección de bug de orden y columnas protegidas (Item 2)
-- -----------------------------------------------------------------------------
create or replace function protect_store_sensitive_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_is_superadmin boolean := false;
  v_cliente_cambio_verified boolean := false;
begin
  -- Dejar pasar a service_role, postgres y supabase_admin
  if current_user in ('service_role', 'postgres', 'supabase_admin') or
     (auth.jwt() ->> 'role') = 'service_role' or
     auth.role() = 'service_role' then
    return new;
  end if;

  v_is_superadmin := is_platform_admin();

  -- (a) Calcular ANTES de alterar ningún campo si el cliente intentó cambiar custom_domain_verified
  v_cliente_cambio_verified := (old.custom_domain_verified is distinct from new.custom_domain_verified);

  -- (b) Si no es superadmin y pretendió cambiar custom_domain_verified -> Rechazar
  if not v_is_superadmin and v_cliente_cambio_verified then
    raise exception 'No tienes permisos para modificar custom_domain_verified';
  end if;

  -- (c) Si cambió custom_domain y custom_domain_verified no fue enviado deliberadamente como true por superadmin,
  -- forzar verificación a false (el nuevo dominio debe ser verificado)
  if old.custom_domain is distinct from new.custom_domain then
    if not (v_is_superadmin and new.custom_domain_verified = true) then
      new.custom_domain_verified := false;
    end if;
  end if;

  -- Para cualquier rol que NO sea superadmin:
  if not v_is_superadmin then
    if old.comision_portalmaker is distinct from new.comision_portalmaker then
      raise exception 'No tienes permisos para modificar comision_portalmaker';
    end if;
    if old.suscripcion_activa is distinct from new.suscripcion_activa then
      raise exception 'No tienes permisos para modificar suscripcion_activa';
    end if;
    if old.slug is distinct from new.slug then
      raise exception 'El subdominio (slug) solo puede ser modificado mediante el flujo administrativo verificado';
    end if;
    if old.admin_email is distinct from new.admin_email then
      raise exception 'El email del administrador solo puede ser modificado mediante el flujo de verificación de identidad';
    end if;
    if old.estado_pago is distinct from new.estado_pago then
      raise exception 'No tienes permisos para modificar el estado_pago de la suscripción';
    end if;
    if old.fecha_proximo_vencimiento is distinct from new.fecha_proximo_vencimiento then
      raise exception 'No tienes permisos para modificar la fecha_proximo_vencimiento';
    end if;
    if old.dias_gracia is distinct from new.dias_gracia then
      raise exception 'No tienes permisos para modificar los dias_gracia';
    end if;
    if old.notas_admin is distinct from new.notas_admin then
      raise exception 'Las notas de administración son exclusivas del equipo del portal';
    end if;
    if old.mp_connected is distinct from new.mp_connected then
      raise exception 'El estado de conexión de Mercado Pago solo puede modificarse mediante el flujo seguro de OAuth';
    end if;
    if new.mp_recargo_porcentaje is not null and (new.mp_recargo_porcentaje < 0 or new.mp_recargo_porcentaje > 15) then
      raise exception 'El recargo por Mercado Pago debe estar entre 0%% y 15%%';
    end if;
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. RPC process_approved_payment con SELECT FOR UPDATE, detección atómica y stock_warning
-- -----------------------------------------------------------------------------
-- La versión de la ronda 5 tenía DEFAULT en p_amount/p_currency. Postgres no permite
-- quitar defaults con CREATE OR REPLACE (error 42P13), por eso se elimina la firma exacta
-- y se recrea en la misma transacción junto con sus grants. No toca datos.
drop function if exists process_approved_payment(uuid, text, numeric, numeric, numeric, text);

create or replace function process_approved_payment(
  p_order_id uuid,
  p_payment_id text,
  p_amount numeric,
  p_fee numeric,
  p_net_received numeric,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_item record;
  v_prod_id uuid;
  v_var_id uuid;
  v_qty int;
  v_current_stock int;
  v_missing int;
  v_stock_warning boolean := false;
  v_observaciones text := '';
  v_rows_updated int := 0;
begin
  -- Validación de parámetros obligatorios sin default
  if p_amount is null or p_currency is null or trim(p_currency) = '' then
    return jsonb_build_object(
      'status', 'revision',
      'reason', 'missing_amount_or_currency',
      'first_time', false,
      'stock_warning', false
    );
  end if;

  -- 1. Bloqueo de fila exclusivo (SELECT FOR UPDATE) para prevenir condiciones de carrera
  select * into v_order
  from orders
  where id = p_order_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found', 'first_time', false, 'stock_warning', false);
  end if;

  -- 2. Si ya está aprobado, retornar already_processed de inmediato sin tocar stock ni emails
  if v_order.estado_pago = 'aprobado' then
    return jsonb_build_object(
      'status', 'aprobado',
      'already_processed', true,
      'first_time', false,
      'stock_warning', false
    );
  end if;

  -- 3. No aprobar desde reembolsado ni contracargo
  if v_order.estado_pago in ('reembolsado', 'contracargo') then
    return jsonb_build_object(
      'status', v_order.estado_pago,
      'reason', 'order_already_' || v_order.estado_pago,
      'first_time', false,
      'stock_warning', false
    );
  end if;

  -- 4. Verificación de consistencia de monto y moneda (tolerancia de $1 por redondeos)
  if abs(p_amount - v_order.total) > 1.00 then
    update orders set
      estado_pago = 'revision',
      mp_payment_id = p_payment_id,
      observaciones_admin = coalesce(observaciones_admin, '') ||
        chr(10) || 'Diferencia de monto detectada en pago: esperado ' || v_order.total || ', recibido ' || p_amount
    where id = p_order_id;

    return jsonb_build_object(
      'status', 'revision',
      'reason', 'amount_mismatch',
      'expected', v_order.total,
      'received', p_amount,
      'first_time', false,
      'stock_warning', false
    );
  end if;

  if upper(p_currency) <> 'ARS' then
    update orders set
      estado_pago = 'revision',
      mp_payment_id = p_payment_id,
      observaciones_admin = coalesce(observaciones_admin, '') ||
        chr(10) || 'Moneda inválida en pago: ' || p_currency
    where id = p_order_id;

    return jsonb_build_object(
      'status', 'revision',
      'reason', 'currency_mismatch',
      'expected', 'ARS',
      'received', p_currency,
      'first_time', false,
      'stock_warning', false
    );
  end if;

  -- 5. Actualización atómica de orden comprobando que no haya sido aprobada concurrentemente
  update orders set
    estado_pago = 'aprobado',
    mp_payment_id = p_payment_id,
    mp_fee_portalmaker = coalesce(p_fee, 0),
    mp_net_received = coalesce(p_net_received, 0),
    updated_at = now()
  where id = p_order_id
    and estado_pago is distinct from 'aprobado';

  get diagnostics v_rows_updated = row_count;

  if v_rows_updated = 0 then
    -- Otra transacción concurrente ganó la carrera y ya aprobó el pedido
    return jsonb_build_object(
      'status', 'aprobado',
      'already_processed', true,
      'first_time', false,
      'stock_warning', false
    );
  end if;

  -- 6. Descuento de stock protegido con FOR UPDATE por variante / producto
  if v_order.stock_descontado is distinct from true then
    for v_item in
      select * from jsonb_to_recordset(v_order.items) as x(
        product_id text,
        variant_id text,
        cantidad int
      )
    loop
      v_qty := coalesce(v_item.cantidad, 1);

      if v_item.variant_id is not null and v_item.variant_id <> '' then
        begin
          v_var_id := v_item.variant_id::uuid;
          select stock into v_current_stock
          from product_variants
          where id = v_var_id
          for update;

          if found and v_current_stock is not null then
            if v_current_stock < v_qty then
              v_missing := v_qty - v_current_stock;
              v_stock_warning := true;
              v_observaciones := v_observaciones || chr(10) ||
                'Sobreventa: faltante de ' || v_missing || ' unidad(es) en variante ' || v_var_id;
            end if;

            update product_variants
            set stock = greatest(stock - v_qty, 0)
            where id = v_var_id;
          end if;
        exception when invalid_text_representation then
          -- Solo se tolera un UUID mal formado en items; cualquier otro error debe abortar
          -- la transacción para no marcar stock_descontado sin haber descontado.
          v_observaciones := v_observaciones || chr(10) ||
            'Item con variant_id invalido: ' || coalesce(v_item.variant_id, 'null');
        end;
      elsif v_item.product_id is not null and v_item.product_id <> '' then
        begin
          v_prod_id := v_item.product_id::uuid;
          select stock into v_current_stock
          from products
          where id = v_prod_id
          for update;

          if found and v_current_stock is not null then
            if v_current_stock < v_qty then
              v_missing := v_qty - v_current_stock;
              v_stock_warning := true;
              v_observaciones := v_observaciones || chr(10) ||
                'Sobreventa: faltante de ' || v_missing || ' unidad(es) en producto ' || v_prod_id;
            end if;

            update products
            set stock = greatest(stock - v_qty, 0)
            where id = v_prod_id;
          end if;
        exception when invalid_text_representation then
          v_observaciones := v_observaciones || chr(10) ||
            'Item con product_id invalido: ' || coalesce(v_item.product_id, 'null');
        end;
      end if;
    end loop;

    -- Registrar stock_descontado = true y novedades de sobreventa en observaciones_admin
    update orders set
      stock_descontado = true,
      observaciones_admin = case
        when v_observaciones <> '' then coalesce(observaciones_admin, '') || v_observaciones
        else observaciones_admin
      end
    where id = p_order_id;
  end if;

  return jsonb_build_object(
    'status', 'aprobado',
    'first_time', true,
    'already_processed', false,
    'stock_warning', v_stock_warning
  );
end;
$$;

revoke all on function process_approved_payment(uuid, text, numeric, numeric, numeric, text) from public, anon, authenticated;
grant execute on function process_approved_payment(uuid, text, numeric, numeric, numeric, text) to service_role;

-- -----------------------------------------------------------------------------
-- 7. Políticas RLS para Colaboradores Activos en STORES y ORDERS (Item 8)
-- -----------------------------------------------------------------------------
drop policy if exists "owner_admin_read_stores" on stores;
create policy "owner_admin_read_stores" on stores for select
  using (
    is_platform_admin()
    or lower(admin_email) = lower(coalesce(auth.jwt()->>'email', ''))
    or current_user in ('service_role', 'postgres', 'supabase_admin')
    or (auth.jwt() ->> 'role') = 'service_role'
    or exists (
      select 1 from store_collaborators sc
      where sc.store_id = stores.id
        and lower(sc.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and sc.estado = 'activo'
    )
  );

drop policy if exists "admin_all_orders" on orders;
create policy "admin_all_orders" on orders for all
  using (
    is_platform_admin()
    or lower(coalesce(auth.jwt() ->> 'email', '')) = lower((select admin_email from stores where id = orders.store_id))
    or exists (
      select 1 from store_collaborators sc
      where sc.store_id = orders.store_id
        and lower(sc.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and sc.estado = 'activo'
    )
  );
