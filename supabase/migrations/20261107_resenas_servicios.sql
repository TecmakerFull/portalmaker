-- =============================================================================
-- PORTALMAKER — Migración: Reseñas también para servicios
-- Fecha: 2026-11-07
--
-- Hasta ahora cada reseña apuntaba a un producto (product_id obligatorio). Se
-- permite que apunte a un servicio: exactamente uno de los dos debe estar
-- completo. Las políticas existentes (lectura pública de visibles, alta de
-- usuarios autenticados, moderación de la tienda) siguen valiendo igual.
-- Requiere: 20261106_turnos_fase1.sql. Idempotente.
-- =============================================================================

alter table public.product_reviews alter column product_id drop not null;

alter table public.product_reviews
  add column if not exists service_id uuid references public.services(id) on delete cascade;

alter table public.product_reviews drop constraint if exists product_reviews_un_destino;
alter table public.product_reviews
  add constraint product_reviews_un_destino
  check (num_nonnulls(product_id, service_id) = 1);

create index if not exists idx_product_reviews_service on public.product_reviews(service_id) where service_id is not null;
