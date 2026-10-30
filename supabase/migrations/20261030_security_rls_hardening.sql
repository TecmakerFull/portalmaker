-- =============================================================================
-- PORTALMAKER — Migración de Seguridad: Endurecimiento RLS y Permisos Anon
-- Fecha: 2026-10-30
-- Objetivo:
--   1. Eliminar políticas permisivas (qual = true) en store_collaborators,
--      store_customers, newsletter_subscribers y product_reviews.
--   2. Revocar lectura/escritura anónima en datos sensibles de tiendas, equipos
--      de colaboradores, cartera de clientes (CRM) y listado de suscriptores.
--   3. Evitar recursión RLS entre stores y store_collaborators mediante funciones
--      SECURITY DEFINER con search_path fijo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Funciones Helper SECURITY DEFINER (sin recursión RLS)
-- -----------------------------------------------------------------------------
create or replace function public.is_store_owner(p_store_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.stores s
    where s.id = p_store_id
      and lower(s.admin_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.is_store_collaborator(p_store_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.store_collaborators sc
    where sc.store_id = p_store_id
      and lower(sc.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and sc.estado = 'activo'
  );
$$;

create or replace function public.is_store_admin_collaborator(p_store_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.store_collaborators sc
    where sc.store_id = p_store_id
      and lower(sc.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and sc.estado = 'activo'
      and sc.rol = 'admin'
  );
$$;

grant execute on function public.is_store_owner(uuid) to authenticated, service_role;
grant execute on function public.is_store_collaborator(uuid) to authenticated, service_role;
grant execute on function public.is_store_admin_collaborator(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Actualizar políticas de STORES y ORDERS para usar helpers sin recursión
-- -----------------------------------------------------------------------------
drop policy if exists "owner_admin_read_stores" on public.stores;
create policy "owner_admin_read_stores" on public.stores
  for select
  using (
    is_platform_admin()
    or lower(admin_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or current_user in ('service_role', 'postgres', 'supabase_admin')
    or (auth.jwt() ->> 'role') = 'service_role'
    or public.is_store_collaborator(id)
  );

drop policy if exists "admin_all_orders" on public.orders;
create policy "admin_all_orders" on public.orders
  for all
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  )
  with check (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  );

-- Permitir que compradores autenticados consulten únicamente sus propios pedidos en /tienda/cuenta
drop policy if exists "buyer_read_own_orders" on public.orders;
create policy "buyer_read_own_orders" on public.orders
  for select
  to authenticated
  using (
    email_comprador is not null
    and lower(email_comprador) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- -----------------------------------------------------------------------------
-- 3. Endurecimiento de STORE_COLLABORATORS (Cero acceso para anon)
-- -----------------------------------------------------------------------------
alter table public.store_collaborators enable row level security;

revoke all on public.store_collaborators from public, anon;
grant select, insert, update, delete on public.store_collaborators to authenticated, service_role;

drop policy if exists "allow_all_store_collaborators" on public.store_collaborators;
drop policy if exists "store_collaborators_select" on public.store_collaborators;
drop policy if exists "store_collaborators_insert" on public.store_collaborators;
drop policy if exists "store_collaborators_update" on public.store_collaborators;
drop policy if exists "store_collaborators_delete" on public.store_collaborators;

create policy "store_collaborators_select" on public.store_collaborators
  for select
  to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "store_collaborators_insert" on public.store_collaborators
  for insert
  to authenticated
  with check (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_admin_collaborator(store_id)
  );

create policy "store_collaborators_update" on public.store_collaborators
  for update
  to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_admin_collaborator(store_id)
  )
  with check (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_admin_collaborator(store_id)
  );

create policy "store_collaborators_delete" on public.store_collaborators
  for delete
  to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_admin_collaborator(store_id)
  );

-- -----------------------------------------------------------------------------
-- 4. Endurecimiento de STORE_CUSTOMERS (CRM privado de cada tienda)
-- -----------------------------------------------------------------------------
alter table public.store_customers enable row level security;

revoke all on public.store_customers from public, anon;
grant select, insert, update, delete on public.store_customers to authenticated, service_role;

drop policy if exists "allow_all_store_customers" on public.store_customers;
drop policy if exists "store_customers_select" on public.store_customers;
drop policy if exists "store_customers_insert" on public.store_customers;
drop policy if exists "store_customers_update" on public.store_customers;
drop policy if exists "store_customers_delete" on public.store_customers;

create policy "store_customers_select" on public.store_customers
  for select
  to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "store_customers_insert" on public.store_customers
  for insert
  to authenticated
  with check (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "store_customers_update" on public.store_customers
  for update
  to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "store_customers_delete" on public.store_customers
  for delete
  to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_admin_collaborator(store_id)
  );

-- -----------------------------------------------------------------------------
-- 5. Endurecimiento de NEWSLETTER_SUBSCRIBERS (Anon solo INSERT, lectura solo Admin)
-- -----------------------------------------------------------------------------
alter table public.newsletter_subscribers enable row level security;

revoke all on public.newsletter_subscribers from public, anon;
grant insert on public.newsletter_subscribers to anon;
grant select, insert, update, delete on public.newsletter_subscribers to authenticated, service_role;

drop policy if exists "allow_all_newsletter_subscribers" on public.newsletter_subscribers;
drop policy if exists "newsletter_subscribers_public_insert" on public.newsletter_subscribers;
drop policy if exists "newsletter_subscribers_admin_all" on public.newsletter_subscribers;

create policy "newsletter_subscribers_public_insert" on public.newsletter_subscribers
  for insert
  to anon, authenticated
  with check (
    email is not null
    and length(trim(email)) > 3
  );

create policy "newsletter_subscribers_admin_all" on public.newsletter_subscribers
  for all
  to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  )
  with check (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  );

-- -----------------------------------------------------------------------------
-- 6. Endurecimiento de PRODUCT_REVIEWS (Anon solo SELECT de visibles)
-- -----------------------------------------------------------------------------
alter table public.product_reviews enable row level security;

revoke all on public.product_reviews from public, anon;
grant select on public.product_reviews to anon;
grant select, insert, update, delete on public.product_reviews to authenticated, service_role;

drop policy if exists "allow_all_product_reviews" on public.product_reviews;
drop policy if exists "product_reviews_select" on public.product_reviews;
drop policy if exists "product_reviews_insert" on public.product_reviews;
drop policy if exists "product_reviews_admin_update" on public.product_reviews;
drop policy if exists "product_reviews_admin_delete" on public.product_reviews;

create policy "product_reviews_select" on public.product_reviews
  for select
  using (
    visible = true
    or is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
    or lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "product_reviews_insert" on public.product_reviews
  for insert
  to authenticated
  with check (
    lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  );

create policy "product_reviews_admin_update" on public.product_reviews
  for update
  to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  )
  with check (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  );

create policy "product_reviews_admin_delete" on public.product_reviews
  for delete
  to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  );

