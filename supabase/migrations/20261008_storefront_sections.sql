-- =============================================================================
-- PORTALMAKER — Migración: Tabla store_sections para Arquitectura Modular
-- "El portal del Maker" | portalmaker.com.ar
-- =============================================================================

create table if not exists store_sections (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores(id) on delete cascade,
  section_type text not null,  -- 'top_bar' | 'header' | 'navbar' | 'hero' | 'featured_products' | etc.
  enabled      boolean default true,
  orden        int default 0,
  settings     jsonb default '{}'::jsonb, -- configuración visual, velocidad, layout, toggles
  content      jsonb default '[]'::jsonb, -- elementos, mensajes, links o slides
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),

  constraint uq_store_section unique(store_id, section_type)
);

create index if not exists idx_store_sections_store on store_sections(store_id, orden);

-- Row Level Security
alter table store_sections enable row level security;

-- Lectura pública para cualquier visitante de la tienda
drop policy if exists "public_read_sections" on store_sections;
create policy "public_read_sections" on store_sections for select using (true);

-- Administración completa para el dueño de la tienda o platform admin
drop policy if exists "admin_all_sections" on store_sections;
create policy "admin_all_sections" on store_sections for all
  using (
    auth.jwt() ->> 'email' = (select admin_email from stores where id = store_sections.store_id)
    or is_platform_admin()
  );

-- GRANTs obligatorios de Supabase
grant select on store_sections to anon, authenticated;
grant insert, update, delete on store_sections to authenticated;
