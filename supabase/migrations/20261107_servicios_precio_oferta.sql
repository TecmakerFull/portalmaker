-- Precio de oferta en servicios (igual que en productos): el precio normal se
-- muestra tachado y, mientras la oferta esté activa, la reserva y la seña se
-- calculan sobre el precio de oferta.
alter table public.services
  add column if not exists precio_oferta numeric(10,2) check (precio_oferta is null or precio_oferta >= 0),
  add column if not exists oferta_activa boolean not null default false;
