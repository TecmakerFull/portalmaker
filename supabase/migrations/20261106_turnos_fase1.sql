-- =============================================================================
-- PORTALMAKER — Migración: Tiendas de Servicios con turnos (Fase 1)
-- Fecha: 2026-11-06
-- Plan: documentacion/plan-turnos-servicios.md
--
-- Aditiva y sin efecto en las tiendas actuales: todas quedan con
-- tipo_negocio = 'productos' y las tablas nuevas arrancan vacías.
--
--   1. stores.tipo_negocio ('productos' | 'servicios' | 'ambos') + vista pública
--   2. store_booking_settings: reglas de reserva de cada tienda
--   3. services: catálogo de servicios (duración, precio, buffer)
--   4. staff: profesionales (toda tienda de servicios tiene al menos uno; con
--      uno solo la UI lo oculta). Su disponibilidad semanal usa el mismo
--      formato JSON que los horarios de atención (lib/horarios.ts)
--   5. staff_blocks: bloqueos puntuales (vacaciones, feriados, trámites)
--   6. bookings: turnos, con restricción que impide superposiciones
--   7. booking_events: historial de cambios de cada turno
--
-- Idempotente: se puede ejecutar más de una vez.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tipo de negocio
-- -----------------------------------------------------------------------------
alter table public.stores
  add column if not exists tipo_negocio text not null default 'productos';

alter table public.stores drop constraint if exists stores_tipo_negocio_check;
alter table public.stores
  add constraint stores_tipo_negocio_check
  check (tipo_negocio in ('productos', 'servicios', 'ambos'));

comment on column public.stores.tipo_negocio is
  'Qué ofrece la tienda. productos = catálogo y envíos; servicios = turnos; ambos = las dos cosas. El dueño puede cambiarlo sin perder datos.';

-- La vista pública suma tipo_negocio AL FINAL: create or replace view solo
-- permite agregar columnas al final con las existentes en el mismo orden
-- (definición previa: 20261025_features_override.sql).
create or replace view public.stores_public as
select
  id,
  nombre,
  slug,
  custom_domain,
  custom_domain_verified,
  modo_operacion,
  checkout_activo,
  whatsapp_numero,
  plan,
  suscripcion_activa,
  logo_url,
  icono_url,
  favicon_url,
  hero_banner_url,
  banners_activo,
  slogan,
  logo_tamano,
  mostrar_nombre_header,
  color_primario,
  color_secundario,
  color_fondo,
  color_texto,
  color_primario_dark,
  color_secundario_dark,
  color_fondo_dark,
  color_texto_dark,
  tema_por_defecto,
  font_heading,
  font_body,
  instagram_url,
  facebook_url,
  tiktok_url,
  email_contacto,
  horario_atencion,
  direccion,
  meta_title,
  meta_description,
  ga_measurement_id,
  meta_pixel_id,
  google_maps_embed_url,
  transferencia_activa,
  mp_connected,
  mp_recargo_porcentaje,
  created_at,
  updated_at,
  envios_activo,
  envio_retiro_local_activo,
  envio_gratis_desde,
  mostrar_horarios,
  horarios_semanales,
  features_override,
  tipo_negocio
from public.stores;

grant select on public.stores_public to anon, authenticated, service_role;

-- Helper reutilizable para las políticas de las tablas nuevas.
create or replace function public.can_manage_store(p_store_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select is_platform_admin()
      or public.is_store_owner(p_store_id)
      or public.is_store_collaborator(p_store_id);
$$;

revoke all on function public.can_manage_store(uuid) from public, anon;
grant execute on function public.can_manage_store(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Reglas de reserva por tienda
-- -----------------------------------------------------------------------------
create table if not exists public.store_booking_settings (
  store_id                 uuid primary key references public.stores(id) on delete cascade,
  zona_horaria             text not null default 'America/Argentina/Buenos_Aires',
  -- Cuánto antes como mínimo se puede reservar (evita turnos "para dentro de 5 minutos")
  anticipacion_min_minutos int  not null default 120 check (anticipacion_min_minutos between 0 and 10080),
  -- Hasta cuántos días hacia adelante se muestra la agenda
  anticipacion_max_dias    int  not null default 60  check (anticipacion_max_dias between 1 and 365),
  -- Cada cuántos minutos se ofrecen horarios de inicio (09:00, 09:15, ...)
  intervalo_grilla_minutos int  not null default 15  check (intervalo_grilla_minutos in (5, 10, 15, 20, 30, 45, 60)),
  -- true = el turno queda "pendiente" hasta que la tienda lo confirma
  requiere_aprobacion      boolean not null default false,
  -- El cliente puede cancelar solo hasta X horas antes
  cancelacion_hasta_horas  int  not null default 24 check (cancelacion_hasta_horas between 0 and 720),
  -- Seña opcional (fase 2): ninguna por defecto
  sena_modo                text not null default 'ninguna' check (sena_modo in ('ninguna', 'porcentaje', 'monto', 'total')),
  sena_valor               numeric(10,2) not null default 0 check (sena_valor >= 0),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

alter table public.store_booking_settings enable row level security;

drop policy if exists "public_read_booking_settings" on public.store_booking_settings;
create policy "public_read_booking_settings" on public.store_booking_settings
  for select using (true);

drop policy if exists "admin_write_booking_settings" on public.store_booking_settings;
create policy "admin_write_booking_settings" on public.store_booking_settings
  for all to authenticated
  using (public.can_manage_store(store_id))
  with check (public.can_manage_store(store_id));

revoke all on public.store_booking_settings from public, anon;
grant select on public.store_booking_settings to anon;
grant select, insert, update, delete on public.store_booking_settings to authenticated;
grant all on public.store_booking_settings to service_role;

-- -----------------------------------------------------------------------------
-- 3. Servicios
-- -----------------------------------------------------------------------------
create table if not exists public.services (
  id                      uuid primary key default gen_random_uuid(),
  store_id                uuid not null references public.stores(id) on delete cascade,
  category_id             uuid references public.categories(id) on delete set null,
  nombre                  text not null check (char_length(nombre) between 1 and 120),
  slug                    text not null,
  descripcion             text,
  imagenes                text[] not null default '{}',
  duracion_minutos        int  not null check (duracion_minutos between 5 and 720),
  -- Tiempo libre después de cada turno (limpieza, preparación)
  buffer_despues_minutos  int  not null default 0 check (buffer_despues_minutos between 0 and 240),
  precio                  numeric(10,2) not null default 0 check (precio >= 0),
  -- true = se muestra "Desde $X" (el precio final depende del caso)
  precio_desde            boolean not null default false,
  visible                 boolean not null default true,
  destacado               boolean not null default false,
  orden                   int not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (store_id, slug)
);

create index if not exists idx_services_store on public.services(store_id, orden);

alter table public.services enable row level security;

drop policy if exists "public_read_services" on public.services;
create policy "public_read_services" on public.services
  for select using (visible = true);

drop policy if exists "admin_all_services" on public.services;
create policy "admin_all_services" on public.services
  for all to authenticated
  using (public.can_manage_store(store_id))
  with check (public.can_manage_store(store_id));

revoke all on public.services from public, anon;
grant select on public.services to anon;
grant select, insert, update, delete on public.services to authenticated;
grant all on public.services to service_role;

-- -----------------------------------------------------------------------------
-- 4. Profesionales
-- -----------------------------------------------------------------------------
create table if not exists public.staff (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  nombre      text not null check (char_length(nombre) between 1 and 80),
  email       text,
  foto_url    text,
  -- Disponibilidad semanal con el formato HorariosConfig de lib/horarios.ts:
  -- { "dias": { "lunes": { "activo": true, "turno1": {...}, "dobleTurno": false, "turno2": {...} }, ... } }
  horarios    jsonb not null default '{}'::jsonb,
  activo      boolean not null default true,
  orden       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_staff_store on public.staff(store_id, orden);

alter table public.staff enable row level security;

-- Sin lectura pública: la disponibilidad se calcula en el servidor.
drop policy if exists "admin_all_staff" on public.staff;
create policy "admin_all_staff" on public.staff
  for all to authenticated
  using (public.can_manage_store(store_id))
  with check (public.can_manage_store(store_id));

revoke all on public.staff from public, anon;
grant select, insert, update, delete on public.staff to authenticated;
grant all on public.staff to service_role;

-- -----------------------------------------------------------------------------
-- 5. Bloqueos puntuales de agenda
-- -----------------------------------------------------------------------------
create table if not exists public.staff_blocks (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  staff_id    uuid not null references public.staff(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  motivo      text,
  created_at  timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists idx_staff_blocks_rango on public.staff_blocks(staff_id, starts_at, ends_at);

alter table public.staff_blocks enable row level security;

drop policy if exists "admin_all_staff_blocks" on public.staff_blocks;
create policy "admin_all_staff_blocks" on public.staff_blocks
  for all to authenticated
  using (public.can_manage_store(store_id))
  with check (public.can_manage_store(store_id));

revoke all on public.staff_blocks from public, anon;
grant select, insert, update, delete on public.staff_blocks to authenticated;
grant all on public.staff_blocks to service_role;

-- -----------------------------------------------------------------------------
-- 6. Turnos
-- -----------------------------------------------------------------------------
create extension if not exists btree_gist;

create table if not exists public.bookings (
  id                   uuid primary key default gen_random_uuid(),
  store_id             uuid not null references public.stores(id) on delete cascade,
  service_id           uuid references public.services(id) on delete set null,
  staff_id             uuid not null references public.staff(id) on delete restrict,
  starts_at            timestamptz not null,
  ends_at              timestamptz not null,
  -- Fin del bloque ocupado: ends_at + buffer del servicio. Es lo que se usa
  -- para impedir superposiciones (el buffer también ocupa la agenda).
  ocupado_hasta        timestamptz not null,
  estado               text not null default 'confirmado'
    check (estado in ('pendiente', 'confirmado', 'cancelado', 'completado', 'ausente', 'expirado')),
  -- Copia del servicio al momento de reservar (si el servicio cambia, el turno no)
  servicio_nombre      text not null,
  servicio_duracion    int  not null,
  precio               numeric(10,2) not null default 0,
  cliente_user_id      uuid references auth.users(id) on delete set null,
  cliente_nombre       text not null check (char_length(cliente_nombre) between 1 and 100),
  cliente_email        text,
  cliente_telefono     text,
  notas_cliente        text check (notas_cliente is null or char_length(notas_cliente) <= 500),
  notas_admin          text,
  origen               text not null default 'web' check (origen in ('web', 'manual')),
  -- Enlace secreto para que el cliente vea o cancele su turno sin iniciar sesión
  public_token         uuid not null default gen_random_uuid() unique,
  order_id             uuid references public.orders(id) on delete set null,
  cancelado_por        text check (cancelado_por in ('cliente', 'tienda')),
  cancelado_at         timestamptz,
  pendiente_expira_at  timestamptz,
  google_event_id      text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ocupado_hasta >= ends_at)
);

-- Garantía central: un profesional no puede tener dos turnos activos que se
-- pisen, aunque dos clientes confirmen el mismo horario en el mismo instante.
alter table public.bookings drop constraint if exists bookings_sin_superposicion;
alter table public.bookings
  add constraint bookings_sin_superposicion
  exclude using gist (
    staff_id with =,
    tstzrange(starts_at, ocupado_hasta, '[)') with &&
  ) where (estado in ('pendiente', 'confirmado'));

create index if not exists idx_bookings_store_fecha on public.bookings(store_id, starts_at);
create index if not exists idx_bookings_cliente on public.bookings(cliente_user_id);

alter table public.bookings enable row level security;

drop policy if exists "admin_all_bookings" on public.bookings;
create policy "admin_all_bookings" on public.bookings
  for all to authenticated
  using (public.can_manage_store(store_id))
  with check (public.can_manage_store(store_id));

-- El cliente ve sus propios turnos en "Mi cuenta". Las reservas web se crean
-- solo desde el servidor (/api/turnos) para validar disponibilidad y límites.
drop policy if exists "client_read_own_bookings" on public.bookings;
create policy "client_read_own_bookings" on public.bookings
  for select to authenticated
  using (cliente_user_id = auth.uid());

revoke all on public.bookings from public, anon;
grant select, insert, update, delete on public.bookings to authenticated;
grant all on public.bookings to service_role;

-- -----------------------------------------------------------------------------
-- 7. Historial de cambios de cada turno
-- -----------------------------------------------------------------------------
create table if not exists public.booking_events (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  store_id    uuid not null references public.stores(id) on delete cascade,
  tipo        text not null,          -- creado | confirmado | cancelado | reprogramado | completado | ausente | recordatorio
  detalle     text,
  actor       text not null,          -- cliente | tienda | sistema
  created_at  timestamptz not null default now()
);

create index if not exists idx_booking_events_booking on public.booking_events(booking_id, created_at);

alter table public.booking_events enable row level security;

drop policy if exists "admin_read_booking_events" on public.booking_events;
create policy "admin_read_booking_events" on public.booking_events
  for select to authenticated
  using (public.can_manage_store(store_id));

drop policy if exists "admin_insert_booking_events" on public.booking_events;
create policy "admin_insert_booking_events" on public.booking_events
  for insert to authenticated
  with check (public.can_manage_store(store_id));

revoke all on public.booking_events from public, anon;
grant select, insert on public.booking_events to authenticated;
grant all on public.booking_events to service_role;
