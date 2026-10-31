-- =============================================================================
-- PORTALMAKER — Migración: Permisos RLS para Colaboradores en Catálogo y Tienda
-- Fecha: 2026-10-31
-- Objetivo:
--   Permitir que los colaboradores activos (store_collaborators con estado = 'activo')
--   y dueños de tienda (case-insensitive vía is_store_owner) puedan crear, editar y
--   eliminar productos, variantes, fichas técnicas (product_details), categorías,
--   banners, páginas, secciones, movimientos de stock y zonas de envío.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper SECURITY DEFINER para tablas hijas de products (product_variants, product_details)
-- -----------------------------------------------------------------------------
create or replace function public.can_manage_product(p_product_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.products p
    where p.id = p_product_id
      and (
        is_platform_admin()
        or public.is_store_owner(p.store_id)
        or public.is_store_collaborator(p.store_id)
      )
  );
$$;

grant execute on function public.can_manage_product(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. PRODUCTS — Permitir INSERT, UPDATE, DELETE y SELECT de ocultos a dueños y colaboradores
-- -----------------------------------------------------------------------------
drop policy if exists "admin_all_products" on public.products;
create policy "admin_all_products" on public.products
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
-- 3. PRODUCT_VARIANTS — Permitir gestión a dueños y colaboradores
-- -----------------------------------------------------------------------------
drop policy if exists "admin_all_variants" on public.product_variants;
create policy "admin_all_variants" on public.product_variants
  for all
  to authenticated
  using (public.can_manage_product(product_id))
  with check (public.can_manage_product(product_id));

-- -----------------------------------------------------------------------------
-- 4. PRODUCT_DETAILS (Ficha técnica, SEO y FAQ del producto)
-- -----------------------------------------------------------------------------
drop policy if exists "admin_all_product_details" on public.product_details;
create policy "admin_all_product_details" on public.product_details
  for all
  to authenticated
  using (public.can_manage_product(product_id))
  with check (public.can_manage_product(product_id));

-- -----------------------------------------------------------------------------
-- 5. CATEGORIES — Permitir gestión de categorías a dueños y colaboradores
-- -----------------------------------------------------------------------------
drop policy if exists "admin_all_categories" on public.categories;
create policy "admin_all_categories" on public.categories
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
-- 6. BANNERS, STORE_PAGES, STORE_SECTIONS, PORTFOLIO, SHIPPING_ZONES
-- -----------------------------------------------------------------------------
drop policy if exists "admin_all_banners" on public.banners;
create policy "admin_all_banners" on public.banners
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

drop policy if exists "admin_all_store_pages" on public.store_pages;
create policy "admin_all_store_pages" on public.store_pages
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

drop policy if exists "Admins de tienda gestionan sus secciones" on public.store_sections;
drop policy if exists "admin_all_sections" on public.store_sections;
create policy "admin_all_sections" on public.store_sections
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

drop policy if exists "admin_all_portfolio" on public.portfolio;
create policy "admin_all_portfolio" on public.portfolio
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

drop policy if exists "admin_all_shipping_zones" on public.shipping_zones;
create policy "admin_all_shipping_zones" on public.shipping_zones
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
-- 7. STOCK_MOVEMENTS, ORDER_ITEMS, PRODUCT_VIEWS, AUDIT_LOG
-- -----------------------------------------------------------------------------
drop policy if exists "admin_all_stock_movements" on public.stock_movements;
create policy "admin_all_stock_movements" on public.stock_movements
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

drop policy if exists "admin_read_order_items" on public.order_items;
create policy "admin_read_order_items" on public.order_items
  for select
  to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  );

drop policy if exists "admin_read_product_views" on public.product_views;
create policy "admin_read_product_views" on public.product_views
  for select
  to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  );

drop policy if exists "admin_read_audit_log" on public.audit_log;
create policy "admin_read_audit_log" on public.audit_log
  for select
  to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  );

