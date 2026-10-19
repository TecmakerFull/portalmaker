-- =============================================================================
-- Migración: Integración Mercado Pago Marketplace (Split de Pagos y OAuth)
-- =============================================================================

-- 1. Campos de Mercado Pago en STORES
alter table stores
  add column if not exists mp_connected boolean default false,
  add column if not exists mp_user_id text,
  add column if not exists mp_access_token text,
  add column if not exists mp_refresh_token text,
  add column if not exists mp_public_key text,
  add column if not exists mp_token_expires_at timestamptz,
  add column if not exists mp_recargo_porcentaje numeric(5,2) default 0.00,
  add column if not exists comision_portalmaker numeric(5,2) default 0.00;

-- 2. Campos de Mercado Pago en ORDERS
alter table orders
  add column if not exists mp_preference_id text,
  add column if not exists mp_payment_id text,
  add column if not exists mp_merchant_order_id text,
  add column if not exists mp_fee_portalmaker numeric(10,2) default 0.00,
  add column if not exists mp_net_received numeric(10,2) default 0.00;

-- 3. Tabla para resguardar estados de autenticación OAuth (evita CSRF y mantiene store_id durante redirección)
create table if not exists mp_oauth_states (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  state text not null unique,
  created_at timestamptz default now()
);

-- RLS y permisos para mp_oauth_states
alter table mp_oauth_states enable row level security;

-- Política de lectura/escritura para el flujo OAuth
drop policy if exists "mp_oauth_states_policy" on mp_oauth_states;
create policy "mp_oauth_states_policy" on mp_oauth_states for all using (true) with check (true);

-- GRANTs obligatorios para Supabase Data API (anon, authenticated, service_role)
grant select, insert, delete on mp_oauth_states to anon, authenticated, service_role;
