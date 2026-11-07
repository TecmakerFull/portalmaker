-- =============================================================================
-- PORTALMAKER — Migración: Turnos Fase 2 (recordatorios, seña y calendario)
-- Fecha: 2026-11-07
--
--   1. Recordatorio por email X horas antes (configurable; 0 = sin recordatorio)
--   2. Marca de recordatorio enviado (la tarea programada no repite envíos)
--   3. Enlace secreto de calendario (.ics) por profesional, para suscribirse
--      desde Google Calendar sin pedir permisos de Google
--   4. Índices para las tareas programadas
--
-- La seña reutiliza columnas que ya existen (store_booking_settings.sena_*,
-- bookings.order_id y bookings.pendiente_expira_at).
-- Requiere: 20261106_turnos_fase1.sql. Idempotente.
-- =============================================================================

alter table public.store_booking_settings
  add column if not exists recordatorio_horas_antes int not null default 24;

alter table public.store_booking_settings drop constraint if exists store_booking_settings_recordatorio_check;
alter table public.store_booking_settings
  add constraint store_booking_settings_recordatorio_check
  check (recordatorio_horas_antes between 0 and 168);

alter table public.bookings
  add column if not exists recordatorio_enviado_at timestamptz;

-- Token secreto del calendario. Se puede regenerar desde el panel si se filtra.
alter table public.staff
  add column if not exists ics_token uuid not null default gen_random_uuid();

create unique index if not exists uq_staff_ics_token on public.staff(ics_token);

-- Turnos confirmados que todavía no recibieron recordatorio
create index if not exists idx_bookings_recordatorio_pendiente
  on public.bookings(starts_at)
  where estado = 'confirmado' and recordatorio_enviado_at is null;

-- Turnos esperando el pago de la seña (vencen y liberan el horario)
create index if not exists idx_bookings_sena_por_vencer
  on public.bookings(pendiente_expira_at)
  where estado = 'pendiente' and pendiente_expira_at is not null;
