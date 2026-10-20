-- =============================================================================
-- PORTALMAKER — Migración Fase 1: Envíos e Integración Logística en Argentina
-- Fecha: 2026-10-20
-- Idempotente, no destructiva y aditiva.
-- Todo el flujo operativo queda condicionado a stores.envios_activo (default false).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 2.1 Origen y Configuración Logística por Tienda
-- -----------------------------------------------------------------------------
alter table stores
  add column if not exists origen_calle text,
  add column if not exists origen_altura text,
  add column if not exists origen_piso_depto text,
  add column if not exists origen_localidad text,
  add column if not exists origen_provincia text,
  add column if not exists origen_codigo_postal text,
  add column if not exists origen_cuit text,
  add column if not exists origen_razon_social text,
  add column if not exists origen_telefono text,
  add column if not exists origen_email text,
  add column if not exists envios_activo boolean not null default false,
  add column if not exists envio_gratis_desde numeric(12,2),
  add column if not exists envio_markup_porcentaje numeric(5,2) not null default 0,
  add column if not exists envio_tarifa_fallback numeric(12,2),
  add column if not exists envio_retiro_local_activo boolean not null default true,
  add column if not exists envio_comision_incluye_envio boolean not null default false;

-- -----------------------------------------------------------------------------
-- 2.2 Zonas de Envío Manuales (shipping_zones)
-- Se extiende para soportar filtrado por CP y plazo estimado en proveedor 'manual'
-- -----------------------------------------------------------------------------
alter table shipping_zones
  add column if not exists codigos_postales text[] not null default '{}',
  add column if not exists plazo_texto text;

-- -----------------------------------------------------------------------------
-- 2.3 Medidas Físicas por Variante y Valor Declarado en Catálogo
-- -----------------------------------------------------------------------------
-- Peso y dimensiones a nivel variante (NULL = hereda del producto padre)
alter table product_variants
  add column if not exists peso_kg numeric(6,3),
  add column if not exists alto_cm numeric(6,2),
  add column if not exists ancho_cm numeric(6,2),
  add column if not exists profundidad_cm numeric(6,2);

-- Valor declarado explícito para seguro del carrier (NULL = toma precio de venta)
alter table product_details
  add column if not exists valor_declarado numeric(12,2);

-- -----------------------------------------------------------------------------
-- 2.4 Dirección Estructurada y Metadatos de Envío en Pedidos
-- -----------------------------------------------------------------------------
-- Se mantiene orders.direccion_entrega para retrocompatibilidad y visualización legible
alter table orders
  add column if not exists envio_calle text,
  add column if not exists envio_altura text,
  add column if not exists envio_piso_depto text,
  add column if not exists envio_localidad text,
  add column if not exists envio_provincia text,
  add column if not exists envio_codigo_postal text,
  add column if not exists envio_referencias text,
  add column if not exists documento_comprador text,
  add column if not exists envio_proveedor text,
  add column if not exists envio_servicio text,
  add column if not exists envio_modalidad text
    check (envio_modalidad in ('domicilio','sucursal','retiro_local','manual')),
  add column if not exists envio_sucursal jsonb,
  add column if not exists envio_quote_id uuid;

-- -----------------------------------------------------------------------------
-- 2.5 Credenciales Cifradas por Tienda y Proveedor (store_shipping_providers)
-- -----------------------------------------------------------------------------
create table if not exists store_shipping_providers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  provider text not null check (provider in ('zipnova','correo_argentino','andreani','manual')),
  activo boolean not null default false,
  credentials_enc text,            -- Payload JSON cifrado AES-256-GCM (iv.ciphertext en base64)
  config jsonb not null default '{}'::jsonb,
  status text not null default 'sin_verificar'
    check (status in ('sin_verificar','ok','credenciales_invalidas','error')),
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_store_shipping_providers unique (store_id, provider)
);

create index if not exists idx_store_shipping_providers_store on store_shipping_providers(store_id, activo);

-- -----------------------------------------------------------------------------
-- 2.6 Cotizaciones Guardadas en Servidor (shipping_quotes)
-- -----------------------------------------------------------------------------
create table if not exists shipping_quotes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  codigo_postal text not null,
  cart_hash text not null,         -- sha256(items validados + cantidades + cp)
  options jsonb not null,          -- [{id, provider, service, modalidad, precio, plazo_dias, sucursal?}]
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_shipping_quotes_lookup on shipping_quotes(store_id, cart_hash);
create index if not exists idx_shipping_quotes_expiry on shipping_quotes(expires_at);

-- -----------------------------------------------------------------------------
-- 2.7 Envíos / Despachos (shipments)
-- Regla de idempotencia: idempotency_key usa formato versionado 'order:<id>:1', 'order:<id>:2'
-- Regla de auditoría: raw NUNCA guarda credenciales ni tokens de autorización
-- -----------------------------------------------------------------------------
create table if not exists shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  provider text not null,
  provider_shipment_id text,
  service_code text,
  modalidad text not null,
  sucursal jsonb,
  costo_cotizado numeric(12,2) not null default 0,
  costo_real numeric(12,2),
  tracking_number text,
  tracking_url text,
  label_path text,                 -- Ruta en bucket privado 'shipping-labels'
  estado text not null default 'pendiente'
    check (estado in ('pendiente','creando','creado','etiquetado','despachado','en_camino','entregado','incidencia','cancelado','error')),
  error_message text,
  attempts int not null default 0,
  next_retry_at timestamptz,
  idempotency_key text not null unique,   -- 'order:<order_id>:1', 'order:<order_id>:2'
  raw jsonb,                       -- Payload de respuesta sanitizado (sin auth headers ni tokens)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Solo un envío activo por pedido (los cancelados no bloquean reintentos)
create unique index if not exists shipments_one_active_per_order
  on shipments(order_id) where estado <> 'cancelado';
create index if not exists idx_shipments_store_estado on shipments(store_id, estado);
create index if not exists idx_shipments_retry on shipments(next_retry_at) where estado in ('pendiente','error');

-- -----------------------------------------------------------------------------
-- 2.8 Eventos de Trazabilidad Logística (shipment_events)
-- -----------------------------------------------------------------------------
create table if not exists shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  provider_event_id text,
  estado text not null,
  descripcion text,
  ocurrido_at timestamptz not null default now(),
  source text not null check (source in ('webhook','poll','manual','system')),
  raw jsonb,
  constraint uq_shipment_events_provider unique (shipment_id, provider_event_id)
);

create index if not exists idx_shipment_events_shipment on shipment_events(shipment_id, ocurrido_at desc);

-- -----------------------------------------------------------------------------
-- 2.9 Historial y Auditoría de Estados de Pedidos (order_events)
-- -----------------------------------------------------------------------------
create table if not exists order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  tipo text not null check (tipo in ('estado_pedido','estado_pago','envio')),
  de text,
  a text,
  actor text,                      -- Email de admin, 'comprador', 'webhook' o 'system'
  created_at timestamptz not null default now()
);

create index if not exists idx_order_events_order on order_events(order_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 2.10 Bucket Privado para Etiquetas de Envíos
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('shipping-labels', 'shipping-labels', false)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2.11 Vista Pública STORES_PUBLIC (Protección estricta de datos sensibles)
-- Se exponen solo flags públicos para el carrito (envios_activo, etc.)
-- y se EXCLUYEN estrictamente origen_*, CUIT, teléfono de taller, emails privados.
-- -----------------------------------------------------------------------------
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
  -- Flags públicos de envíos requeridos por el storefront / carrito.
  -- Deben ir AL FINAL: CREATE OR REPLACE VIEW solo permite agregar columnas después de las existentes.
  envios_activo,
  envio_retiro_local_activo,
  envio_gratis_desde
from stores;

grant select on public.stores_public to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2.12 Políticas RLS y Permisos (GRANTs de Supabase)
-- -----------------------------------------------------------------------------

-- 1. store_shipping_providers (Solo accesible por service_role)
alter table store_shipping_providers enable row level security;
revoke all on store_shipping_providers from anon, authenticated;
grant all on store_shipping_providers to service_role;

-- 2. shipping_quotes (Solo accesible por service_role)
alter table shipping_quotes enable row level security;
revoke all on shipping_quotes from anon, authenticated;
grant all on shipping_quotes to service_role;

-- 3. shipments (SELECT para admin de tienda y superadmin; escrituras exclusivas de service_role)
alter table shipments enable row level security;
revoke insert, update, delete on shipments from anon, authenticated;
grant select on shipments to authenticated;
grant all on shipments to service_role;

drop policy if exists "admin_read_shipments" on shipments;
create policy "admin_read_shipments" on shipments for select
  using (
    is_platform_admin()
    or lower(coalesce(auth.jwt() ->> 'email', '')) = lower((select admin_email from stores where id = shipments.store_id))
  );

-- 4. shipment_events (SELECT para admin de tienda y superadmin; escrituras exclusivas de service_role)
alter table shipment_events enable row level security;
revoke insert, update, delete on shipment_events from anon, authenticated;
grant select on shipment_events to authenticated;
grant all on shipment_events to service_role;

drop policy if exists "admin_read_shipment_events" on shipment_events;
create policy "admin_read_shipment_events" on shipment_events for select
  using (
    is_platform_admin()
    or lower(coalesce(auth.jwt() ->> 'email', '')) = lower((select admin_email from stores where id = shipment_events.store_id))
  );

-- 5. order_events (SELECT para admin de tienda y superadmin; escrituras exclusivas de service_role)
alter table order_events enable row level security;
revoke insert, update, delete on order_events from anon, authenticated;
grant select on order_events to authenticated;
grant all on order_events to service_role;

drop policy if exists "admin_read_order_events" on order_events;
create policy "admin_read_order_events" on order_events for select
  using (
    is_platform_admin()
    or lower(coalesce(auth.jwt() ->> 'email', '')) = lower((select admin_email from stores where id = order_events.store_id))
  );
