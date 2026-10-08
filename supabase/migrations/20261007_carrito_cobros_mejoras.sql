-- =============================================================================
-- PORTALMAKER — Script de Actualización SQL (Carrito, Cobros por Transferencia y Ventas)
-- Ejecutar en Supabase: SQL Editor → New query → Pegar y Run
-- =============================================================================

-- 1. Nuevos campos en la tabla STORES (para datos de cobro por transferencia bancaria)
alter table stores
  add column if not exists transferencia_activa        boolean default false,
  add column if not exists transferencia_alias         text,
  add column if not exists transferencia_cbu_cvu       text,
  add column if not exists transferencia_banco         text,
  add column if not exists transferencia_titular       text,
  add column if not exists transferencia_cuit          text,
  add column if not exists transferencia_instrucciones text;

-- 2. Nuevos campos en la tabla ORDERS (para control de tipo de entrega y descuento de stock)
alter table orders
  add column if not exists tipo_entrega     text default 'acordar',
  add column if not exists stock_descontado boolean default false;

-- 3. Asegurar permisos GRANTs para las tablas requeridas por la Data API
grant select, insert, update on stores to anon, authenticated;
grant select, insert, update on orders to anon, authenticated;
grant select, insert, update, delete on store_pages to authenticated;
grant select on store_pages to anon;
