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
stable  -- no modifica datos, puede ser cacheada por el planificador de queries
as $$
  select exists (
    select 1
    from platform_admins
    where email = auth.jwt() ->> 'email'
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
  plan                        text    default 'maker_pro', -- 'starter' | 'maker_pro' | 'enterprise' | 'bonificado'
  precio_mensual              numeric(10,2) default 0,    -- valor mensual pactado
  estado_pago                 text    default 'al_dia',    -- 'al_dia' | 'pendiente' | 'bonificado' | 'gracia' | 'vencido'
  limite_productos            int     default 50,          -- límite máximo de productos según el plan
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
  mp_user_id            text,
  mp_access_token       text,
  mp_refresh_token      text,
  mp_public_key         text,
  mp_token_expires_at   timestamptz,
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
  updated_at
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

alter table orders enable row level security;
-- Solo el admin de la tienda o el platform_admin puede administrar pedidos (J2: lower())
create policy "admin_all_orders" on orders for all
  using (
    is_platform_admin()
    or lower(coalesce(auth.jwt() ->> 'email', '')) = lower((select admin_email from stores where id = orders.store_id))
  );

-- Eliminada la política "public_insert_orders": pedidos creados exclusivamente por servidor (H1)
revoke insert, update on orders from anon;
revoke insert on orders from authenticated;
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

create policy "authenticated_insert_media" on storage.objects for insert
  with check ( bucket_id = 'portalmaker-media' );

create policy "authenticated_update_media" on storage.objects for update
  using ( bucket_id = 'portalmaker-media' );

create policy "authenticated_delete_media" on storage.objects for delete
  using ( bucket_id = 'portalmaker-media' );


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
create policy "allow_all_store_collaborators" on store_collaborators for all using (true) with check (true);
grant select, insert, update, delete on store_collaborators to anon, authenticated, service_role;


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
create policy "allow_all_store_customers" on store_customers for all using (true) with check (true);
grant select, insert, update, delete on store_customers to anon, authenticated, service_role;


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
create policy "allow_all_product_reviews" on product_reviews for all using (true) with check (true);
grant select, insert, update, delete on product_reviews to anon, authenticated, service_role;


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
create policy "allow_all_newsletter_subscribers" on newsletter_subscribers for all using (true) with check (true);
grant select, insert, update, delete on newsletter_subscribers to anon, authenticated, service_role;


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
  p_fee numeric
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_order record;
  v_item jsonb;
  v_qty int;
  v_variant_id uuid;
  v_product_id uuid;
begin
  -- 1. Intentar actualizar el pedido atómicamente solo si NO estaba aprobado
  update orders
  set
    estado_pago = 'aprobado',
    mp_payment_id = p_payment_id,
    mp_net_received = p_net_received,
    mp_fee_portalmaker = p_fee,
    updated_at = now()
  where id = p_order_id and estado_pago <> 'aprobado'
  returning id, store_id, total, items, stock_descontado into v_order;

  -- 2. Si no devolvió fila, significa que ya estaba aprobado (idempotencia)
  if v_order.id is null then
    return jsonb_build_object('success', true, 'already_processed', true, 'first_time', false);
  end if;

  -- 3. Descontar stock atómicamente si aún no estaba descontado
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
    'order_id', v_order.id,
    'store_id', v_order.store_id
  );
end;
$$;

grant execute on function process_approved_payment to service_role;


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
revoke all on store_commission_audit from anon, authenticated;
grant all on store_commission_audit to service_role;

create or replace function trg_audit_store_commission()
returns trigger
language plpgsql
security definer
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
as $$
declare
  v_is_superadmin boolean;
begin
  -- Dejar pasar a service_role, postgres y supabase_admin
  if current_user in ('service_role', 'postgres', 'supabase_admin') or
     (auth.jwt() ->> 'role') = 'service_role' or
     auth.role() = 'service_role' then
    return new;
  end if;

  -- Comprobar si el usuario autenticado es superadmin (is_platform_admin())
  v_is_superadmin := is_platform_admin();

  -- Columnas reservadas exclusivamente para superadmin o service_role
  if not v_is_superadmin then
    if old.comision_portalmaker is distinct from new.comision_portalmaker then
      raise exception 'No tienes permisos para modificar comision_portalmaker';
    end if;
    if old.plan is distinct from new.plan then
      raise exception 'No tienes permisos para modificar el plan de la tienda';
    end if;
    if old.precio_mensual is distinct from new.precio_mensual then
      raise exception 'No tienes permisos para modificar precio_mensual';
    end if;
    if old.limite_productos is distinct from new.limite_productos then
      raise exception 'No tienes permisos para modificar limite_productos';
    end if;
    if old.suscripcion_activa is distinct from new.suscripcion_activa then
      raise exception 'No tienes permisos para modificar suscripcion_activa';
    end if;
    if old.custom_domain_verified is distinct from new.custom_domain_verified then
      raise exception 'No tienes permisos para modificar custom_domain_verified';
    end if;
    if old.mp_access_token is distinct from new.mp_access_token or
       old.mp_refresh_token is distinct from new.mp_refresh_token or
       old.mp_public_key is distinct from new.mp_public_key or
       old.mp_user_id is distinct from new.mp_user_id or
       old.mp_token_expires_at is distinct from new.mp_token_expires_at or
       old.mp_connected is distinct from new.mp_connected then
      raise exception 'Las credenciales y estado de conexión de Mercado Pago solo pueden modificarse mediante el flujo seguro de backend';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_store_columns on stores;
create trigger trg_protect_store_columns
  before update on stores
  for each row
  execute function protect_store_sensitive_columns();


-- =============================================================================
-- 29. PROTECT_ORDER_COLUMNS — Protección de totales, snapshots y MP en pedidos (H2)
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

  -- Para cualquier otro rol (dueño de tienda / usuario regular):
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

  if old.mp_payment_id is distinct from new.mp_payment_id or
     old.mp_preference_id is distinct from new.mp_preference_id or
     old.mp_merchant_order_id is distinct from new.mp_merchant_order_id or
     old.mp_fee_portalmaker is distinct from new.mp_fee_portalmaker or
     old.mp_net_received is distinct from new.mp_net_received then
    raise exception 'Los campos de liquidación de Mercado Pago solo pueden ser modificados por el webhook oficial';
  end if;

  -- Modificación de estado_pago:
  if old.estado_pago is distinct from new.estado_pago then
    -- Si el pedido es de Mercado Pago, el dueño no puede alterarlo a mano
    if old.metodo_pago = 'mercadopago' or old.mp_payment_id is not null or old.mp_preference_id is not null then
      raise exception 'Los pedidos con Mercado Pago no pueden cambiar su estado de pago manualmente. El estado se actualiza por webhook.';
    end if;
    -- Si es transferencia bancaria o efectivo, se permite cambiar el estado de pago
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
-- FIN DEL SCHEMA
-- Próximo paso: ejecutar supabase/seed.sql
-- =============================================================================

