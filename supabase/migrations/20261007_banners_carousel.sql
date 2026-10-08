-- =============================================================================
-- PORTALMAKER — Migración: Tabla Banners y Columna banners_activo en Stores
-- "El portal del Maker" | portalmaker.com.ar
-- =============================================================================

-- 1. Columna en stores para activar/desactivar banner carrusel
alter table stores add column if not exists banners_activo boolean default false;

-- 2. Tabla banners
create table if not exists banners (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,

  imagen_url  text not null,
  video_url   text,
  titulo      text,
  subtitulo   text,
  cta_texto   text,         -- ej: "Ver Producto", "Ver Ofertas", "Comprar Ahora"
  cta_url     text,         -- ej: "/tienda/productos/slug" o "/tienda?cat=slug"
  orden       int default 0,
  activo      boolean default true,

  fecha_desde timestamptz,
  fecha_hasta timestamptz,

  created_at  timestamptz default now()
);

create index if not exists idx_banners_store on banners(store_id, orden, activo);

alter table banners enable row level security;

-- Lectura pública para visitantes de la tienda
drop policy if exists "public_read_banners" on banners;
create policy "public_read_banners" on banners for select
  using (activo = true);

-- CRUD para el admin de la tienda
drop policy if exists "admin_all_banners" on banners;
create policy "admin_all_banners" on banners for all
  using (
    auth.jwt() ->> 'email' = (select admin_email from stores where id = banners.store_id)
    or is_platform_admin()
  );

-- GRANTs obligatorios de Supabase
grant select on banners to anon, authenticated;
grant insert, update, delete on banners to authenticated;
