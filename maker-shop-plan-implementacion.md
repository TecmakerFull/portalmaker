# Plataforma E-commerce Maker — Plan de Implementación Técnica (v3)
**Documento fuente de verdad para agentes (Antigravity / Cursor)**
**Stack:** Next.js (App Router) + Tailwind CSS + Supabase (PostgreSQL + Storage + Auth) + Cloudflare Pages

> **Cambios vs. v2:** se agrega (1) control de suscripciones con historial de pagos, visible tanto para el admin de cada tienda como para vos (developer/superadmin) a nivel plataforma completa; (2) ficha de producto extendida y opcional al estilo e-commerce grande; (3) carrito flotante y sistema de páginas informativas configurables (Contacto, Sobre Nosotros, y las que hagan falta, sin hardcodear una columna por página).

---

## 0. Decisiones de negocio ya tomadas

| Decisión | Resolución |
|---|---|
| Arquitectura | Multi-tenant: una sola app Next.js + una sola base Supabase para todas las tiendas. |
| Hosting | Cloudflare Pages, cuenta separada de tus otros proyectos. |
| Costo inicial | $0/mes (Cloudflare Pages free + Supabase free). |
| Dominio primer cliente | Subdominio de la plataforma hoy; dominio propio después, sin cambio de arquitectura. |
| Alcance actual | Catálogo/vidriera, checkout modelado pero desactivado. |
| **Control de suscripciones** | **Dos niveles**: el admin de cada tienda ve su propio estado y su historial de pago; vos (developer) tenés un panel de plataforma que ve el estado de **todas** las tiendas y registra los pagos. |

---

## 1. Roles del sistema (actualizado)

1. **Comprador** — navega sin login.
2. **Admin de tienda** — Google OAuth, acceso a `/admin` de su propia tienda únicamente (validado contra `stores.admin_email`). Ve su catálogo, pedidos, branding, y ahora también **su estado de suscripción e historial de pagos**.
3. **Developer / Superadmin (vos)** — Google OAuth, acceso a `/superadmin`, un panel **fuera del alcance de cualquier tienda individual**, que lista todas las tiendas de la plataforma, su estado de suscripción, y permite registrar pagos.

**Importante para el middleware:** `/superadmin` no puede pasar por la resolución de tenant por dominio (sección "cómo funciona el multi-tenant" del documento anterior), porque no pertenece a ninguna tienda — es de la plataforma. Se accede desde el dominio raíz o un subdominio dedicado (ej. `panel.tuplataforma.com`), y el middleware debe reconocerlo como ruta especial antes de intentar resolver un `store_id`.

---

## 2. Modelo de Base de Datos — Ampliaciones (SQL adicional a lo ya definido en v2)

```sql
-- =========================================
-- STORES: campos de suscripción
-- =========================================
alter table stores
  add column fecha_inicio_suscripcion date default current_date,
  add column fecha_proximo_vencimiento date,
  add column dias_gracia int default 3;

-- =========================================
-- PLATFORM_ADMINS (vos, y a futuro quien más administre la plataforma)
-- =========================================
create table platform_admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz default now()
);

-- Función helper para usar en policies
create or replace function is_platform_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from platform_admins where email = auth.jwt() ->> 'email'
  );
$$;

-- =========================================
-- SUBSCRIPTION_PAYMENTS (historial de pagos por tienda)
-- =========================================
create table subscription_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  monto numeric(10,2) not null,
  metodo_pago text,                        -- transferencia, efectivo, mercadopago, etc. (texto libre, lo carga el developer)
  periodo_desde date not null,
  periodo_hasta date not null,
  fecha_pago date not null default current_date,
  comprobante_url text,                    -- opcional, si querés adjuntar comprobante
  registrado_por text,                     -- email del platform_admin que lo cargó
  notas text,
  created_at timestamptz default now()
);

create index idx_subpayments_store on subscription_payments(store_id, fecha_pago desc);

-- Al registrar un pago, actualizar fecha_proximo_vencimiento de la tienda (trigger)
create or replace function actualizar_vencimiento_suscripcion()
returns trigger
language plpgsql
as $$
begin
  update stores
  set fecha_proximo_vencimiento = new.periodo_hasta,
      suscripcion_activa = true
  where id = new.store_id;
  return new;
end;
$$;

create trigger trg_actualizar_vencimiento
  after insert on subscription_payments
  for each row execute function actualizar_vencimiento_suscripcion();

-- =========================================
-- PRODUCT_DETAILS (ficha extendida, 1:1 y opcional por producto)
-- =========================================
create table product_details (
  product_id uuid primary key references products(id) on delete cascade,
  marca text,
  peso_kg numeric(6,3),
  alto_cm numeric(6,2),
  ancho_cm numeric(6,2),
  profundidad_cm numeric(6,2),
  garantia_texto text,
  ficha_tecnica jsonb default '[]',        -- [{"clave":"Material","valor":"PLA"}, {"clave":"Resistencia","valor":"Alta"}, ...]
  tags text[],                             -- para filtros/búsqueda: {"regalo","personalizado","decoracion"}
  video_url text,
  meta_title text,                         -- SEO
  meta_description text,                   -- SEO
  productos_relacionados uuid[],           -- ids de otros products, opcional
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================================
-- STORE_PAGES (páginas informativas configurables, sin hardcodear una por una)
-- =========================================
create table store_pages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  slug text not null,                      -- "contacto", "sobre-nosotros", "preguntas-frecuentes", "envios-y-devoluciones", etc.
  titulo text not null,
  contenido text,                          -- rich text / markdown
  visible boolean default true,
  orden int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (store_id, slug)
);

create index idx_storepages_store on store_pages(store_id, visible);

-- =========================================
-- RLS de las tablas nuevas
-- =========================================
alter table subscription_payments enable row level security;
alter table platform_admins enable row level security;
alter table product_details enable row level security;
alter table store_pages enable row level security;

-- subscription_payments: el admin de la tienda ve SU historial; el platform_admin ve todo e inserta
create policy "store_admin_read_own_payments" on subscription_payments for select
  using (auth.jwt() ->> 'email' = (select admin_email from stores where id = subscription_payments.store_id)
         or is_platform_admin());

create policy "platform_admin_insert_payments" on subscription_payments for insert
  with check (is_platform_admin());

create policy "platform_admin_update_payments" on subscription_payments for update
  using (is_platform_admin());

-- platform_admins: solo visible/editable por otros platform_admins (autogestión del equipo interno)
create policy "platform_admin_manage_admins" on platform_admins for all
  using (is_platform_admin());

-- product_details: mismo patrón que products (público lee, admin de la tienda dueña escribe)
create policy "public_read_product_details" on product_details for select using (true);

create policy "admin_all_product_details" on product_details for all
  using (auth.jwt() ->> 'email' = (
    select s.admin_email from stores s
    join products p on p.store_id = s.id
    where p.id = product_details.product_id
  ) or is_platform_admin());

-- store_pages: público lee solo visibles, admin de tienda gestiona las suyas
create policy "public_read_store_pages" on store_pages for select using (visible = true);

create policy "admin_all_store_pages" on store_pages for all
  using (auth.jwt() ->> 'email' = (select admin_email from stores where id = store_pages.store_id)
         or is_platform_admin());

-- Ampliar policy de stores para que el platform_admin también tenga acceso total (además del propio admin)
drop policy if exists "admin_write_stores" on stores;
create policy "admin_write_stores" on stores for update
  using (auth.jwt() ->> 'email' = admin_email or is_platform_admin());

create policy "platform_admin_read_all_stores" on stores for select using (true);
```

**Sobre `ficha_tecnica jsonb`:** se eligió una lista de pares clave/valor en vez de columnas fijas (`material`, `dimensiones`, etc.) porque cada rubro maker (impresión 3D, grabado láser, corte) tiene atributos técnicos distintos. Esto le permite al admin cargar "Tiempo de impresión: 3hs" para un producto y "Espesor de acrílico: 5mm" para otro, sin que el desarrollador tenga que tocar el schema cada vez que aparece un atributo nuevo.

**Sobre por qué `product_details` es una tabla aparte y no columnas en `products`:** la mayoría de estos campos van a quedar vacíos en productos simples (ej. un llavero grabado no necesita peso ni dimensiones de envío detalladas). Separarlo evita una tabla `products` con decenas de columnas mayormente nulas, y dejar clarísimo en el admin qué es "básico, obligatorio" vs. "ficha completa, opcional" — literalmente son dos formularios distintos en la UI.

---

## 3. UI — Carrito flotante y páginas informativas

### Carrito flotante
- Componente persistente (`/components/store/FloatingCart.tsx`) montado en el layout de `(public)`, visible en todas las páginas de catálogo cuando `modo_operacion = 'tienda'` **o** `checkout_activo = true` a nivel producto individual.
- Comportamiento esperado: ícono fijo (típicamente inferior derecho o en el header), contador de ítems, al hacer click abre un drawer/mini-carrito sin salir de la página, con acceso directo a `/carrito` o `/checkout`.
- En modo catálogo puro (sin checkout), este componente se reemplaza por un **botón flotante de WhatsApp** en el mismo lugar de la UI — mismo patrón visual, distinto propósito. Antigravity debería implementar esto como un solo componente `FloatingActionButton` con una prop `mode: 'cart' | 'whatsapp'` para no duplicar lógica de posicionamiento/estilos.

### Páginas informativas (dinámicas, vía `store_pages`)
- Ruta genérica: `/app/(public)/[slug]/page.tsx` que busca en `store_pages` por `store_id` + `slug` y renderiza el contenido. Esto cubre Contacto, Sobre Nosotros, Preguntas Frecuentes, Envíos y Devoluciones, Términos y Condiciones, y cualquier página futura que un cliente pida — **sin necesidad de nueva ruta ni nuevo deploy**, solo una fila nueva en la tabla.
- El admin gestiona estas páginas desde `/admin/paginas`: crear, editar, ocultar/mostrar, reordenar.
- Sugerencia de páginas a precargar por defecto al dar de alta una tienda nueva (pueden quedar vacías para que el cliente las complete): `contacto`, `sobre-nosotros`, `preguntas-frecuentes`, `envios-y-devoluciones`, `terminos-y-condiciones`.
- La página de **Contacto** debería, además del contenido libre, tirar de los datos ya existentes en `stores` (WhatsApp, redes sociales, dirección de retiro) para no duplicar esa información manualmente.

---

## 4. Panel de Admin de tienda — sección de Suscripción

Nueva pantalla en `/admin/suscripcion`:
- Días restantes: `stores.fecha_proximo_vencimiento - hoy` (mostrar en verde si faltan >7 días, amarillo si quedan ≤7, rojo si venció y está dentro de `dias_gracia`, bloqueado si superó el período de gracia).
- Historial de pagos: listado de `subscription_payments` de su propia tienda, ordenado por fecha descendente (monto, período cubierto, método, fecha).
- Este panel es **de solo lectura** para el admin de tienda — el registro de pagos lo hace exclusivamente el developer desde `/superadmin`, para evitar que alguien se autodeclare "al día" manipulando datos.

## 5. Panel Developer/Superadmin — `/superadmin`

- Listado de todas las tiendas con: nombre, estado de suscripción (activa/vencida/en gracia), fecha de próximo vencimiento, plan (básico/premium).
- Registrar un pago nuevo por tienda (monto, período cubierto, método) → dispara el trigger que actualiza `fecha_proximo_vencimiento` y reactiva `suscripcion_activa` automáticamente.
- Toggle manual de `suscripcion_activa` por si hace falta una excepción puntual (ej. pausar una tienda sin que cuente como "vencida").
- Alta de tienda nueva: formulario que crea la fila en `stores` (reemplaza el paso manual por SQL de la v2).

---

## 6. Plan de Implementación por Fases (actualizado)

### Fase 1 — Setup & Base de Datos
- [ ] Cuenta Cloudflare separada, proyecto Supabase, script SQL completo (incluye ahora suscripciones, ficha extendida y páginas).
- [ ] Cargar tu propio email en `platform_admins`.
- [ ] Middleware: reconocer ruta `/superadmin` como especial (no intenta resolver tenant), resolver tenant por dominio para el resto.

### Fase 2 — UI Comprador
- [ ] Home, categorías, grilla de productos.
- [ ] Página de producto: datos básicos + sección "Ficha técnica" que renderiza `product_details` solo si existe carga (no mostrar sección vacía).
- [ ] Carrito flotante / botón WhatsApp flotante según modo.
- [ ] Páginas dinámicas vía `store_pages`, incluyendo Contacto con datos de `stores`.

### Fase 3 — Admin & Auth
- [ ] Login Google OAuth + guard por tienda.
- [ ] CRUD productos con dos formularios: "Datos básicos" (obligatorio) y "Ficha completa" (opcional, `product_details`).
- [ ] CRUD de `store_pages`.
- [ ] Pantalla `/admin/suscripcion` (solo lectura, ver sección 4).

### Fase 4 — Checkout & WhatsApp
- [ ] Igual que v2 — Mercado Pago, transferencia, efectivo, envío, notificación WhatsApp.

### Fase 5 — Panel Superadmin y alta de clientes
- [ ] `/superadmin`: listado de tiendas + estado de suscripción.
- [ ] Formulario de registro de pago (dispara trigger de actualización de vencimiento).
- [ ] Formulario de alta de tienda nueva (reemplaza alta manual por SQL).
- [ ] QA end-to-end: crear tienda de prueba, cargar producto con ficha completa, registrar pago, verificar que `/admin/suscripcion` refleje el estado correcto.

---

## 7. Checklist de "clavos sueltos"

- [ ] Definir qué pasa exactamente al vencer `dias_gracia`: ¿se activa automáticamente el estado "Tienda en Mantenimiento" o requiere que vos lo confirmes manualmente? (Recomendado: automático, para que el control de ingresos no dependa de que vos te acuerdes de revisarlo.)
- [ ] Decidir si `subscription_payments.comprobante_url` es obligatorio o solo referencia (afecta si necesitás un bucket de Storage para comprobantes).
- [ ] Validar compatibilidad de `@cloudflare/next-on-pages` con las nuevas rutas dinámicas (`[slug]` de páginas) — mismo punto de atención de la v2, ahora con más superficie de código.
- [ ] Definir el dominio/subdominio de acceso a `/superadmin` para que quede fuera de la resolución de tenant sin ambigüedad.
- [ ] Backup exportable de `products`, `product_details`, `store_pages`, `orders` y `subscription_payments` si un cliente se da de baja.
- [ ] Validación server-side de precios en checkout — nunca confiar en el precio que llega del navegador.

---

# Adenda v4 — Inventario, Métricas y Clasificación por Rubro/Proceso

> Estas secciones se agregan sobre el documento anterior (v3). No reemplazan nada de lo ya definido, lo extienden. Antigravity debe aplicar el SQL de esta sección **después** del de las secciones 2 y 3 previas, ya que agrega columnas a tablas existentes.

## 8. Modelo de Base de Datos — Inventario, Métricas y Proceso

```sql
-- =========================================
-- PROCESS_TYPES (rubro/tipo de proceso — global a la plataforma, no por tienda)
-- =========================================
create table process_types (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  slug text not null unique,
  orden int default 0
);

insert into process_types (nombre, slug, orden) values
  ('Impresión 3D', 'impresion-3d', 1),
  ('Grabado Láser', 'grabado-laser', 2),
  ('Corte Láser', 'corte-laser', 3),
  ('Otro', 'otro', 4);

-- =========================================
-- PRODUCTS: nuevas columnas (stock propio + clasificación por proceso)
-- =========================================
alter table products
  add column process_type_id uuid references process_types(id),
  add column gestiona_stock boolean default false,   -- false = "bajo pedido", sin control de unidades
  add column stock int,                               -- solo aplica si gestiona_stock = true y el producto NO tiene variantes
  add column stock_minimo int default 0;               -- umbral para alerta de "bajo stock"

-- =========================================
-- PRODUCT_VARIANTS: umbral de stock mínimo (ya tenía columna stock)
-- =========================================
alter table product_variants
  add column stock_minimo int default 0;

-- =========================================
-- STOCK_MOVEMENTS (trazabilidad de entradas/salidas/ajustes)
-- =========================================
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete cascade,   -- null si el producto no tiene variantes
  tipo text not null check (tipo in ('entrada', 'salida', 'ajuste', 'venta')),
  cantidad int not null,                  -- positivo en entrada/ajuste+, negativo en salida/ajuste-/venta
  motivo text,                            -- "Reposición", "Rotura", "Venta #numero_orden", etc.
  registrado_por text,                    -- email del admin que lo cargó (null si es automático por venta)
  order_id uuid references orders(id),    -- se completa automáticamente cuando tipo = 'venta'
  created_at timestamptz default now()
);

create index idx_stockmov_product on stock_movements(product_id, created_at desc);
create index idx_stockmov_store on stock_movements(store_id, created_at desc);

-- =========================================
-- PRODUCT_VIEWS (log de vistas, para métricas de "más vistos")
-- =========================================
create table product_views (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz default now()
);

create index idx_productviews_product on product_views(product_id, created_at desc);
create index idx_productviews_store on product_views(store_id, created_at desc);

-- =========================================
-- ORDER_ITEMS (versión normalizada de orders.items, solo para métricas/agregaciones rápidas)
-- orders.items (jsonb) se mantiene igual: es la "foto" inmutable de lo que se compró,
-- con precios y nombres del momento. order_items es la versión consultable por SQL.
-- =========================================
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  product_id uuid references products(id) on delete set null,   -- puede quedar null si el producto se borró
  cantidad int not null,
  precio_unitario numeric(10,2) not null,
  subtotal numeric(10,2) not null,
  created_at timestamptz default now()
);

create index idx_orderitems_product on order_items(product_id, created_at desc);
create index idx_orderitems_store on order_items(store_id, created_at desc);

-- =========================================
-- RLS de las tablas nuevas
-- =========================================
alter table stock_movements enable row level security;
alter table product_views enable row level security;
alter table order_items enable row level security;

create policy "admin_all_stock_movements" on stock_movements for all
  using (auth.jwt() ->> 'email' = (select admin_email from stores where id = stock_movements.store_id)
         or is_platform_admin());

create policy "public_insert_product_views" on product_views for insert with check (true);
create policy "admin_read_product_views" on product_views for select
  using (auth.jwt() ->> 'email' = (select admin_email from stores where id = product_views.store_id)
         or is_platform_admin());

create policy "public_insert_order_items" on order_items for insert with check (true);
create policy "admin_read_order_items" on order_items for select
  using (auth.jwt() ->> 'email' = (select admin_email from stores where id = order_items.store_id)
         or is_platform_admin());

create policy "public_read_process_types" on process_types for select using (true);
```

**Por qué `order_items` duplica datos que ya están en `orders.items` (jsonb):** son dos cosas con propósitos distintos. `orders.items` es el comprobante — lo que el cliente efectivamente compró, con el precio y el nombre de producto *tal cual eran en ese momento*, aunque el admin después cambie el precio o borre el producto. `order_items` es la tabla que le permite a Antigravity hacer consultas SQL rápidas tipo "sumá cantidad agrupado por producto en los últimos 30 días" sin tener que parsear JSON fila por fila. Se cargan los dos al confirmar un pedido, en la misma operación.

**Por qué `stock` vive tanto en `products` como en `product_variants`:** un producto simple sin variantes (ej. un llavero de un solo diseño) controla stock directo en `products.stock`. Un producto con variantes (ej. el mismo llavero en 3 colores) controla stock por variante, y `products.stock` queda sin usar para ese caso. La regla para Antigravity: si el producto tiene variantes de tipo relevante para inventario, el stock se gestiona ahí; si no tiene variantes, se gestiona en el producto directamente. `gestiona_stock = false` es la opción "bajo pedido, sin límite" para quien no quiere llevar este control.

## 9. Panel de Admin — Inventario

Nueva pantalla `/admin/inventario`:
- Listado de productos (y sus variantes) con stock actual, con indicador visual cuando `stock <= stock_minimo`.
- Alta manual de movimiento (entrada/salida/ajuste) con motivo — cubre casos como "rotura de una pieza en producción" o "reposición de filamento terminado".
- Al confirmarse una venta (Fase 4), se genera automáticamente un `stock_movement` tipo `'venta'` con cantidad negativa y `order_id` asociado — así el historial de stock queda trazable sin carga manual duplicada.
- Historial completo de movimientos por producto (para que el admin entienda "por qué" bajó el stock, no solo el número final).

## 10. Panel de Admin — Métricas

Nueva pantalla `/admin/metricas` (dashboard):
- **Más vistos**: top N productos por cantidad de filas en `product_views`, con selector de período (últimos 7/30/90 días).
- **Más vendidos**: top N productos por `sum(cantidad)` en `order_items`, mismo selector de período.
- **Ingresos**: suma de `orders.total` con `estado_pago = 'aprobado'`, agrupado por semana/mes.
- **Alertas de stock bajo**: lista rápida de productos/variantes en o por debajo de `stock_minimo`.
- **Pedidos pendientes**: cantidad de `orders` con `estado_pedido = 'nuevo'`, como recordatorio de tareas.

Nota para Antigravity: el registro en `product_views` se hace desde una server action liviana al cargar la página de producto — no bloquear el render esperando esa inserción (fire-and-forget), y no es necesario (ni conviene) deduplicar por sesión en esta primera versión; una métrica aproximada de "interés" es suficiente para el objetivo del admin.

## 11. Clasificación por rubro/proceso — impacto en catálogo público

- `process_type_id` es **independiente** de `categories`: las categorías las define libremente cada tienda (ej. "Llaveros", "Decoración de hogar"), mientras que el proceso (Impresión 3D / Grabado Láser / Corte Láser / Otro) es un clasificador fijo y común a toda la plataforma.
- En el catálogo público, agregar filtro combinable: por categoría **y** por tipo de proceso, no solo uno u otro.
- Esto también deja preparado el terreno para el cotizador automático de impresión 3D que charlamos como diferenciador competitivo — al tener el proceso identificado por producto, mañana se puede activar una calculadora de precio específica solo para los productos marcados como `impresion-3d`.

## 12. Plan de Implementación — tareas agregadas

**Fase 1:** incluir el SQL de la sección 8 en el script inicial (no como migración separada, ya que el proyecto todavía no tiene datos reales).

**Fase 2 (UI Comprador):** agregar filtro por tipo de proceso en la grilla de catálogo; disparar inserción en `product_views` al entrar a una página de producto.

**Fase 3 (Admin):**
- [ ] `/admin/inventario`: listado, alta de movimientos, alertas de stock bajo.
- [ ] `/admin/metricas`: dashboard con los 5 indicadores de la sección 10.
- [ ] Selector de `process_type_id` en el formulario de carga de producto.

**Fase 4 (Checkout):** al confirmarse una venta, insertar en `order_items` y generar el `stock_movement` tipo `'venta'` automáticamente, en la misma transacción que crea la `order`.

## 13. Checklist de "clavos sueltos" — adenda

- [ ] Definir si `product_views` debe excluir las visitas del propio admin logueado (para no inflar sus propias métricas al revisar su catálogo). Recomendado: sí, excluir si `auth.jwt() ->> 'email' = stores.admin_email` en el momento del insert.
- [ ] Decidir qué pasa si se intenta vender un producto con `gestiona_stock = true` y `stock = 0`: ¿bloquea el botón de compra, o lo deja pasar como "a confirmar disponibilidad"? Afecta directamente el flujo de checkout de la Fase 4.
- [ ] Confirmar que el trigger de `stock_movements` tipo `'venta'` no se dispare en pedidos con `metodo_pago` pendiente de aprobación (evitar descontar stock de una venta que después se rechaza).

---

# Adenda v5 — Comportamiento ante stock = 0

> Resuelve el punto abierto de la sección 13 (v4): un producto sin stock **nunca bloquea la página**. Cambia el botón de acción por una consulta directa a WhatsApp referenciando ese producto puntual.

## 14. Regla de disponibilidad por producto

Estado del botón de acción en la página de producto, según `gestiona_stock` y `stock`:

| `gestiona_stock` | `stock` (o stock de la variante elegida) | Botón mostrado |
|---|---|---|
| `false` | — (no aplica, es "bajo pedido" siempre) | "Comprar" / "Consultar" según `modo_operacion` de siempre |
| `true` | `> 0` | "Comprar" (flujo normal de checkout) |
| `true` | `0` (o negativo) | **"Consultar disponibilidad por WhatsApp"** — reemplaza al botón de compra, no lo bloquea ni lo deshabilita sin acción posible |

Esto aplica tanto a nivel producto (`products.stock`) como a nivel variante (`product_variants.stock`) — si el producto tiene variantes, la variante puntual elegida por el comprador es la que determina el estado del botón, no el producto en general (puede haber una variante con stock y otra sin stock dentro del mismo producto).

## 15. Mensaje de WhatsApp con referencia al producto

Extiende `lib/whatsapp.ts` (ya previsto en la arquitectura) para armar un link `wa.me` con mensaje pre-cargado y específico, no genérico. Ejemplo de contenido del mensaje (Antigravity debe armarlo como plantilla, no hardcodeado):

```
Hola! Quería consultar por disponibilidad/presupuesto de:
[Nombre del producto] [– Variante elegida, si aplica]
Link: [URL de la página del producto]
```

El link a `wa.me` incluye el número de `stores.whatsapp_numero` de la tienda correspondiente (no un número fijo de la plataforma) y el mensaje va URL-encodeado en el propio link, para que se abra ya escrito y el comprador solo tenga que enviarlo.

## 16. Ajustes al plan de fases

**Fase 2 (UI Comprador):** implementar la lógica de la tabla de la sección 14 en la página de producto — el componente de "acción principal" del producto pasa a tener 3 estados posibles (Comprar / Consultar general / Consultar por falta de stock), no 2.

**Fase 4 (Checkout):** sin cambios en el flujo de pago — este caso directamente no entra al checkout, se resuelve antes, en la página de producto.

## 17. Checklist — actualización

- [x] ~~Definir si un producto sin stock bloquea o permite consulta~~ → Resuelto: nunca bloquea, deriva a WhatsApp con referencia al producto puntual (sección 14).

---

# Adenda v6 — Sistema de diseño: iconografía, modo claro/oscuro y branding

## 18. Regla explícita de iconografía (no negociable)

**Nunca usar emojis en ninguna parte de la interfaz, bajo ninguna circunstancia** — ni en botones, ni en mensajes de estado, ni en las plantillas de WhatsApp generadas por el sistema (esto corrige/aclara la sección 15: el mensaje de consulta por WhatsApp tampoco debe llevar emojis). Toda la iconografía va en **SVG minimalista, estilo lineal/monocromático**, consistente con una estética profesional y seria — no ilustrativa ni "amigable" de más, pensando en que el público de estas tiendas incluye compradores corporativos que encargan piezas a medida, no solo consumidores finales.

**Recomendación concreta de pack de íconos:** usar **Lucide** (`lucide-react`), por estas razones puntuales:
- Todo el set es SVG lineal, minimalista, sin relleno de color por defecto — hereda el color de texto/marca que definas, así que se adapta automáticamente a la paleta de cada tienda sin trabajo extra.
- Es una librería instalable (no "un pack para descargar" como un ZIP de imágenes), lo cual es mejor para el proyecto: versionado, actualizable, liviano (cada ícono se importa individualmente, no carga el set completo).
- Cobertura amplia: van a encontrar carrito, WhatsApp (usar el ícono genérico de "mensaje/chat", ya que Lucide no incluye logos de marcas — para el logo real de WhatsApp evaluar `simple-icons` como complemento puntual solo para ese caso), sol/luna para el toggle de tema, candado para checkout seguro, etc.

Antigravity debe fijar esto como estándar desde la Fase 1 y no mezclar con otras librerías de íconos en el mismo proyecto (evita inconsistencia visual entre secciones).

## 19. Modo claro / oscuro

- Ícono de sol/luna fijo en el header, visible en todas las páginas (comprador y admin), que alterna el tema. Preferencia del **visitante**, no de la tienda — se guarda en el navegador (localStorage/cookie) y por defecto respeta la preferencia del sistema operativo del visitante la primera vez que entra.
- **El admin no necesita configurar dos paletas completas a mano.** Por defecto, el modo oscuro se genera automáticamente a partir de los 4 colores que el admin ya personaliza (`color_primario`, `color_secundario`, `color_fondo`, `color_texto`), invirtiendo/ajustando luminosidad y verificando contraste mínimo de forma programática. Esto mantiene la promesa de "sin conocimientos técnicos": el admin carga un solo set de colores y el modo oscuro sale solo, con buen contraste garantizado por código, no por su criterio de diseño.
- Para el admin que sí quiera afinar el modo oscuro a mano (más avanzado, opcional), se agregan columnas nullable — si están vacías, se usa el cálculo automático; si están cargadas, se usan tal cual.

```sql
alter table stores
  add column color_primario_dark text,
  add column color_secundario_dark text,
  add column color_fondo_dark text,
  add column color_texto_dark text,
  add column tema_por_defecto text default 'sistema' check (tema_por_defecto in ('claro', 'oscuro', 'sistema'));
```

## 20. Paleta de colores: presets sugeridos + libre (respuesta a tu duda)

Mi recomendación es **no dejarlo 100% en blanco ni 100% libre** — combinar ambas cosas, que es el patrón que usan Tienda Nube, Squarespace y similares:

- El selector de color en `/admin/branding` ofrece primero una **grilla de 5-6 paletas prearmadas** (profesionales, con buen contraste ya probado, pensadas para talleres/manufactura: por ejemplo una paleta "industrial" gris+naranja, una "minimal" blanco+negro, una "cálida" beige+terracota, etc.).
- Debajo, un selector de color libre (color picker estándar) para quien quiera definir sus 4 colores manualmente.
- Esto resuelve dos problemas a la vez: el admin sin criterio de diseño obtiene un resultado prolijo en un clic (eligiendo un preset), y el que sí quiere control total lo tiene igual. Dejarlo 100% libre desde cero es el escenario donde más "tiendas feas" vas a terminar teniendo que arreglar vos a mano después.
- Los presets son solo un punto de partida — internamente no son una tabla separada, simplemente valores por defecto sugeridos en la UI que, al elegirse, completan los mismos 4 campos de siempre (`color_primario`, `color_secundario`, `color_fondo`, `color_texto`).

## 21. Branding — campos faltantes (logo, ícono, slogan)

`stores.logo_url` y `stores.favicon_url` ya estaban contemplados. Se agrega:

```sql
alter table stores
  add column slogan text,
  add column icono_url text;   -- versión compacta del logo (solo símbolo, sin texto), para header móvil/colapsado — distinto del favicon técnico del navegador
```

Formulario de `/admin/branding` queda entonces con: Logo (versión completa), Ícono (versión compacta, opcional — si no se carga, se usa el logo completo escalado), Favicon (técnico, para la pestaña del navegador), Slogan (texto corto), y la selección de paleta de colores de la sección 20.

## 22. Ajustes al plan de fases

**Fase 1:** instalar `lucide-react` como estándar único de iconografía del proyecto; incluir el SQL de las secciones 19 y 21 en el script inicial.

**Fase 2 (UI Comprador):** componente de toggle claro/oscuro en el header, con el ícono de sol/luna de Lucide; función de cálculo automático de paleta oscura a partir de la paleta clara.

**Fase 3 (Admin — Branding):** grilla de paletas sugeridas + color picker libre; campos de Logo/Ícono/Favicon/Slogan.

## 23. Checklist — adenda

- [ ] Confirmar contraste mínimo aceptable (recomendado: WCAG AA, ratio 4.5:1 para texto normal) como criterio objetivo para el cálculo automático del modo oscuro, así Antigravity tiene una regla concreta que validar y no un criterio subjetivo de "que se vea bien".
- [ ] Definir las 5-6 paletas sugeridas concretas (colores exactos) antes de Fase 3 — hoy quedaron descriptas conceptualmente ("industrial", "minimal", "cálida") pero faltan los valores hexadecimales finales.

---

# Adenda v7 — Paletas de colores sugeridas (valores finales)

> Completa el punto abierto de la sección 23 (v6). Basado en tendencias de diseño web 2026: predominan los neutros "grounded" (blancos cálidos, tipo Pantone Cloud Dancer), los verdes/tierras tipo salvia-arcilla-mushroom, el contraste alto blanco/negro, los rojos profundos "serios" (mahogany/merlot) y los verde-azulados tipo teal. Todas las paletas están armadas para cumplir contraste mínimo WCAG AA (4.5:1) entre `color_texto` y `color_fondo` en su versión clara.

Estos valores **no van en una tabla de base de datos** — son constantes de UI (un array en el código, ej. `/lib/color-presets.ts`) que el admin elige desde `/admin/branding`; al seleccionar una, se completan los 4 campos ya existentes en `stores` (`color_primario`, `color_secundario`, `color_fondo`, `color_texto`).

## 24. Las 6 paletas

| # | Nombre | Primario (acento/botones) | Secundario | Fondo | Texto | Mejor para |
|---|---|---|---|---|---|---|
| 1 | **Industrial** | `#6B8F71` (verde salvia) | `#2F3336` (carbón) | `#F5F4F1` (hueso) | `#202224` | Taller/manufactura en general — transmite estabilidad y precisión técnica |
| 2 | **Minimal B/N** | `#111111` (negro) | `#6B6B6B` (gris medio) | `#FFFFFF` (blanco) | `#111111` | Piezas de diseño, look atemporal, máximo contraste y seriedad |
| 3 | **Mahogany Premium** | `#6B2B2B` (merlot/caoba) | `#3A2C28` (marrón oscuro) | `#F7F3EF` (crema) | `#241C1A` | Trabajos a medida / gama alta, transmite "old money", calidad premium |
| 4 | **Teal Tecnológico** | `#1F6F6B` (teal) | `#163A3D` (teal oscuro) | `#F2F6F5` (blanco frío) | `#16211F` | Corte y grabado láser, precisión, look más "tech" |
| 5 | **Cálida Natural** | `#A9713F` (arcilla) | `#4A433C` (marrón carbón) | `#F3EDE4` (hueso cálido) | `#2B2620` | Productos decorativos/hogar, sensación artesanal y sustentable |
| 6 | **Corporate Navy** | `#1B3A5C` (azul marino) | `#8E97A3` (gris azulado) | `#FAFAF8` (blanco cálido) | `#1A1C1E` | Clientes B2B / pedidos corporativos, look más formal |

**Versión oscura de cada preset:** se genera con el mismo algoritmo automático de la sección 19 (invertir/ajustar luminosidad manteniendo el matiz de cada color), no hace falta definir 6 paletas oscuras a mano — es exactamente el caso de uso para el que se armó ese cálculo automático.

## 25. Ajuste al plan de fases

**Fase 3 (Admin — Branding):** cargar estas 6 paletas como constante en `/lib/color-presets.ts`, mostradas como swatches seleccionables en `/admin/branding` antes del color picker libre.

## 26. Checklist — cierre del punto

- [x] ~~Definir valores hexadecimales de paletas sugeridas~~ → Resuelto, sección 24.
- [x] ~~Definir criterio de contraste para modo oscuro automático~~ → Resuelto en v6: WCAG AA, 4.5:1.

---

# Adenda v8 — Contraparte oscura de cada paleta sugerida

> Aclara y corrige el criterio de la v6/v7: **los 6 presets tienen su versión oscura diseñada a mano** (mejor calidad visual), y el cálculo automático de contraste (WCAG AA) queda como respaldo únicamente para cuando el admin arma una paleta 100% libre con el color picker, no para los presets.

## 27. Las 6 paletas con su contraparte oscura

| # | Nombre | Primario (claro → oscuro) | Secundario (claro → oscuro) | Fondo (claro → oscuro) | Texto (claro → oscuro) |
|---|---|---|---|---|---|
| 1 | Industrial | `#6B8F71` → `#82A889` | `#2F3336` → `#44484A` | `#F5F4F1` → `#1C1E1F` | `#202224` → `#EDEDEA` |
| 2 | Minimal B/N | `#111111` → `#F2F2F2` | `#6B6B6B` → `#9A9A9A` | `#FFFFFF` → `#121212` | `#111111` → `#F2F2F2` |
| 3 | Mahogany Premium | `#6B2B2B` → `#A85C5C` | `#3A2C28` → `#6B5147` | `#F7F3EF` → `#201613` | `#241C1A` → `#F0E7E1` |
| 4 | Teal Tecnológico | `#1F6F6B` → `#4FA8A3` | `#163A3D` → `#2C5C58` | `#F2F6F5` → `#0F1E1D` | `#16211F` → `#E8F1EF` |
| 5 | Cálida Natural | `#A9713F` → `#C99A63` | `#4A433C` → `#6B6155` | `#F3EDE4` → `#211C16` | `#2B2620` → `#EFE7DC` |
| 6 | Corporate Navy | `#1B3A5C` → `#4A7BA6` | `#8E97A3` → `#6E7A87` | `#FAFAF8` → `#12181F` | `#1A1C1E` → `#EDEFF2` |

**Criterio usado para pasar de claro a oscuro en cada preset:** el primario y el secundario se aclaran/desaturan levemente (un color muy saturado sobre fondo oscuro cansa la vista y puede fallar contraste), el fondo pasa a un tono casi negro *con el matiz original conservado* (no negro puro, para que la paleta siga sintiéndose "de la misma familia"), y el texto pasa a un blanco roto cálido o frío según el matiz de la paleta (evita el blanco puro `#FFFFFF`, que sobre fondos oscuros satura demasiado el contraste y cansa en lecturas largas).

## 28. Corrección al modelo de datos y comportamiento

No cambia el SQL ya definido en la sección 19 (`color_primario_dark`, `color_secundario_dark`, `color_fondo_dark`, `color_texto_dark` ya existían como columnas nullable) — cambia **quién completa esos valores**:

- Admin elige un preset → al seleccionarlo, se completan **los 8 campos** (4 claros + 4 oscuros) con los valores de la tabla de la sección 27, no solo los 4 claros.
- Admin arma paleta libre → completa los 4 campos claros con el color picker; los 4 campos oscuros quedan `null` y se resuelven con el cálculo automático (algoritmo de la sección 19) en tiempo de render.
- Admin arma paleta libre y además quiere afinar el oscuro a mano → puede completar los 4 campos oscuros manualmente igual, están disponibles para cualquiera de los dos casos.

## 29. Ajuste al plan de fases

**Fase 3 (Admin — Branding):** `/lib/color-presets.ts` pasa a tener los 8 valores por preset (no 4); al elegir un preset desde la UI, completar los 8 campos de `stores` en una sola operación.

---

# Adenda v9 — Adaptación responsiva (mobile y desktop)

> No es una fase aparte: es un requisito transversal a todas las fases anteriores. Esta sección deja explícito qué significa "100% responsive" en este proyecto, componente por componente, para que Antigravity no lo resuelva con criterio propio caso por caso.

## 30. Enfoque general

- **Mobile-first**: los estilos base se escriben para mobile, y se agregan variantes para pantallas más grandes (no al revés). Es el enfoque natural de Tailwind y evita que el sitio "funcione" en desktop pero quede roto en mobile por ser un ajuste posterior.
- Breakpoints estándar de Tailwind, sin definir breakpoints custom salvo necesidad puntual:

| Breakpoint | Ancho | Uso típico en este proyecto |
|---|---|---|
| Base (sin prefijo) | < 640px | Celular en vertical — es el diseño principal, no el secundario |
| `sm:` | ≥ 640px | Celular en horizontal / celulares grandes |
| `md:` | ≥ 768px | Tablets |
| `lg:` | ≥ 1024px | Notebooks / monitores chicos |
| `xl:` | ≥ 1280px | Monitores estándar |

- **Objetivo de touch targets:** todo elemento interactivo (botones, ítems de menú, íconos clickeables) con un área mínima de 44×44px en mobile, siguiendo el estándar de accesibilidad táctil — no hay excepción para íconos "chicos" como el toggle de tema o el ícono de carrito.
- **Nada de interacciones que dependan solo de `hover`**: cualquier información que en desktop aparezca al pasar el mouse (tooltips, previews) necesita una alternativa accesible por tap en mobile (por ejemplo, tocar para expandir en vez de mostrar solo al hover).

## 31. Comportamiento específico por componente

| Componente | Mobile | Desktop |
|---|---|---|
| **Header** | Logo + ícono de menú hamburguesa (Lucide) que despliega navegación; toggle claro/oscuro visible siempre, sin esconder en el menú | Logo + navegación horizontal completa + toggle de tema |
| **Grilla de catálogo** | 1 columna (excepcionalmente 2 en celulares grandes) | 3-4 columnas según ancho disponible |
| **Filtros (categoría + tipo de proceso)** | Panel colapsable/modal que se abre con un botón "Filtrar", no ocupa espacio permanente | Barra lateral fija visible siempre |
| **Carrito flotante / botón WhatsApp** | Botón fijo abajo a la derecha, respetando el área segura de dispositivos con notch; al tocarlo abre un panel que ocupa la pantalla completa (bottom sheet) | Botón fijo abajo a la derecha; al hacer click abre un drawer lateral, no pantalla completa |
| **Galería de imágenes de producto** | Carrusel deslizable (swipe) con indicador de posición | Grid de miniaturas + imagen principal grande, sin necesidad de swipe |
| **Formulario de checkout** | Campos apilados en una sola columna, `inputmode="numeric"` en campos numéricos para que aparezca el teclado correcto | Puede usar 2 columnas para campos relacionados (ej. nombre/teléfono lado a lado) |
| **Tablas de admin (productos, pedidos, inventario, listado de tiendas en superadmin)** | Se transforman en tarjetas apiladas (cada fila = una card con la info clave), **no** tabla horizontal con scroll lateral | Tabla tradicional con columnas |
| **Selector de paleta de colores** | Grid de swatches de 2-3 por fila | Grid de swatches de 5-6 por fila, todas visibles sin scroll |
| **Dashboard de métricas** | Gráficos/números apilados verticalmente, uno por fila | Grid de 2-3 tarjetas de métricas por fila |

## 32. QA de responsividad — dispositivos/tamaños mínimos a probar

- Celular chico (~375px de ancho, ej. gama iPhone SE / Android compacto).
- Celular grande (~430px de ancho).
- Tablet (~768px, portrait y landscape).
- Notebook (~1366px).
- Monitor grande (~1920px).
- Verificar explícitamente: que ningún texto se corte o se superponga, que ninguna imagen se deforme, que el carrito flotante no tape contenido importante (ej. el botón de "Comprar" del producto), y que los formularios del admin (carga de producto con imágenes, ficha técnica, variantes) sean usables con una sola mano en mobile — el admin también va a cargar productos desde el celular, no solo el comprador va a navegar desde ahí.

## 33. Ajuste al plan de fases

Se incorpora como criterio de aceptación transversal, no como tarea aislada:
- **Fase 2:** cada componente de comprador se construye siguiendo la tabla de la sección 31 desde el inicio, no como ajuste posterior.
- **Fase 3:** el admin (incluido `/superadmin`) sigue el mismo criterio — es común subestimar que el panel de administración también necesita ser mobile-friendly, y en este proyecto el propio maker probablemente va a cargar productos desde el celular en el taller.
- **Fase 5 (QA pre-entrega):** agregar el checklist de la sección 32 como paso obligatorio antes de dar por terminada cualquier tienda, incluida la primera.

---

# Adenda v10 — Funcionalidades de e-commerce completo: qué se suma ahora y qué queda en backlog

> Responde a la lista de funcionalidades tipo "gran plataforma" propuesta para evaluar. Se organiza en capas para no comprometer el lanzamiento del primer cliente real con alcance de una plataforma tipo Shopify completa.

## 34. Se suma ahora (Fase 1-3, bajo costo, arquitectura ya lo soporta)

```sql
-- Subcategorías
alter table categories
  add column parent_id uuid references categories(id) on delete set null;

-- SKU y tiempo de fabricación a nivel producto
alter table products
  add column sku text,
  add column tiempo_fabricacion_estimado text;   -- texto libre: "3-5 días hábiles", no un número rígido

-- SEO y analítica a nivel tienda
alter table stores
  add column meta_title text,
  add column meta_description text,
  add column ga_measurement_id text,             -- Google Analytics
  add column meta_pixel_id text,                 -- Meta Pixel
  add column google_maps_embed_url text;         -- opcional, para la página de contacto

-- Banners promocionales (múltiples, con vigencia por fecha — separado del hero_banner_url único ya existente)
create table banners (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  imagen_url text not null,
  titulo text,
  link_url text,
  orden int default 0,
  activo boolean default true,
  fecha_desde date,
  fecha_hasta date,
  created_at timestamptz default now()
);

create index idx_banners_store on banners(store_id, activo);

-- Auditoría de cambios (genérica, reutilizable para cualquier entidad)
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  admin_email text not null,
  accion text not null,          -- "crear", "editar", "eliminar", "activar", "desactivar"
  entidad text not null,         -- "producto", "categoria", "pagina", "banner", etc.
  entidad_id uuid,
  detalle jsonb,                 -- opcional: qué campos cambiaron
  created_at timestamptz default now()
);

create index idx_auditlog_store on audit_log(store_id, created_at desc);

-- RLS
alter table banners enable row level security;
alter table audit_log enable row level security;

create policy "public_read_banners" on banners for select using (activo = true);
create policy "admin_all_banners" on banners for all
  using (auth.jwt() ->> 'email' = (select admin_email from stores where id = banners.store_id) or is_platform_admin());

create policy "admin_read_audit_log" on audit_log for select
  using (auth.jwt() ->> 'email' = (select admin_email from stores where id = audit_log.store_id) or is_platform_admin());
create policy "system_insert_audit_log" on audit_log for insert with check (true);
```

**Sin cambio de schema, solo de implementación:**
- **Búsqueda simple**: query `ilike` sobre `products.nombre` y `products.descripcion`, filtrado por `store_id`. No hace falta buscador "inteligente" (semántico/typo-tolerant) para el volumen de productos de un taller — eso sí sería sobre-ingeniería en esta etapa.
- **Filtro por precio**: rango sobre `precio_base` + `precio_adicional` de variantes, ya existente.
- **Carrito persistente**: el carrito flotante ya definido guarda su estado en `localStorage` del navegador, sobrevive a recargar la página y cerrar/abrir el navegador — no requiere cuenta de usuario ni tabla en base de datos.
- **Productos relacionados**: ya existía `product_details.productos_relacionados` desde la v3 — solo falta construir la UI que lo muestre en la página de producto (Fase 2).

## 35. Backlog documentado (no se construye en el lanzamiento del cliente 1)

Se anota para no perderlo, pero se implementa cuando haya una razón concreta (más clientes, volumen real, o pedido explícito) — construirlo antes sin esa señal es esfuerzo especulativo.

| Funcionalidad | Por qué se pospone | Disparador para construirlo |
|---|---|---|
| Cupones / códigos de descuento | Requiere lógica de validación (vigencia, uso único, combinabilidad) que no tiene sentido sin campaña de marketing activa | Cuando el cliente pida una promoción concreta |
| Newsletter | Necesita integración con un proveedor de email (Mailchimp/Resend) y gestión de suscriptores — infraestructura nueva | Cuando haya volumen de visitantes que lo justifique |
| Lista de deseos | Bajo valor sin cuenta de comprador (¿dónde se guarda si no hay login?) | Si se implementa cuenta de comprador (ver ítem siguiente) |
| Cuenta de comprador (login) | Cambio de arquitectura de auth; hoy la propuesta de valor es justamente "comprá sin fricción, sin registrarte" — agregar cuentas puede ir en contra de ese diferencial | Si el cliente pide historial de compras propio o programa de fidelidad |
| Recomendaciones automáticas | Sin volumen de ventas real, "productos que también compraron" no tiene datos suficientes para ser útil — mostraría poco o nada | Cuando haya suficiente historial de `order_items` acumulado |
| Importación/exportación CSV | Valioso para catálogos grandes; el cliente real arranca con pocos productos cargados a mano | Cuando la carga manual producto por producto empiece a doler de verdad |
| Integración real de correo (Correo Argentino, Andreani, etc.) | Requiere contratación y credenciales de API de cada courier — no es solo código | Cuando el volumen de envíos lo justifique frente a la tarifa fija/por zona ya cubierta |
| Google Maps embebido | Bajo esfuerzo — se puede sumar rápido apenas se pida | A pedido, es casi gratis agregarlo cuando haga falta |
| Recuperación de carritos abandonados | Requiere trackear sesiones de compradores anónimos + disparar mensajes automáticos — funcionalidad de marketing avanzado, no de checkout | Cuando haya tráfico y checkout activos con abandono medible |

## 36. Para cuestionar antes de construir (no es "no sirven", es "ojo con el timing")

- **Reviews/calificaciones públicas y abiertas**: una tienda nueva con pocas ventas va a mostrar 0 o 1 reseña durante meses — eso comunica lo contrario de lo que se busca (confianza). Ya está cubierto en el plan un mecanismo mejor para esta etapa: la galería de "Trabajos a medida" con testimonios que el propio admin cura y publica, sin depender de que lleguen reviews espontáneas. Si más adelante el volumen de ventas lo justifica, ahí sí vale la pena abrir reviews públicas.
- **Blog integrado**: exige que el emprendedor genere contenido de forma sostenida para que valga la pena — si no lo sostiene, es una sección vacía o desactualizada, que resta profesionalismo en vez de sumar. Antes de construirlo, vale la pena preguntarle directamente al cliente si está dispuesto a escribir con regularidad.
- **Editor de páginas tipo bloques**: para las 5-6 páginas fijas que necesita un taller (Contacto, Sobre Nosotros, FAQ, etc.), un editor visual de bloques es un producto en sí mismo (es lo que hacen Webflow/WordPress con años de desarrollo). El sistema ya definido (`store_pages` con contenido en markdown, editable desde el admin) cubre el 90% del caso de uso real con una fracción del esfuerzo — swap solo se justifica si el cliente necesita layouts muy distintos página por página, que no es el caso de un taller maker.

## 37. Ajuste al plan de fases

**Fase 1:** incluir el SQL de la sección 34 en el script inicial.

**Fase 2 (UI Comprador):** agregar buscador simple, filtro por precio, sección de productos relacionados en la página de producto, banners promocionales en el home.

**Fase 3 (Admin):** CRUD de subcategorías (selector de categoría padre), CRUD de banners, campo SKU y tiempo de fabricación en el formulario de producto, campos de SEO/Analytics/Pixel en `/admin/configuracion`, registro automático en `audit_log` en cada operación de escritura relevante (crear/editar/eliminar producto, cambiar precio, etc.).
