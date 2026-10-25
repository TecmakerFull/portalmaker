-- =============================================================================
-- PORTALMAKER — Migración: features_override para gestión granular de módulos y límites
-- Permite al superadministrador activar/desactivar opciones individuales
-- y límites por tienda, con prioridad sobre el plan base asignado.
-- =============================================================================

-- 1. Asegurar columnas en la tabla stores (idempotente)
alter table public.stores
  add column if not exists features_override jsonb default '{}'::jsonb,
  add column if not exists mostrar_horarios boolean default false,
  add column if not exists horarios_semanales jsonb default null;

comment on column public.stores.features_override is
  'Diccionario JSONB de personalización de módulos (checkout, envios, pasarelas) y límites numéricos definidos por el Superadmin.';

-- 2. Recrear la vista stores_public con drop view previo para evitar conflicto de orden de columnas en Postgres
drop view if exists public.stores_public cascade;

create view public.stores_public as
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
  features_override
from public.stores;

-- 3. GRANTs obligatorios de Supabase
grant select, update on public.stores to authenticated;
grant all on public.stores to service_role;
grant select on public.stores_public to anon, authenticated, service_role;
