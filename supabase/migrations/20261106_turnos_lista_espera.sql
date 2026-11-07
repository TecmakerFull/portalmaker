-- =============================================================================
-- PORTALMAKER — Migración: Lista de espera de turnos
-- Fecha: 2026-11-06
--
-- Cuando un día está lleno, el cliente puede anotarse para que le avisen si se
-- libera un turno de ese servicio ese día. Al cancelarse un turno, el sistema
-- avisa por email a quienes esperan (el primero que reserva se lo queda) y el
-- dueño ve y gestiona la lista desde la Agenda (incluido avisar por WhatsApp).
--
-- Requiere: 20261106_turnos_fase1.sql. Idempotente.
-- =============================================================================

create table if not exists public.booking_waitlist (
  id                uuid primary key default gen_random_uuid(),
  store_id          uuid not null references public.stores(id) on delete cascade,
  service_id        uuid not null references public.services(id) on delete cascade,
  -- Día local de la tienda que le interesa al cliente
  fecha             date not null,
  cliente_user_id   uuid references auth.users(id) on delete set null,
  cliente_nombre    text not null check (char_length(cliente_nombre) between 1 and 100),
  cliente_email     text,
  cliente_telefono  text,
  -- esperando: anotado | avisado: se le avisó que se liberó un lugar
  -- resuelto: consiguió turno o la tienda lo resolvió | cancelado: se quitó
  estado            text not null default 'esperando'
    check (estado in ('esperando', 'avisado', 'resuelto', 'cancelado')),
  avisado_at        timestamptz,
  notas_admin       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Una sola inscripción activa por cliente, servicio y día (evita duplicados por doble clic).
create unique index if not exists uq_waitlist_activa
  on public.booking_waitlist(store_id, service_id, fecha, cliente_user_id)
  where estado in ('esperando', 'avisado');

create index if not exists idx_waitlist_store_fecha on public.booking_waitlist(store_id, fecha);

alter table public.booking_waitlist enable row level security;

drop policy if exists "admin_all_waitlist" on public.booking_waitlist;
create policy "admin_all_waitlist" on public.booking_waitlist
  for all to authenticated
  using (public.can_manage_store(store_id))
  with check (public.can_manage_store(store_id));

-- El cliente ve sus propias inscripciones. Las altas se hacen desde el
-- servidor (/api/turnos/espera) para validar el servicio, la fecha y el límite de clientes.
drop policy if exists "client_read_own_waitlist" on public.booking_waitlist;
create policy "client_read_own_waitlist" on public.booking_waitlist
  for select to authenticated
  using (cliente_user_id = auth.uid());

revoke all on public.booking_waitlist from public, anon;
grant select, insert, update, delete on public.booking_waitlist to authenticated;
grant all on public.booking_waitlist to service_role;
