-- =============================================================================
-- PORTALMAKER — Migración: Colaboradores, Clientes CRM, Reseñas y Newsletter
-- Fecha: 15 de Octubre 2026
-- Ejecutar en Supabase: SQL Editor → New query → Pegar y Run
-- =============================================================================

-- 1. TABLA: store_collaborators (Equipo / Colaboradores de tienda)
create table if not exists store_collaborators (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  email text not null,
  rol text not null default 'colaborador' check (rol in ('colaborador', 'editor', 'admin')),
  estado text not null default 'activo' check (estado in ('activo', 'invitado', 'inactivo')),
  invitado_por text,
  created_at timestamptz default now(),
  unique (store_id, email)
);

create index if not exists idx_store_collaborators_store on store_collaborators(store_id, estado);
create index if not exists idx_store_collaborators_email on store_collaborators(email);

alter table store_collaborators enable row level security;
create policy "allow_all_store_collaborators" on store_collaborators for all using (true) with check (true);
grant select, insert, update, delete on store_collaborators to anon, authenticated, service_role;


-- 2. TABLA: store_customers (Historial y Registro de Clientes por Tienda)
create table if not exists store_customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  email text not null,
  nombre text,
  telefono text,
  created_at timestamptz default now(),
  ultimo_login timestamptz default now(),
  unique (store_id, email)
);

create index if not exists idx_store_customers_store on store_customers(store_id, created_at desc);
create index if not exists idx_store_customers_email on store_customers(email);

alter table store_customers enable row level security;
create policy "allow_all_store_customers" on store_customers for all using (true) with check (true);
grant select, insert, update, delete on store_customers to anon, authenticated, service_role;


-- 3. TABLA: product_reviews (Reseñas y Calificaciones de Productos)
create table if not exists product_reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  user_email text not null,
  user_name text not null,
  rating int not null check (rating >= 1 and rating <= 5),
  comentario text not null,
  visible boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists idx_product_reviews_product on product_reviews(product_id, visible);
create index if not exists idx_product_reviews_store on product_reviews(store_id, created_at desc);

alter table product_reviews enable row level security;
create policy "allow_all_product_reviews" on product_reviews for all using (true) with check (true);
grant select, insert, update, delete on product_reviews to anon, authenticated, service_role;


-- 4. TABLA: newsletter_subscribers (Suscriptores al Boletín / Novedades)
create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  email text not null,
  activo boolean default true,
  created_at timestamptz default now(),
  unique (store_id, email)
);

create index if not exists idx_newsletter_subscribers_store on newsletter_subscribers(store_id, created_at desc);

alter table newsletter_subscribers enable row level security;
create policy "allow_all_newsletter_subscribers" on newsletter_subscribers for all using (true) with check (true);
grant select, insert, update, delete on newsletter_subscribers to anon, authenticated, service_role;
