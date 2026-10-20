-- =============================================================================
-- PORTALMAKER — Migración: Horarios de Atención Semanales y Visibilidad
-- Fecha: 2026-10-21
-- Idempotente, no destructiva y aditiva.
-- =============================================================================

alter table stores
  add column if not exists mostrar_horarios boolean not null default false,
  add column if not exists horarios_semanales jsonb default null;

-- Actualizar vista pública stores_public con las nuevas columnas
create or replace view stores_public as
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
  horarios_semanales
from stores;

grant select on stores_public to anon, authenticated, service_role;
