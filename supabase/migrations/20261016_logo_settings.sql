-- =============================================================================
-- Migración: Soporte para tamaño de logo y visibilidad de nombre en header
-- =============================================================================

alter table stores
  add column if not exists logo_tamano text default 'mediano',
  add column if not exists mostrar_nombre_header boolean default true;
