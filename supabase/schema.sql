-- =============================================================================
-- PORTALMAKER — Schema completo de base de datos
-- "El portal del Maker" | portalmaker.com.ar
--
-- INSTRUCCIONES DE USO:
--   1. Crear un proyecto nuevo en Supabase
--   2. Ir a SQL Editor → New query
--   3. Pegar este script completo y ejecutar
--   4. Luego ejecutar supabase/seed.sql para los datos iniciales
--
-- IMPORTANTE (política de GRANTs de Supabase):
--   Toda tabla nueva en el schema 'public' requiere GRANTs explícitos para
--   ser accesible via Data API (supabase-js). Sin esto, las queries retornan
--   error 42501. Este script incluye los GRANTs al final de cada tabla.
--
-- Versión: consolidada v3→v10 + features adicionales del catálogo
-- =============================================================================


-- =============================================================================
-- EXTENSIONES REQUERIDAS
-- =============================================================================
create extension if not exists "uuid-ossp";  -- para gen_random_uuid() (ya incluida por default en Supabase)


-- =============================================================================
-- 1. PROCESS_TYPES
--    Clasificador global de tipos de proceso maker (impresión 3D, laser, etc.)
--    Es compartido por toda la plataforma, no pertenece a ninguna tienda.
-- =============================================================================
create table process_types (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique,  -- "Impresión 3D", "Grabado Láser", etc.
  slug   text not null unique,  -- "impresion-3d", "grabado-laser", etc. (para URLs y filtros)
  orden  int  default 0         -- para ordenar en la UI del filtro de catálogo
);

-- RLS: cualquiera puede leer, nadie desde el frontend puede escribir (se gestiona desde SQL)
alter table process_types enable row level security;
create policy "public_read_process_types" on process_types for select using (true);

-- GRANTs para Data API de Supabase
grant select on process_types to anon, authenticated;


-- =============================================================================
-- 2. PLATFORM_ADMINS
--    Developer / superadmin de la plataforma (el dueño de Portalmaker).
--    A futuro puede haber más de uno (equipo interno).
-- =============================================================================
create table platform_admins (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null unique,  -- debe coincidir con el JWT de Google OAuth
  created_at timestamptz default now()
);

-- Función helper para verificar si el usuario logueado es platform_admin.
-- Se usa en las RLS policies de múltiples tablas.
-- security definer: ejecuta con los permisos del creador (bypass de RLS en platform_admins)
create or replace function is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable  -- no modifica datos, puede ser cacheada por el planificador de queries
as $$
  select exists (
    select 1
    from platform_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- RLS: solo un platform_admin puede ver/modificar esta tabla
alter table platform_admins enable row level security;
create policy "platform_admin_manage_admins" on platform_admins for all
  using (is_platform_admin());

-- GRANTs
grant select, insert, update, delete on platform_admins to authenticated;


-- =============================================================================
-- 3. STORES
--    Tabla central del sistema. Cada fila = una tienda maker.
--    Contiene branding, configuración, suscripción y todos los campos
--    que personalizan la experiencia del comprador.
-- =============================================================================
create table stores (
  -- Identidad
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,                   -- nombre público de la tienda
  slug          text not null unique,             -- subdominio: tecmaker → tecmaker.portalmaker.com.ar
  custom_domain text unique,                      -- dominio propio: tecmaker3d.com.ar (opcional)
  custom_domain_verified boolean default false,   -- validado para orígenes seguros de Checkout Pro
  admin_email   text not null unique,             -- email del dueño (validado contra JWT de Google OAuth)

  -- Operación
  modo_operacion   text    default 'vitrina'      -- 'vitrina' = solo catálogo | 'tienda' = con checkout
    check (modo_operacion in ('vitrina', 'tienda')),
  checkout_activo  boolean default false,         -- habilita el carrito y checkout (se activa por plan)
  whatsapp_numero  text,                          -- número para consultas (sin +, sin espacios: "5491123456789")

  -- Suscripción (gestionada solo por el developer desde /dashboard/admin)
  plan                        text    default 'free', -- 'free' | 'starter' | 'maker_pro' | 'enterprise' | 'bonificado'
  precio_mensual              numeric(10,2) default 0,    -- valor mensual pactado
  estado_pago                 text    default 'al_dia',    -- 'al_dia' | 'pendiente' | 'bonificado' | 'gracia' | 'vencido'
  limite_productos            int     default 15,           -- límite máximo de productos según el plan
  features_override           jsonb   default '{}'::jsonb, -- personalización explícita de módulos y límites del superadmin
  notas_admin                 text,                        -- notas internas del superadmin
  suscripcion_activa          boolean default true,
  fecha_inicio_suscripcion    date    default current_date,
  fecha_proximo_vencimiento   date,
  dias_gracia                 int     default 3,  -- días extra luego del vencimiento antes de desactivar

  -- Branding — Logo y elementos visuales
  logo_url       text,   -- versión completa del logo (con texto)
  icono_url      text,   -- versión compacta (solo símbolo, para header móvil colapsado)
  favicon_url    text,   -- ícono de la pestaña del navegador
  hero_banner_url text,  -- imagen principal del home (se complementa con tabla banners)
  banners_activo  boolean default false, -- habilita carrusel de banners promocionales
  slogan         text,   -- texto corto bajo el logo
  logo_tamano    text    default 'mediano', -- 'chico' | 'mediano' | 'grande' | 'xl'
  mostrar_nombre_header boolean default true, -- si se muestra el nombre escrito junto al logo en el header

  -- Branding — Paleta de colores (modo claro)
  -- Si el admin elige un preset, se completan los 8 campos (claro + oscuro).
  -- Si usa el color picker libre, solo se completan los 4 claros y el oscuro
  -- se calcula automáticamente con el algoritmo de contraste WCAG AA (4.5:1).
  color_primario   text default '#6B8F71',  -- acento, botones
  color_secundario text default '#2F3336',  -- elementos secundarios
  color_fondo      text default '#F5F4F1',  -- fondo de página
  color_texto      text default '#202224',  -- texto principal

  -- Branding — Paleta de colores (modo oscuro, nullable = se calcula automáticamente)
  color_primario_dark   text,
  color_secundario_dark text,
  color_fondo_dark      text,
  color_texto_dark      text,

  -- Branding — Tema por defecto del visitante
  tema_por_defecto text default 'sistema'   -- 'claro' | 'oscuro' | 'sistema' (respeta OS)
    check (tema_por_defecto in ('claro', 'oscuro', 'sistema')),

  -- Branding — Tipografía (fuentes de Google Fonts predefinidas)
  font_heading text default 'Inter',  -- fuente para títulos
  font_body    text default 'Inter',  -- fuente para cuerpo de texto

  -- Redes sociales y contacto
  instagram_url    text,
  facebook_url     text,
  tiktok_url       text,
  email_contacto   text,
  horario_atencion text,  -- texto libre: "Lun a Vie 9-18hs"
  mostrar_horarios boolean not null default false,
  horarios_semanales jsonb,
  direccion        text,  -- dirección física del taller (para página de contacto)

  -- SEO y analítica (para el <head> de la tienda)
  meta_title           text,   -- título para Google (si está vacío, se usa `nombre`)
  meta_description     text,   -- descripción para Google y redes sociales
  ga_measurement_id    text,   -- Google Analytics (se inyecta automáticamente si está cargado)
  meta_pixel_id        text,   -- Meta Pixel (idem)
  google_maps_embed_url text,  -- URL de embed de Maps para la página de Contacto

  -- Cobros y Transferencia Bancaria (opcional para el checkout)
  transferencia_activa        boolean default false,
  transferencia_alias         text,
  transferencia_cbu_cvu       text,
  transferencia_banco         text,
  transferencia_titular       text,
  transferencia_cuit          text,
  transferencia_instrucciones text,

  -- Integración Mercado Pago (Marketplace OAuth y Split de pagos)
  mp_connected          boolean default false,
  mp_recargo_porcentaje numeric(5,2) default 0.00
    check (mp_recargo_porcentaje >= 0.00 and mp_recargo_porcentaje <= 15.00), -- recargo opcional que la tienda aplica si pagan con MP (máx 15%)
  comision_portalmaker  numeric(5,2) default 0.00
    check (comision_portalmaker >= 0.00 and comision_portalmaker < 100.00),  -- % de comisión que retiene Portalmaker por cada venta

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices para búsqueda rápida de tienda por dominio (el middleware los usa en cada request)
create index idx_stores_slug   on stores(slug);
create index idx_stores_domain on stores(custom_domain);

-- RLS
alter table stores enable row level security;

-- Solo el dueño, platform_admin o backend service_role pueden leer la fila completa de stores (G3)
create policy "owner_admin_read_stores" on stores for select
  using (
    is_platform_admin()
    or lower(admin_email) = lower(coalesce(auth.jwt()->>'email', ''))
    or current_user in ('service_role', 'postgres', 'supabase_admin')
    or (auth.jwt() ->> 'role') = 'service_role'
  );

-- Solo el admin de la tienda o el platform_admin puede actualizar sus datos (J2)
create policy "admin_write_stores" on stores for update
  using (
    is_platform_admin()
    or lower(admin_email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

-- Solo el platform_admin puede crear tiendas (el maker no se registra solo, lo hace el developer)
create policy "platform_admin_insert_stores" on stores for insert
  with check (is_platform_admin());

-- GRANTs
grant select, update on stores to authenticated;
grant all on stores to service_role;

-- -----------------------------------------------------------------------------
-- STORES_PUBLIC (Vista pública para visitantes y compradores de tiendas)
-- Expone exclusivamente los datos de vitrina y branding. Excluye datos bancarios y PII.
-- -----------------------------------------------------------------------------
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
  horarios_semanales,
  features_override
from stores;

grant select on stores_public to anon, authenticated, service_role;


-- =============================================================================
-- 4. CATEGORIES
--    Categorías de productos de cada tienda. Las define libremente el maker.
--    Soporta subcategorías (parent_id). Independiente de process_types.
-- =============================================================================
create table categories (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  parent_id   uuid references categories(id) on delete set null,  -- null = categoría raíz

  nombre      text not null,
  slug        text not null,   -- para URLs: "llaveros", "decoracion-hogar"
  descripcion text,
  imagen_url  text,

  -- SEO
  meta_title       text,
  meta_description text,

  visible boolean default true,
  orden   int     default 0,   -- para reordenar desde el admin

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Un slug debe ser único dentro de la misma tienda
  unique (store_id, slug)
);

create index idx_categories_store on categories(store_id, visible, orden);

alter table categories enable row level security;
create policy "public_read_categories" on categories for select using (visible = true);
create policy "admin_all_categories" on categories for all
  using (
    auth.jwt() ->> 'email' = (select admin_email from stores where id = categories.store_id)
    or is_platform_admin()
  );

grant select on categories to anon, authenticated;
grant insert, update, delete on categories to authenticated;


-- =============================================================================
-- 5. PRODUCTS
--    Catálogo de productos de cada tienda. Tabla central del sistema de venta.
--    Separada en dos niveles:
--      - products: datos básicos y obligatorios (siempre se cargan)
--      - product_details: ficha extendida y opcional (ver tabla 6)
-- =============================================================================
create table products (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,

  -- Clasificación por tipo de proceso maker (impresión 3D, grabado, etc.)
  -- Independiente de la categoría: un producto puede ser "Llavero" (categoría) e "Impresión 3D" (proceso)
  process_type_id uuid references process_types(id) on delete set null,

  -- Datos básicos (formulario principal del admin)
  nombre      text not null,
  slug        text not null,          -- para URLs: "llavero-personalizado"
  descripcion text,
  imagenes    text[] default '{}',    -- array de URLs de Supabase Storage

  -- Precios
  precio_base   numeric(10,2) not null,                  -- precio de venta público
  precio_costo  numeric(10,2),                            -- precio de costo (solo visible para el admin, nunca al comprador)
  precio_oferta numeric(10,2),                            -- precio con descuento
  oferta_activa boolean default false,                    -- si true, muestra precio tachado + precio_oferta

  -- Identificadores internos
  sku             text,   -- código de producto (para integraciones externas)
  codigo_interno  text,   -- referencia interna del maker (uso libre, no se muestra al comprador)

  -- Control de stock
  -- gestiona_stock = false → "bajo pedido", sin límite de unidades
  -- gestiona_stock = true  → controla unidades (en products.stock o en product_variants.stock)
  gestiona_stock boolean default false,
  stock          int,                  -- solo aplica si gestiona_stock = true Y el producto NO tiene variantes
  stock_minimo   int     default 0,   -- umbral para alerta de "bajo stock" en el dashboard

  -- Info de producción (útil para impresión 3D y fabricación a medida)
  tiempo_fabricacion_estimado text,   -- texto libre: "3-5 días hábiles"

  -- Visibilidad y ordenamiento
  visible    boolean default true,
  destacado  boolean default false,   -- para mostrar en la sección "destacados" del home
  orden      int     default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique (store_id, slug)
);

create index idx_products_store    on products(store_id, visible, orden);
create index idx_products_category on products(category_id);
create index idx_products_process  on products(process_type_id);

alter table products enable row level security;
create policy "public_read_products" on products for select using (visible = true);
create policy "admin_all_products" on products for all
  using (
    auth.jwt() ->> 'email' = (select admin_email from stores where id = products.store_id)
    or is_platform_admin()
  );

grant select on products to anon, authenticated;
grant insert, update, delete on products to authenticated;


-- =============================================================================
-- 6. PRODUCT_VARIANTS
--    Variantes de un producto (color, material, tamaño, etc.).
--    Cada variante puede tener su propio precio adicional y stock.
--    Regla: si el producto tiene variantes, el stock se controla POR variante
--    (products.stock queda sin uso en ese caso).
-- =============================================================================
create table product_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,

  nombre          text not null,              -- descripción compuesta: "Rojo / PLA / Grande"
  precio_adicional numeric(10,2) default 0,  -- se suma al precio_base del producto
  stock           int,                         -- unidades disponibles (si gestiona_stock = true)
  stock_minimo    int default 0,              -- umbral de alerta de bajo stock
  imagen_url      text,                        -- imagen principal de esta variante (opcional)
  imagenes        text[] default '{}'::text[], -- múltiples imágenes de esta variante (estilo Mercado Libre)

  activo boolean default true,
  orden  int     default 0,

  created_at timestamptz default now()
);

create index idx_variants_product on product_variants(product_id, activo);

alter table product_variants enable row level security;
create policy "public_read_variants" on product_variants for select using (activo = true);
create policy "admin_all_variants" on product_variants for all
  using (
    auth.jwt() ->> 'email' = (
      select s.admin_email from stores s
      join products p on p.store_id = s.id
      where p.id = product_variants.product_id
    )
    or is_platform_admin()
  );

grant select on product_variants to anon, authenticated;
grant insert, update, delete on product_variants to authenticated;


-- =============================================================================
-- 7. PRODUCT_DETAILS
--    Ficha extendida de producto (relación 1:1, opcional).
--    Se separó de products para mantener claro qué es "básico y obligatorio"
--    vs "ficha completa y opcional". En el admin son dos formularios distintos.
--    Por qué jsonb para ficha_tecnica: cada rubro maker tiene atributos técnicos
--    distintos. Esto permite "Tiempo de impresión: 3hs" para un producto y
--    "Espesor de acrílico: 5mm" para otro sin tocar el schema.
-- =============================================================================
create table product_details (
  product_id uuid primary key references products(id) on delete cascade,

  -- Atributos físicos
  marca         text,
  peso_kg       numeric(6,3),
  alto_cm       numeric(6,2),
  ancho_cm      numeric(6,2),
  profundidad_cm numeric(6,2),

  -- Ficha técnica flexible: [{clave: "Material", valor: "PLA"}, ...]
  ficha_tecnica jsonb default '[]',

  -- Información extra
  garantia_texto text,
  video_url      text,     -- URL de YouTube/Vimeo del producto en acción
  tags           text[],   -- para búsqueda y filtros futuros: {"regalo","personalizado"}

  -- SEO específico del producto (si está vacío, se usan los datos base del producto)
  meta_title       text,
  meta_description text,

  -- Productos relacionados (IDs de otros products de la misma tienda)
  -- Se muestran al final de la página de producto como "También te puede interesar"
  productos_relacionados uuid[] default '{}',

  -- Preguntas Frecuentes específicas del producto (FAQ)
  preguntas_frecuentes   jsonb default '[]'::jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table product_details enable row level security;
create policy "public_read_product_details" on product_details for select using (true);
create policy "admin_all_product_details" on product_details for all
  using (
    auth.jwt() ->> 'email' = (
      select s.admin_email from stores s
      join products p on p.store_id = s.id
      where p.id = product_details.product_id
    )
    or is_platform_admin()
  );

grant select on product_details to anon, authenticated;
grant insert, update, delete on product_details to authenticated;


-- =============================================================================
-- 8. ORDERS
--    Pedidos recibidos por cada tienda.
--    orders.items (jsonb) es la "foto" inmutable del pedido: guarda nombre,
--    precio y variante TAL CUAL eran cuando se realizó la compra, aunque
--    después el admin cambie precios o borre productos.
--    order_items (tabla 15) es la versión relacional para hacer consultas SQL rápidas.
-- =============================================================================
create table orders (
  id       uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,

  -- Datos del comprador (sin cuenta de usuario — flujo sin fricción)
  nombre_comprador   text,
  email_comprador    text,
  telefono_comprador text,
  direccion_entrega  text,

  -- Snapshot inmutable del pedido al momento de la compra
  -- Formato: [{ product_id, nombre, variante, cantidad, precio_unitario, subtotal }, ...]
  items jsonb not null default '[]',

  -- Totales
  total         numeric(10,2) not null,
  costo_envio   numeric(10,2) default 0,

  -- Estado del pedido: flujo de producción
  -- nuevo → en_produccion → despachado → entregado | cancelado
  estado_pedido text default 'nuevo'
    check (estado_pedido in ('nuevo', 'en_produccion', 'despachado', 'entregado', 'cancelado')),

  -- Estado del pago
  estado_pago text default 'pendiente'
    check (estado_pago in ('pendiente', 'aprobado', 'rechazado', 'revision', 'reembolsado', 'contracargo')),

  -- Método de pago elegido por el comprador
  metodo_pago text,  -- 'mercadopago' | 'transferencia' | 'efectivo' | 'acordar'

  -- Tipo de entrega
  tipo_entrega text default 'acordar', -- 'acordar' | 'retiro' | 'envio'

  -- Control de stock
  stock_descontado boolean default false, -- true cuando el admin confirma y se descuenta del inventario

  -- Token público seguro para acceso del comprador tras checkout (P1)
  public_token text not null default gen_random_uuid()::text,

  -- Referencia a la zona de envío elegida
  zona_envio_id uuid,  -- FK a shipping_zones (se agrega como ALTER luego de crear esa tabla)

  -- Notas del comprador (campo libre en el checkout)
  notas text,

  -- Integración Mercado Pago
  mp_preference_id         text,
  mp_init_point            text,
  mp_payment_id            text,
  mp_merchant_order_id     text,
  mp_fee_portalmaker       numeric(10,2) default 0.00,
  mp_net_received          numeric(10,2) default 0.00,
  comision_portalmaker_pct numeric(5,2)  default 0.00,
  mp_recargo_pct           numeric(5,2)  default 0.00,

  -- Observaciones internas del admin (solo visibles para el dueño de la tienda)
  observaciones_admin text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_orders_store on orders(store_id, estado_pedido, created_at desc);
create unique index idx_orders_public_token on orders(public_token);

alter table orders enable row level security;
-- Solo el admin de la tienda o el platform_admin puede administrar pedidos (J2: lower())
create policy "admin_all_orders" on orders for all
  using (
    is_platform_admin()
    or lower(coalesce(auth.jwt() ->> 'email', '')) = lower((select admin_email from stores where id = orders.store_id))
  );

-- O3: Eliminada la política "public_insert_orders" y revocado DELETE (pedidos no se borran)
revoke insert, update, delete on orders from anon;
revoke insert, delete on orders from authenticated;
grant select, update on orders to authenticated;
grant all on orders to service_role;


-- =============================================================================
-- 9. STORE_PAGES
--    Páginas informativas configurables por el maker (sin hardcodear una columna
--    por página). Una fila = una página. El slug es la URL.
--    Páginas que se precargan por defecto al crear una tienda:
--      contacto | sobre-nosotros | preguntas-frecuentes | envios-y-devoluciones | terminos-y-condiciones
-- =============================================================================
create table store_pages (
  id       uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,

  slug     text not null,   -- determina la URL: /contacto, /sobre-nosotros, etc.
  titulo   text not null,
  contenido text,           -- rich text en formato HTML (generado por el editor WYSIWYG)

  visible boolean default true,
  orden   int     default 0,  -- para ordenar en el menú de navegación

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique (store_id, slug)
);

create index idx_storepages_store on store_pages(store_id, visible, orden);

alter table store_pages enable row level security;
create policy "public_read_store_pages" on store_pages for select using (visible = true);
create policy "admin_all_store_pages" on store_pages for all
  using (
    auth.jwt() ->> 'email' = (select admin_email from stores where id = store_pages.store_id)
    or is_platform_admin()
  );

grant select on store_pages to anon, authenticated;
grant insert, update, delete on store_pages to authenticated;


-- =============================================================================
-- 10. PORTFOLIO
--     Galería de trabajos realizados por el maker. Se muestra en la tienda
--     pública como prueba social de su trabajo (más curado que reviews abiertas).
--     El admin decide qué mostrar — no es abierto al público como sección de reviews.
-- =============================================================================
create table portfolio (
  id       uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,

  imagen_url  text not null,
  titulo      text,
  descripcion text,

  visible boolean default true,
  orden   int     default 0,

  created_at timestamptz default now()
);

create index idx_portfolio_store on portfolio(store_id, visible, orden);

alter table portfolio enable row level security;
create policy "public_read_portfolio" on portfolio for select using (visible = true);
create policy "admin_all_portfolio" on portfolio for all
  using (
    auth.jwt() ->> 'email' = (select admin_email from stores where id = portfolio.store_id)
    or is_platform_admin()
  );

grant select on portfolio to anon, authenticated;
grant insert, update, delete on portfolio to authenticated;


-- =============================================================================
-- 11. BANNERS
--     Banners promocionales múltiples con vigencia por fecha.
--     Complementa al hero_banner_url estático de stores.
--     El admin puede programar banners para una campaña y que se activen/desactiven solos.
-- =============================================================================
create table banners (
  id       uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,

  imagen_url text not null,
  video_url  text,      -- si existe, se muestra el video en lugar de la imagen
  titulo     text,
  cta_texto  text,      -- texto del botón: "Ver colección", "Comprar ahora", etc.
  cta_url    text,      -- URL destino del botón

  orden      int     default 0,
  activo     boolean default true,
  fecha_desde date,    -- si se completan, el banner solo se muestra en ese rango
  fecha_hasta date,

  created_at timestamptz default now()
);

create index idx_banners_store on banners(store_id, activo);

alter table banners enable row level security;
-- El comprador ve solo los banners activos y dentro del rango de fechas
create policy "public_read_banners" on banners for select
  using (
    activo = true
    and (fecha_desde is null or fecha_desde <= current_date)
    and (fecha_hasta is null or fecha_hasta >= current_date)
  );
create policy "admin_all_banners" on banners for all
  using (
    auth.jwt() ->> 'email' = (select admin_email from stores where id = banners.store_id)
    or is_platform_admin()
  );

grant select on banners to anon, authenticated;
grant insert, update, delete on banners to authenticated;


-- =============================================================================
-- 12. SHIPPING_ZONES
--     Zonas de envío con tarifa fija, sin integración de courier API.
--     El admin define sus propias zonas (CABA, GBA zona 1, Interior, Retiro en local)
--     con precios fijos. Para integraciones con Correo Argentino/Andreani → backlog.
-- =============================================================================
create table shipping_zones (
  id       uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,

  nombre text not null,             -- "CABA", "GBA Zona 1", "Retiro en local"
  precio numeric(10,2) not null default 0,  -- 0 para retiro en local o envío gratis

  activo boolean default true,
  orden  int     default 0,

  created_at timestamptz default now()
);

-- Ahora que shipping_zones existe, agregamos la FK a orders
alter table orders
  add constraint orders_zona_envio_fkey
  foreign key (zona_envio_id) references shipping_zones(id) on delete set null;

create index idx_shipping_zones_store on shipping_zones(store_id, activo);

alter table shipping_zones enable row level security;
create policy "public_read_shipping_zones" on shipping_zones for select using (activo = true);
create policy "admin_all_shipping_zones" on shipping_zones for all
  using (
    auth.jwt() ->> 'email' = (select admin_email from stores where id = shipping_zones.store_id)
    or is_platform_admin()
  );

grant select on shipping_zones to anon, authenticated;
grant insert, update, delete on shipping_zones to authenticated;


-- =============================================================================
-- 13. SUBSCRIPTION_PAYMENTS
--     Historial de pagos de suscripción de cada tienda.
--     Solo el developer/platform_admin registra pagos desde /dashboard/admin.
--     El maker puede ver su propio historial desde /admin/suscripcion (solo lectura).
--     El trigger actualiza automáticamente fecha_proximo_vencimiento en stores.
-- =============================================================================
create table subscription_payments (
  id       uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,

  monto          numeric(10,2) not null,
  metodo_pago    text,          -- texto libre: "transferencia", "efectivo", "mercadopago"
  periodo_desde  date not null,
  periodo_hasta  date not null,
  fecha_pago     date not null default current_date,
  comprobante_url text,         -- URL en Supabase Storage (opcional, el developer adjunta si quiere)
  registrado_por  text,         -- email del platform_admin que cargó el pago
  notas          text,

  created_at timestamptz default now()
);

create index idx_subpayments_store on subscription_payments(store_id, fecha_pago desc);

-- Trigger: al registrar un pago, actualizar la fecha de vencimiento y reactivar la tienda
create or replace function actualizar_vencimiento_suscripcion()
returns trigger
language plpgsql
as $$
begin
  update stores
  set
    fecha_proximo_vencimiento = new.periodo_hasta,
    suscripcion_activa = true,  -- reactivar si estaba desactivada por vencimiento
    updated_at = now()
  where id = new.store_id;
  return new;
end;
$$;

create trigger trg_actualizar_vencimiento
  after insert on subscription_payments
  for each row execute function actualizar_vencimiento_suscripcion();

alter table subscription_payments enable row level security;

-- El admin de la tienda ve SU historial de pagos (no puede insertar ni editar)
-- El platform_admin ve todo e inserta/edita
create policy "read_own_subscription_payments" on subscription_payments for select
  using (
    auth.jwt() ->> 'email' = (select admin_email from stores where id = subscription_payments.store_id)
    or is_platform_admin()
  );
create policy "platform_admin_insert_payments" on subscription_payments for insert
  with check (is_platform_admin());
create policy "platform_admin_update_payments" on subscription_payments for update
  using (is_platform_admin());

grant select on subscription_payments to authenticated;
grant insert, update on subscription_payments to authenticated;


-- =============================================================================
-- 14. STOCK_MOVEMENTS
--     Trazabilidad de entradas, salidas y ajustes de stock.
--     "venta" se genera automáticamente al aprobar un pedido.
--     "entrada", "salida", "ajuste" los carga manualmente el admin desde /admin/inventario.
--     Así el admin entiende "por qué" bajó el stock, no solo el número final.
-- =============================================================================
create table stock_movements (
  id       uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete cascade,  -- null si sin variantes

  tipo     text not null
    check (tipo in ('entrada', 'salida', 'ajuste', 'venta')),
  cantidad int  not null,   -- positivo en entrada, negativo en salida/venta

  motivo          text,    -- "Reposición", "Rotura", "Venta #123", etc.
  registrado_por  text,    -- email del admin (null si es automático por venta)
  order_id        uuid references orders(id) on delete set null,  -- solo en tipo 'venta'

  created_at timestamptz default now()
);

create index idx_stockmov_product on stock_movements(product_id, created_at desc);
create index idx_stockmov_store   on stock_movements(store_id, created_at desc);

alter table stock_movements enable row level security;
create policy "admin_all_stock_movements" on stock_movements for all
  using (
    auth.jwt() ->> 'email' = (select admin_email from stores where id = stock_movements.store_id)
    or is_platform_admin()
  );
-- Permite inserción automática desde server-side al aprobar pedidos
create policy "system_insert_stock_movements" on stock_movements for insert with check (true);

grant select on stock_movements to authenticated;
grant insert on stock_movements to anon, authenticated;


-- =============================================================================
-- 15. ORDER_ITEMS
--     Versión relacional de orders.items (jsonb) para consultas SQL rápidas.
--     Por qué ambas:
--       - orders.items = comprobante inmutable (nombre y precio al momento de la compra)
--       - order_items = tabla para hacer "top productos por ventas" sin parsear JSON
--     Se cargan ambas al confirmar un pedido, en la misma operación.
-- =============================================================================
create table order_items (
  id       uuid primary key default gen_random_uuid(),
  order_id  uuid not null references orders(id) on delete cascade,
  store_id  uuid not null references stores(id) on delete cascade,
  product_id uuid references products(id) on delete set null,  -- null si el producto fue borrado

  cantidad       int            not null,
  precio_unitario numeric(10,2) not null,
  subtotal        numeric(10,2) not null,

  created_at timestamptz default now()
);

create index idx_orderitems_product on order_items(product_id, created_at desc);
create index idx_orderitems_store   on order_items(store_id, created_at desc);

alter table order_items enable row level security;
create policy "admin_read_order_items" on order_items for select
  using (
    auth.jwt() ->> 'email' = (select admin_email from stores where id = order_items.store_id)
    or is_platform_admin()
  );
create policy "system_insert_order_items" on order_items for insert with check (true);

grant select on order_items to authenticated;
grant insert on order_items to anon, authenticated;


-- =============================================================================
-- 16. BANNERS
--     Banners promocionales y carrusel de novedades debajo del header.
--     Hasta 3 slides con imagen, título, texto CTA y enlace a producto/categoría.
-- =============================================================================
create table banners (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,

  imagen_url  text not null,
  video_url   text,
  titulo      text,
  subtitulo   text,
  cta_texto   text,         -- ej: "Ver Producto", "Ver Ofertas", "Comprar Ahora"
  cta_url     text,         -- ej: "/tienda/productos/slug" o "/tienda?cat=slug"
  orden       int default 0,
  activo      boolean default true,

  fecha_desde timestamptz,
  fecha_hasta timestamptz,

  created_at  timestamptz default now()
);

create index idx_banners_store on banners(store_id, orden, activo);

alter table banners enable row level security;
create policy "public_read_banners" on banners for select using (activo = true);
create policy "admin_all_banners" on banners for all
  using (
    auth.jwt() ->> 'email' = (select admin_email from stores where id = banners.store_id)
    or is_platform_admin()
  );

grant select on banners to anon, authenticated;
grant insert, update, delete on banners to authenticated;


-- =============================================================================
-- 17. STORE_SECTIONS
--     Arquitectura extensible de secciones de storefront por tienda:
--     top_bar, header, navbar, hero, etc.
-- =============================================================================
create table store_sections (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores(id) on delete cascade,
  section_type text not null,
  enabled      boolean default true,
  orden        int default 0,
  settings     jsonb default '{}'::jsonb,
  content      jsonb default '[]'::jsonb,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),

  constraint uq_store_section unique(store_id, section_type)
);

create index idx_store_sections_store on store_sections(store_id, orden);

alter table store_sections enable row level security;
create policy "public_read_sections" on store_sections for select using (true);
create policy "admin_all_sections" on store_sections for all
  using (
    auth.jwt() ->> 'email' = (select admin_email from stores where id = store_sections.store_id)
    or is_platform_admin()
  );

grant select on store_sections to anon, authenticated;
grant insert, update, delete on store_sections to authenticated;


-- =============================================================================
-- 16. PRODUCT_VIEWS
--     Log de vistas para métricas de "más vistos" en el dashboard.
--     Se inserta desde una server action al cargar la página de producto.
--     - Fire-and-forget: no bloquea el render de la página.
--     - Sin deduplicar por sesión en esta versión (métrica aproximada = suficiente).
--     - Se excluyen las visitas del propio admin (la RLS policy lo maneja).
-- =============================================================================
create table product_views (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references stores(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz default now()
);

create index idx_productviews_product on product_views(product_id, created_at desc);
create index idx_productviews_store   on product_views(store_id, created_at desc);

alter table product_views enable row level security;
-- Solo el admin puede leer el historial de vistas de su tienda
create policy "admin_read_product_views" on product_views for select
  using (
    auth.jwt() ->> 'email' = (select admin_email from stores where id = product_views.store_id)
    or is_platform_admin()
  );
-- El comprador puede insertar (sin login), EXCEPTO si es el propio admin.
-- La exclusión se hace a nivel de aplicación (server action verifica el JWT antes de insertar).
create policy "public_insert_product_views" on product_views for insert with check (true);

grant select on product_views to authenticated;
grant insert on product_views to anon, authenticated;


-- =============================================================================
-- 17. AUDIT_LOG
--     Registro genérico de acciones de escritura del admin.
--     Se inserta automáticamente desde la aplicación cada vez que el admin
--     crea, edita, elimina o cambia estado de un producto, categoría, banner,
--     página informativa, etc.
-- =============================================================================
create table audit_log (
  id       uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,

  admin_email text not null,
  accion      text not null,   -- "crear" | "editar" | "eliminar" | "activar" | "desactivar"
  entidad     text not null,   -- "producto" | "categoria" | "pagina" | "banner" | etc.
  entidad_id  uuid,            -- ID del registro afectado
  detalle     jsonb,           -- opcional: campos que cambiaron { antes: {}, despues: {} }

  created_at timestamptz default now()
);

create index idx_auditlog_store on audit_log(store_id, created_at desc);

alter table audit_log enable row level security;
create policy "admin_read_audit_log" on audit_log for select
  using (
    auth.jwt() ->> 'email' = (select admin_email from stores where id = audit_log.store_id)
    or is_platform_admin()
  );
-- Inserción desde el server-side de la aplicación (no desde el navegador directamente)
create policy "system_insert_audit_log" on audit_log for insert with check (true);

grant select on audit_log to authenticated;
grant insert on audit_log to anon, authenticated;


-- =============================================================================
-- STORAGE BUCKETS (portalmaker-media y portalmaker-receipts)
-- =============================================================================
insert into storage.buckets (id, name, public)
values 
  ('portalmaker-media', 'portalmaker-media', true),
  ('portalmaker-receipts', 'portalmaker-receipts', false)
on conflict (id) do update set public = excluded.public;

-- Políticas de acceso para portalmaker-media (imágenes públicas de tiendas y productos)
create policy "public_read_media" on storage.objects for select
  using ( bucket_id = 'portalmaker-media' );

-- Escritura solo para dueño/colaborador de la tienda dueña de la carpeta o superadmin
-- (ver supabase/migrations/20261106_security_plan_columns_storage.sql).
-- Nota: depende de is_store_owner / is_store_collaborator, definidas en la migración
-- 20261030_security_rls_hardening.sql.
create or replace function public.can_write_store_media(p_name text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_parts text[] := storage.foldername(p_name);
  v_store text;
begin
  if is_platform_admin() then
    return true;
  end if;

  if v_parts is null or array_length(v_parts, 1) is null then
    return false;
  end if;

  if v_parts[1] = 'tiendas' then
    v_store := v_parts[2];
  else
    v_store := v_parts[1];
  end if;

  -- Validar formato antes del cast para que una ruta arbitraria no genere error.
  if v_store is null or v_store !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;

  return public.is_store_owner(v_store::uuid) or public.is_store_collaborator(v_store::uuid);
end;
$$;

revoke all on function public.can_write_store_media(text) from public, anon;
grant execute on function public.can_write_store_media(text) to authenticated, service_role;

drop policy if exists "authenticated_insert_media" on storage.objects;
drop policy if exists "authenticated_update_media" on storage.objects;
drop policy if exists "authenticated_delete_media" on storage.objects;

create policy "authenticated_insert_media" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'portalmaker-media' and public.can_write_store_media(name));

create policy "authenticated_update_media" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'portalmaker-media' and public.can_write_store_media(name))
  with check (bucket_id = 'portalmaker-media' and public.can_write_store_media(name));

create policy "authenticated_delete_media" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'portalmaker-media' and public.can_write_store_media(name));



-- =============================================================================
-- 20. STORE_COLLABORATORS — Miembros de equipo / Colaboradores de tienda
-- =============================================================================
create table if not exists store_collaborators (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores(id) on delete cascade,
  email        text not null,
  rol          text not null default 'colaborador' check (rol in ('colaborador', 'editor', 'admin')),
  estado       text not null default 'activo' check (estado in ('activo', 'invitado', 'inactivo')),
  invitado_por text,
  created_at   timestamptz default now(),
  unique (store_id, email)
);

create index if not exists idx_store_collaborators_store on store_collaborators(store_id, estado);
alter table store_collaborators enable row level security;
revoke all on store_collaborators from public, anon;
grant select, insert, update, delete on store_collaborators to authenticated, service_role;

create policy "store_collaborators_select" on store_collaborators
  for select to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "store_collaborators_insert" on store_collaborators
  for insert to authenticated
  with check (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_admin_collaborator(store_id)
  );

create policy "store_collaborators_update" on store_collaborators
  for update to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_admin_collaborator(store_id)
  )
  with check (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_admin_collaborator(store_id)
  );

create policy "store_collaborators_delete" on store_collaborators
  for delete to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_admin_collaborator(store_id)
  );


-- =============================================================================
-- 21. STORE_CUSTOMERS — CRM y Registro de Clientes por Tienda
-- =============================================================================
create table if not exists store_customers (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores(id) on delete cascade,
  email        text not null,
  nombre       text,
  telefono     text,
  created_at   timestamptz default now(),
  ultimo_login timestamptz default now(),
  unique (store_id, email)
);

create index if not exists idx_store_customers_store on store_customers(store_id, created_at desc);
alter table store_customers enable row level security;
revoke all on store_customers from public, anon;
grant select, insert, update, delete on store_customers to authenticated, service_role;

create policy "store_customers_select" on store_customers
  for select to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- Los clientes solo se crean y editan desde el servidor (tope de clientes del plan):
-- ver migración 20261107_clientes_solo_servidor. El cliente solo lee su propia fila.
create policy "store_customers_insert" on store_customers
  for insert to authenticated
  with check (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  );

create policy "store_customers_update" on store_customers
  for update to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  )
  with check (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  );

create policy "store_customers_delete" on store_customers
  for delete to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_admin_collaborator(store_id)
  );


-- =============================================================================
-- 22. PRODUCT_REVIEWS — Reseñas y Valoraciones de Productos
-- =============================================================================
create table if not exists product_reviews (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  user_email  text not null,
  user_name   text not null,
  rating      int not null check (rating >= 1 and rating <= 5),
  comentario  text not null,
  visible     boolean not null default true,
  created_at  timestamptz default now()
);

create index if not exists idx_product_reviews_product on product_reviews(product_id, visible);
create index if not exists idx_product_reviews_store on product_reviews(store_id, created_at desc);
alter table product_reviews enable row level security;
revoke all on product_reviews from public, anon;
grant select on product_reviews to anon;
grant select, insert, update, delete on product_reviews to authenticated, service_role;

create policy "product_reviews_select" on product_reviews
  for select
  using (
    visible = true
    or is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
    or lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "product_reviews_insert" on product_reviews
  for insert to authenticated
  with check (
    lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  );

create policy "product_reviews_admin_update" on product_reviews
  for update to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  )
  with check (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  );

create policy "product_reviews_admin_delete" on product_reviews
  for delete to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  );


-- =============================================================================
-- 23. NEWSLETTER_SUBSCRIBERS — Suscriptores al Boletín / Novedades
-- =============================================================================
create table if not exists newsletter_subscribers (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  email       text not null,
  activo      boolean default true,
  created_at  timestamptz default now(),
  unique (store_id, email)
);

create index if not exists idx_newsletter_subscribers_store on newsletter_subscribers(store_id, created_at desc);
alter table newsletter_subscribers enable row level security;
revoke all on newsletter_subscribers from public, anon;
grant insert on newsletter_subscribers to anon;
grant select, insert, update, delete on newsletter_subscribers to authenticated, service_role;

create policy "newsletter_subscribers_public_insert" on newsletter_subscribers
  for insert to anon, authenticated
  with check (
    email is not null
    and length(trim(email)) > 3
  );

create policy "newsletter_subscribers_admin_all" on newsletter_subscribers
  for all to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  )
  with check (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  );


-- =============================================================================
-- 24. MP_OAUTH_STATES — Estados de autenticación OAuth para Mercado Pago
-- =============================================================================
create table if not exists mp_oauth_states (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  state       text not null unique,
  created_at  timestamptz default now()
);

create index if not exists idx_mp_oauth_states_state on mp_oauth_states(state);
alter table mp_oauth_states enable row level security;
create policy "allow_all_mp_oauth_states" on mp_oauth_states for all using (true) with check (true);
grant select, insert, delete on mp_oauth_states to anon, authenticated, service_role;


-- =============================================================================
-- 25. STORE_MP_CREDENTIALS — Credenciales aisladas de Mercado Pago OAuth
-- =============================================================================
create table if not exists store_mp_credentials (
  store_id uuid primary key references stores(id) on delete cascade,
  mp_access_token text not null,
  mp_refresh_token text,
  mp_public_key text,
  mp_token_expires_at timestamptz,
  mp_user_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table store_mp_credentials enable row level security;
revoke all on store_mp_credentials from anon, authenticated;
grant all on store_mp_credentials to service_role;


-- =============================================================================
-- 26. PROCESS_APPROVED_PAYMENT — Procesamiento atómico e idempotente de pagos
-- =============================================================================
create or replace function process_approved_payment(
  p_order_id uuid,
  p_payment_id text,
  p_net_received numeric,
  p_fee numeric,
  p_amount numeric default null,
  p_currency text default 'ARS'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_item jsonb;
  v_qty int;
  v_variant_id uuid;
  v_product_id uuid;
begin
  -- 1. Consultar el pedido actual
  select id, store_id, total, items, stock_descontado, estado_pago
  into v_order
  from orders
  where id = p_order_id;

  if v_order.id is null then
    return jsonb_build_object('success', false, 'error', 'order_not_found');
  end if;

  -- 2. Si ya estaba aprobado, responder idempotentemente
  if v_order.estado_pago = 'aprobado' then
    return jsonb_build_object(
      'success', true,
      'already_processed', true,
      'first_time', false,
      'status', 'aprobado'
    );
  end if;

  -- 3. L3: Validar que la moneda sea ARS y el monto pagado no sea menor a (total - 1)
  if (p_currency is not null and upper(trim(p_currency)) <> 'ARS') or
     (p_amount is not null and p_amount < (v_order.total - 1.00)) then
    -- Dejar pedido en 'revision', NO descontar stock
    update orders
    set
      estado_pago = 'revision',
      mp_payment_id = coalesce(p_payment_id, mp_payment_id),
      observaciones_admin = concat(
        coalesce(observaciones_admin || E'\n', ''),
        'Revisión requerida (RPC): Moneda recibida: ', coalesce(p_currency, 'null'),
        ', Monto recibido: $', coalesce(p_amount::text, 'null'),
        ' vs Total esperado: $', v_order.total::text
      ),
      updated_at = now()
    where id = p_order_id and estado_pago is distinct from 'aprobado';

    return jsonb_build_object(
      'success', true,
      'status', 'revision',
      'first_time', true,
      'already_processed', false,
      'order_id', v_order.id,
      'store_id', v_order.store_id
    );
  end if;

  -- 4. Actualizar pedido a 'aprobado' si estado_pago is distinct from 'aprobado'
  update orders
  set
    estado_pago = 'aprobado',
    mp_payment_id = p_payment_id,
    mp_net_received = p_net_received,
    mp_fee_portalmaker = p_fee,
    updated_at = now()
  where id = p_order_id and estado_pago is distinct from 'aprobado';

  -- 5. Descontar stock atómicamente si aún no estaba descontado
  if not coalesce(v_order.stock_descontado, false) then
    if v_order.items is not null and jsonb_typeof(v_order.items) = 'array' then
      for v_item in select * from jsonb_array_elements(v_order.items)
      loop
        v_qty := coalesce((v_item->>'cantidad')::int, 0);
        if v_qty > 0 then
          -- Descontar de variante si aplica
          if (v_item->>'variant_id') is not null and (v_item->>'variant_id') <> '' and (v_item->>'variant_id') <> 'null' then
            v_variant_id := (v_item->>'variant_id')::uuid;
            update product_variants
            set stock = greatest(stock - v_qty, 0)
            where id = v_variant_id and stock is not null;
          -- Descontar de producto simple si gestiona_stock = true
          elsif (v_item->>'product_id') is not null and (v_item->>'product_id') <> '' and (v_item->>'product_id') <> 'null' then
            v_product_id := (v_item->>'product_id')::uuid;
            update products
            set stock = greatest(stock - v_qty, 0)
            where id = v_product_id and gestiona_stock = true and stock is not null;
          end if;
        end if;
      end loop;
    end if;

    update orders set stock_descontado = true where id = p_order_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'first_time', true,
    'already_processed', false,
    'status', 'aprobado',
    'order_id', v_order.id,
    'store_id', v_order.store_id
  );
end;
$$;

revoke all on function process_approved_payment(uuid, text, numeric, numeric) from public, anon, authenticated;
revoke all on function process_approved_payment(uuid, text, numeric, numeric, numeric, text) from public, anon, authenticated;
grant execute on function process_approved_payment(uuid, text, numeric, numeric, numeric, text) to service_role;


-- =============================================================================
-- 27. STORE_COMMISSION_AUDIT — Auditoría de comisiones de plataforma
-- =============================================================================
create table if not exists store_commission_audit (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  changed_by text,
  old_value numeric(5,2),
  new_value numeric(5,2),
  changed_at timestamptz default now()
);

alter table store_commission_audit enable row level security;
revoke all on store_commission_audit from anon, authenticated, public;
grant all on store_commission_audit to service_role;

create or replace function trg_audit_store_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.comision_portalmaker is distinct from new.comision_portalmaker then
    insert into store_commission_audit (
      store_id,
      changed_by,
      old_value,
      new_value,
      changed_at
    )
    values (
      new.id,
      coalesce(auth.jwt() ->> 'email', 'service_role'),
      old.comision_portalmaker,
      new.comision_portalmaker,
      now()
    );
  end if;
  return new;
end;
$$;

revoke all on function trg_audit_store_commission() from public, anon, authenticated;

drop trigger if exists trg_store_commission_audit on stores;
create trigger trg_store_commission_audit
  after update on stores
  for each row
  execute function trg_audit_store_commission();


-- =============================================================================
-- 28. PROTECT_STORE_COLUMNS — Defensa en la base para campos protegidos
-- =============================================================================
create or replace function protect_store_sensitive_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_is_superadmin boolean := false;
  v_cliente_cambio_verified boolean := false;
begin
  -- Dejar pasar a service_role, postgres y supabase_admin
  if current_user in ('service_role', 'postgres', 'supabase_admin') or
     (auth.jwt() ->> 'role') = 'service_role' or
     auth.role() = 'service_role' then
    return new;
  end if;

  v_is_superadmin := is_platform_admin();

  -- (a) Calcular ANTES de alterar ningún campo si el cliente intentó cambiar custom_domain_verified
  v_cliente_cambio_verified := (old.custom_domain_verified is distinct from new.custom_domain_verified);

  -- (b) Si no es superadmin y pretendió cambiar custom_domain_verified -> Rechazar
  if not v_is_superadmin and v_cliente_cambio_verified then
    raise exception 'No tienes permisos para modificar custom_domain_verified';
  end if;

  -- (c) Si cambió custom_domain y custom_domain_verified no fue enviado deliberadamente como true por superadmin,
  -- forzar verificación a false (el nuevo dominio debe ser verificado)
  if old.custom_domain is distinct from new.custom_domain then
    if not (v_is_superadmin and new.custom_domain_verified = true) then
      new.custom_domain_verified := false;
    end if;
  end if;

  -- Para cualquier rol que NO sea superadmin:
  if not v_is_superadmin then
    if old.comision_portalmaker is distinct from new.comision_portalmaker then
      raise exception 'No tienes permisos para modificar comision_portalmaker';
    end if;
    if old.suscripcion_activa is distinct from new.suscripcion_activa then
      raise exception 'No tienes permisos para modificar suscripcion_activa';
    end if;
    if old.slug is distinct from new.slug then
      raise exception 'El subdominio (slug) solo puede ser modificado mediante el flujo administrativo verificado';
    end if;
    if old.admin_email is distinct from new.admin_email then
      raise exception 'El email del administrador solo puede ser modificado mediante el flujo de verificación de identidad';
    end if;
    if old.estado_pago is distinct from new.estado_pago then
      raise exception 'No tienes permisos para modificar el estado_pago de la suscripción';
    end if;
    if old.fecha_proximo_vencimiento is distinct from new.fecha_proximo_vencimiento then
      raise exception 'No tienes permisos para modificar la fecha_proximo_vencimiento';
    end if;
    if old.dias_gracia is distinct from new.dias_gracia then
      raise exception 'No tienes permisos para modificar los dias_gracia';
    end if;
    if old.notas_admin is distinct from new.notas_admin then
      raise exception 'Las notas de administración son exclusivas del equipo del portal';
    end if;
    if old.mp_connected is distinct from new.mp_connected then
      raise exception 'El estado de conexión de Mercado Pago solo puede modificarse mediante el flujo seguro de OAuth';
    end if;
    if new.mp_recargo_porcentaje is not null and (new.mp_recargo_porcentaje < 0 or new.mp_recargo_porcentaje > 15) then
      raise exception 'El recargo por Mercado Pago debe estar entre 0%% y 15%%';
    end if;

    -- Restauradas/nuevas (2026-11-06): columnas que definen qué paga y qué obtiene
    -- la tienda. plan, precio_mensual y limite_productos estaban protegidas en la
    -- versión original de schema.sql y se perdieron al recrear la función en la
    -- migración 20261021_mercadopago_ronda7.
    if old.plan is distinct from new.plan then
      raise exception 'El plan solo puede ser modificado por el equipo del portal';
    end if;
    if old.precio_mensual is distinct from new.precio_mensual then
      raise exception 'El precio mensual solo puede ser modificado por el equipo del portal';
    end if;
    if old.limite_productos is distinct from new.limite_productos then
      raise exception 'El límite de productos solo puede ser modificado por el equipo del portal';
    end if;
    if old.features_override is distinct from new.features_override then
      raise exception 'Las funcionalidades habilitadas solo pueden ser modificadas por el equipo del portal';
    end if;
    if old.modo_operacion is distinct from new.modo_operacion then
      raise exception 'El modo de operación depende del plan y solo lo modifica el equipo del portal';
    end if;
    if old.checkout_activo is distinct from new.checkout_activo then
      raise exception 'La activación del checkout depende del plan y solo la modifica el equipo del portal';
    end if;
  end if;

  return new;
end;
$$;

-- Defensa en el INSERT: el trigger de columnas protegidas solo corre en UPDATE,
-- así que un dueño podía mandar plan/comisión/checkout propios al crear la tienda.
-- Para cualquiera que no sea superadmin o service_role se fuerzan los valores iniciales.
create or replace function force_store_initial_values()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') or
     (auth.jwt() ->> 'role') = 'service_role' or
     auth.role() = 'service_role' or
     is_platform_admin() then
    return new;
  end if;

  new.plan := 'free';
  new.precio_mensual := 0;
  new.limite_productos := 15;
  new.features_override := '{}'::jsonb;
  new.modo_operacion := 'vitrina';
  new.checkout_activo := false;
  new.comision_portalmaker := 0;
  new.estado_pago := 'al_dia';
  new.suscripcion_activa := true;
  new.fecha_proximo_vencimiento := null;
  new.dias_gracia := 3;
  new.notas_admin := null;
  new.mp_connected := false;
  new.custom_domain_verified := false;
  return new;
end;
$$;

drop trigger if exists trg_force_store_initial_values on stores;
create trigger trg_force_store_initial_values
  before insert on stores
  for each row
  execute function force_store_initial_values();

drop trigger if exists trg_protect_store_columns on stores;
create trigger trg_protect_store_columns
  before update on stores
  for each row
  execute function protect_store_sensitive_columns();


-- =============================================================================
-- 29. PROTECT_ORDER_COLUMNS — Protección de totales, snapshots y MP en pedidos (H2, O2)
-- =============================================================================
create or replace function protect_order_sensitive_columns()
returns trigger
language plpgsql
security invoker
as $$
begin
  -- Dejar pasar a service_role, postgres y supabase_admin
  if current_user in ('service_role', 'postgres', 'supabase_admin') or
     (auth.jwt() ->> 'role') = 'service_role' or
     auth.role() = 'service_role' then
    return new;
  end if;

  -- Dejar pasar a platform_admin
  if is_platform_admin() then
    return new;
  end if;

  -- O2: Inmutable para cualquier otro rol en todos los pedidos
  if old.store_id is distinct from new.store_id then
    raise exception 'No está permitido modificar la tienda (store_id) de un pedido';
  end if;

  if old.public_token is distinct from new.public_token then
    raise exception 'No está permitido modificar el public_token de un pedido';
  end if;

  if old.total is distinct from new.total then
    raise exception 'No está permitido modificar el total de un pedido existente';
  end if;

  if old.items is distinct from new.items then
    raise exception 'No está permitido modificar los productos o variantes de un pedido existente';
  end if;

  if old.comision_portalmaker_pct is distinct from new.comision_portalmaker_pct then
    raise exception 'No está permitido modificar el snapshot de comision_portalmaker_pct';
  end if;

  if old.mp_recargo_pct is distinct from new.mp_recargo_pct then
    raise exception 'No está permitido modificar el snapshot de mp_recargo_pct';
  end if;

  -- O2: Si el pedido es o fue Mercado Pago, proteger costo_envio, metodo_pago y campos de liquidación
  if old.metodo_pago = 'mercadopago' or old.mp_payment_id is not null or old.mp_preference_id is not null then
    if old.costo_envio is distinct from new.costo_envio then
      raise exception 'No está permitido modificar el costo de envío de un pedido de Mercado Pago';
    end if;

    if old.metodo_pago is distinct from new.metodo_pago then
      raise exception 'No está permitido cambiar el método de pago de un pedido de Mercado Pago';
    end if;

    if old.mp_payment_id is distinct from new.mp_payment_id or
       old.mp_preference_id is distinct from new.mp_preference_id or
       old.mp_merchant_order_id is distinct from new.mp_merchant_order_id or
       old.mp_fee_portalmaker is distinct from new.mp_fee_portalmaker or
       old.mp_net_received is distinct from new.mp_net_received then
      raise exception 'Los campos de liquidación de Mercado Pago solo pueden ser modificados por el webhook oficial';
    end if;
  end if;

  -- Modificación de estado_pago:
  if old.estado_pago is distinct from new.estado_pago then
    if old.metodo_pago = 'mercadopago' or old.mp_payment_id is not null or old.mp_preference_id is not null then
      raise exception 'Los pedidos con Mercado Pago no pueden cambiar su estado de pago manualmente. El estado se actualiza por webhook.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_order_columns on orders;
create trigger trg_protect_order_columns
  before update on orders
  for each row
  execute function protect_order_sensitive_columns();


-- =============================================================================
-- 30. STORE_IS_ACTIVE — Verificación pública de tienda activa (M1)
-- =============================================================================
create or replace function store_is_active(p_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from stores
    where id = p_store_id
      and suscripcion_activa is not false
  );
$$;

grant execute on function store_is_active(uuid) to anon, authenticated, service_role;


-- =============================================================================
-- 31. MP_OAUTH_STATES — Estados de flujo OAuth para vinculación de Mercado Pago (O4)
-- =============================================================================
create table if not exists mp_oauth_states (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  state text not null unique,
  user_id text,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz default now()
);

create index if not exists idx_mp_oauth_states_expires_at on mp_oauth_states(expires_at);

alter table mp_oauth_states enable row level security;
revoke all on mp_oauth_states from anon, authenticated, public;
grant all on mp_oauth_states to service_role;


-- =============================================================================
-- FIN DEL SCHEMA
-- Próximo paso: ejecutar supabase/seed.sql
-- =============================================================================


-- =============================================================================
-- ENVIOS FASE 1 (2026-10-20): columnas y tablas de envios (shipments, shipment_events,
-- order_events, store_shipping_providers, shipping_quotes), columnas origen_*/envio_* en
-- stores, medidas en product_variants, valor_declarado en product_details, envio_* en
-- orders y vista stores_public ampliada. Fuente de verdad del DDL aplicado:
--   supabase/migrations/20261020_envios_fase1.sql
--   supabase/migrations/20261020_envios_fase1_revoke_anon.sql
-- =============================================================================


-- =============================================================================
-- TURNOS FASE 1 (2026-11-06): tipo_negocio, servicios, profesionales, bloqueos,
-- turnos y reglas de reserva. Copia de supabase/migrations/20261106_turnos_fase1.sql
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
  -- Oferta: con oferta_activa, la reserva y la seña usan precio_oferta
  precio_oferta           numeric(10,2) check (precio_oferta is null or precio_oferta >= 0),
  oferta_activa           boolean not null default false,
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


-- =============================================================================
-- TURNOS: LISTA DE ESPERA (2026-11-06). Copia de
-- supabase/migrations/20261106_turnos_lista_espera.sql
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


-- =============================================================================
-- TURNOS FASE 2 (2026-11-07): recordatorios, calendario .ics. Copia de
-- supabase/migrations/20261107_turnos_fase2.sql (la tarea pg_cron está en
-- supabase/migrations/20261107_turnos_cron.sql y requiere un secreto en Vault).
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


-- =============================================================================
-- RESEÑAS DE SERVICIOS (2026-11-07). Copia de
-- supabase/migrations/20261107_resenas_servicios.sql
-- =============================================================================
alter table public.product_reviews alter column product_id drop not null;

alter table public.product_reviews
  add column if not exists service_id uuid references public.services(id) on delete cascade;

alter table public.product_reviews drop constraint if exists product_reviews_un_destino;
alter table public.product_reviews
  add constraint product_reviews_un_destino
  check (num_nonnulls(product_id, service_id) = 1);

create index if not exists idx_product_reviews_service on public.product_reviews(service_id) where service_id is not null;
