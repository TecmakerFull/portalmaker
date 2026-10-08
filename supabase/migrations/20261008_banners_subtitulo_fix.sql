-- =============================================================================
-- PORTALMAKER — Migración: Agregar columna subtitulo a tabla banners si falta
-- "El portal del Maker" | portalmaker.com.ar
-- =============================================================================

alter table public.banners add column if not exists subtitulo text;
