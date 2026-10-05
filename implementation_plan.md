# Portalmaker — Plan de Implementación Técnica (Consolidado)

> Documento de trabajo de Antigravity. Integra y consolida todas las versiones del plan fuente (v3 → v10).
> El proyecto parte de **cero**: no hay código todavía, solo el directorio `z:\home\tecmaker\proyectos\Portalmaker`.

---

## Stack confirmado

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| Estilos | Tailwind CSS |
| Base de datos | Supabase (PostgreSQL + Storage + Auth) |
| Hosting | Cloudflare Pages (`@cloudflare/next-on-pages`) |
| Íconos | `lucide-react` (único pack, sin emojis en ninguna parte) |
| Auth | Google OAuth via Supabase Auth |

---

## Arquitectura de dos capas (ACTUALIZADO)

El proyecto tiene **dos "mundos" distintos** dentro del mismo monorepo Next.js:

### Mundo 1 — Portal de la plataforma (`portalmaker.com.ar`)
Site de marketing + login centralizado. Modelo similar a TiendaNube/Shopify:
- **Sin login**: landing con descripción del servicio, planes de suscripción visibles, formulario de contacto
- **Logueado como Maker**: panel con sus datos de perfil, estado de suscripción, acceso rápido al admin de su tienda
- **Logueado como Developer/Admin**: panel de toda la plataforma (listado de tiendas, pagos, suscripciones, alta de nuevos makers)

### Mundo 2 — Tienda individual del Maker (`[slug].portalmaker.com.ar` o dominio propio)
- **Cara pública** (comprador sin login): galería de productos, páginas informativas, consulta por WhatsApp → **primero esto, carrito después**
- **Admin de tienda** (`[slug].portalmaker.com.ar/admin` o dominio_propio/admin): CRUD de productos, categorías, branding, inventario, métricas, etc.

### Flujo de autenticación (estilo TiendaNube)
```
portalmaker.com.ar/login
     │
     ├── JWT = developer (en platform_admins)
     │        └── redirige a /dashboard/admin   (panel de toda la plataforma)
     │
     └── JWT = maker (en stores.admin_email)
              └── redirige a /dashboard/maker   (perfil + botón "Ir a mi tienda")
                           └── click "Ir a mi tienda" → [slug].portalmaker.com.ar/admin
```

### Cómo el middleware distingue los dos mundos
```
portalmaker.com.ar              →  Portal (sin resolución de tenant)
  └── /dashboard/*             →  Panel según rol (guard por JWT)
  └── /planes, /, /contacto    →  Páginas públicas del portal

[slug].portalmaker.com.ar       →  Middleware resuelve store_id por subdomain
  └── /                        →  Tienda pública (comprador)
  └── /admin/*                 →  Admin de tienda (guard: admin_email)

dominiopropiodelmaker.com.ar    →  Mismo middleware, resuelve por custom_domain
```

### Estructura de rutas Next.js (App Router)
```
app/
├── (portal)/                    ← portalmaker.com.ar — dos mundos en una ruta group
│   ├── page.tsx                 ← Landing/marketing del portal
│   ├── planes/page.tsx          ← Planes de suscripción (público)
│   ├── contacto/page.tsx        ← Contacto con el developer (público)
│   └── dashboard/
│       ├── layout.tsx           ← Guard: requiere login
│       ├── maker/page.tsx       ← Panel del maker (su perfil + link a su tienda)
│       └── admin/              ← Panel del developer/superadmin
│           ├── page.tsx         ← Listado de tiendas
│           ├── tiendas/nueva/
│           └── tiendas/[id]/pagos/nueva/
│
└── (tienda)/                    ← [slug].portalmaker.com.ar — tenant resuelto por middleware
    ├── page.tsx                 ← Home / galería de productos
    ├── productos/[slug]/page.tsx
    ├── [slug]/page.tsx          ← Páginas informativas dinámicas (store_pages)
    └── admin/                  ← Admin de tienda
        ├── layout.tsx           ← Guard: admin_email
        ├── productos/
        ├── categorias/
        ├── pedidos/
        ├── inventario/
        ├── metricas/
        ├── branding/
        ├── paginas/
        ├── banners/
        ├── configuracion/
        └── suscripcion/        ← Solo lectura: estado + historial
```

> [!NOTE]
> El middleware es el componente más delicado: debe detectar si el host es `portalmaker.com.ar` (ruta portal) o cualquier otro subdominio/dominio custom (ruta tienda). Se valida con compatibilidad de `@cloudflare/next-on-pages` en Fase 1.

> [!IMPORTANT]
> **Dominio del portal**: pendiente de confirmar (`portalmaker.com.ar` o similar). El middleware necesita el dominio exacto hardcodeado en una variable de entorno.

---

## Modelo de Base de Datos — Completo

El script SQL se construye en **una sola pasada** (proyecto nuevo sin datos reales).
Tablas organizadas por orden de dependencia:

### Tablas base (de la v2, referenciadas en el plan)
Se asume que el plan v2 definía:
- `stores` — con campos de branding, `admin_email`, `modo_operacion`, `checkout_activo`, `whatsapp_numero`, `suscripcion_activa`, `logo_url`, `favicon_url`, colores, etc.
- `categories` — con `store_id`
- `products` — con `store_id`, `category_id`, `nombre`, `descripcion`, `precio_base`, imágenes, etc.
- `product_variants` — con `product_id`, `stock`, etc.
- `orders` — con `store_id`, `items` (jsonb), `total`, `estado_pago`, `estado_pedido`

> [!IMPORTANT]
> **Pregunta 1 (BLOQUEANTE):** ¿Existe algún SQL previo de la v2 que deba preservar, o construimos el schema completo desde cero integrando todo? Si tenés el script de v2, necesito leerlo para no romper nada ni duplicar columnas.

### Ampliaciones acumuladas (v3 → v10)

**v3:**
- `stores`: + `fecha_inicio_suscripcion`, `fecha_proximo_vencimiento`, `dias_gracia`
- `platform_admins` (nueva)
- `subscription_payments` (nueva) + trigger `actualizar_vencimiento_suscripcion`
- `product_details` (nueva, 1:1 con products)
- `store_pages` (nueva)

**v4:**
- `process_types` (nueva, global a la plataforma)
- `products`: + `process_type_id`, `gestiona_stock`, `stock`, `stock_minimo`
- `product_variants`: + `stock_minimo`
- `stock_movements` (nueva)
- `product_views` (nueva)
- `order_items` (nueva)

**v6:**
- `stores`: + `color_primario_dark`, `color_secundario_dark`, `color_fondo_dark`, `color_texto_dark`, `tema_por_defecto`
- `stores`: + `slogan`, `icono_url`

**v10:**
- `categories`: + `parent_id` (subcategorías)
- `products`: + `sku`, `tiempo_fabricacion_estimado`
- `stores`: + `meta_title`, `meta_description`, `ga_measurement_id`, `meta_pixel_id`, `google_maps_embed_url`
- `banners` (nueva)
- `audit_log` (nueva)

---

## Roles y guardas de acceso

| Rol | Acceso | Guard |
|---|---|---|
| Comprador | Todo lo público, sin login | — |
| Admin de tienda | `/admin/*` de su tienda únicamente | JWT email == `stores.admin_email` para el `store_id` del tenant actual |
| Developer/Superadmin | `/superadmin/*` | JWT email existe en `platform_admins` |

---

## Fases de Implementación

### Fase 1 — Setup & Base de Datos
- [ ] Inicializar proyecto Next.js 15 con Tailwind y `@cloudflare/next-on-pages`
- [ ] Instalar dependencias: `lucide-react`, `@supabase/ssr`, `@supabase/supabase-js`
- [ ] Configurar variables de entorno (Supabase URL/Key, dominio superadmin)
- [ ] Script SQL completo (todas las tablas + RLS + triggers + GRANTs de Supabase)
  - Ver KI: política de GRANTs obligatoria para cada tabla nueva
- [ ] Cargar email del developer en `platform_admins`
- [ ] Cargar los 4 `process_types` iniciales
- [ ] Middleware: detectar host del superadmin → bypass; resto → resolver `store_id`

### Fase 2 — UI Comprador
- [ ] Design system: variables CSS de tokens de color por tenant, lógica de modo oscuro
- [ ] `/lib/color-presets.ts`: las 6 paletas con sus 8 valores (claro + oscuro)
- [ ] Layout público: header responsive (hamburguesa en mobile, nav horizontal en desktop), toggle sol/luna, `FloatingActionButton` (modo `cart` | `whatsapp`)
- [ ] Home: hero banner + banners promocionales + grilla de productos
- [ ] Grilla de catálogo: filtro por categoría + subcategoría + tipo de proceso + rango de precio + búsqueda `ilike`; responsive (1 col mobile, 3-4 desktop)
- [ ] Página de producto: galería (carrusel en mobile, grid en desktop), variantes, botón de acción con 3 estados (Comprar / Consultar / Consultar por falta de stock → WhatsApp pre-cargado), ficha técnica opcional, productos relacionados
- [ ] Páginas informativas dinámicas (`[slug]`): renderiza `store_pages`; la de `contacto` además muestra datos de `stores` (WhatsApp, redes, dirección, Maps embed)
- [ ] Carrito: `localStorage`, drawer en desktop / bottom sheet en mobile
- [ ] Server action liviana: `product_views` insert (fire-and-forget, excluir si es el admin)

### Fase 3 — Admin & Auth
- [ ] Google OAuth via Supabase Auth
- [ ] Guard en `app/admin/layout.tsx`
- [ ] `/admin/productos`: CRUD con formulario "Datos básicos" + "Ficha completa" (product_details) separados; selector de categoría/subcategoría, process_type, SKU, tiempo de fabricación; gestión de variantes con stock; imágenes a Supabase Storage
- [ ] `/admin/categorias`: CRUD con soporte de parent_id (subcategorías)
- [ ] `/admin/pedidos`: listado, cambio de estado
- [ ] `/admin/inventario`: listado con alertas de stock bajo, alta manual de movimientos
- [ ] `/admin/metricas`: dashboard — más vistos, más vendidos, ingresos, alertas de stock, pedidos pendientes
- [ ] `/admin/branding`: logo/ícono/favicon/slogan; grilla de 6 paletas preset + color picker libre; preview en tiempo real
- [ ] `/admin/paginas`: CRUD de store_pages (slug, título, contenido markdown, visible, orden)
- [ ] `/admin/banners`: CRUD de banners con vigencia por fecha
- [ ] `/admin/configuracion`: meta_title, meta_description, GA, Meta Pixel, Maps embed
- [ ] `/admin/suscripcion`: solo lectura — días restantes (semáforo), historial de pagos
- [ ] `audit_log`: registrar create/update/delete de productos, categorías, páginas, banners
- [ ] Tablas de admin como cards apiladas en mobile, tabla en desktop

### Fase 4 — Checkout & WhatsApp
- [ ] Flujo completo de checkout (Mercado Pago + transferencia + efectivo)
- [ ] Al confirmar pedido: insert en `order_items` + `stock_movement` tipo `'venta'` en misma transacción, solo si `estado_pago = 'aprobado'` (no descontar stock en pagos pendientes)
- [ ] Notificación WhatsApp al admin al recibir pedido
- [ ] Validación server-side de precios (nunca confiar en el precio del navegador)

### Fase 5 — Superadmin & QA
- [ ] Guard en `app/superadmin/layout.tsx`
- [ ] `/superadmin`: listado de tiendas con estado de suscripción (semáforo), plan, vencimiento
- [ ] `/superadmin/tiendas/[id]/pagos/nueva`: registrar pago → actualiza `fecha_proximo_vencimiento` via trigger
- [ ] Toggle manual `suscripcion_activa` por tienda
- [ ] `/superadmin/tiendas/nueva`: alta de tienda completa (reemplaza alta manual por SQL)
- [ ] QA end-to-end: crear tienda de prueba, cargar producto con ficha completa, registrar pago, verificar `/admin/suscripcion`
- [ ] Checklist de responsividad completo (375px / 430px / 768px / 1366px / 1920px)

---

## Decisiones ya tomadas (COMPLETO — todas las preguntas resueltas)

| # | Punto | Decisión |
|---|---|---|
| P1 | Schema SQL | Desde cero — todo integrado en un solo script |
| P2 | Arquitectura portal | `portalmaker.com.ar` = hub de marketing + login; tiendas en subdominio/dominio propio |
| P3 | Infraestructura | Se crea desde cero en Fase 1 (Supabase + Cloudflare Pages) |
| P4 | Vencimiento de suscripción | Solo alerta al developer; toggle manual por tienda (`suscripcion_activa`); sin cron |
| P5 | Comprobante de pago | Opcional con storage: si se adjunta va a bucket; si no, queda `null` |
| P6 | Filtros del catálogo | AND — todos los filtros activos se combinan (categoría + proceso + precio) |
| P7 | `product_views` y visitas de admin | Excluir — si JWT = `admin_email` de la tienda, no registrar la vista |
| P8 | Editor de `store_pages` | WYSIWYG simple (negrita, cursiva, listas, títulos) — amigable para el maker |
| P9 | GA y Meta Pixel | Automático — si hay ID cargado, el script se inyecta en el `<head>` de la tienda |
| P10 | Descuento de stock | Solo al aprobar pago; por ahora MVP = vitrina sin carrito, checkout en Fase 4 |
| P11 | Dominio de la plataforma | `portalmaker.com.ar` (tentativo, se configura como variable de entorno) |
| P12 | Mensaje de WhatsApp | Nombre + variante + URL completa del producto (`wa.me` URL-encodeado) |
| P13 | Preview de branding | Componente representativo (botón + card + header) en tiempo real al editar |
| P14 | Páginas informativas al dar de alta | Con contenido de ejemplo/placeholder — guía al maker sobre qué escribir |
| P15 | Orden de trabajo | Seguimos evacuando dudas hasta el plan final; después Fase 1 completa |
| Stack | Tech stack | **Next.js 15 + Tailwind + Supabase + Cloudflare Pages** (sin cambios) |
| MVP | Alcance primer lanzamiento | Vitrina/galería + WhatsApp; carrito + checkout se activa en Fase 4 |
| Emojis | UI | Prohibidos en toda la UI, incluyendo mensajes de WhatsApp generados |
| Íconos | UI | Solo `lucide-react`; para logo WhatsApp evaluar `simple-icons` puntualmente |
| Mobile | Responsive | Mobile-first; touch targets mínimos 44×44px; nada que dependa solo de hover |
| Contraste | Modo oscuro libre | WCAG AA, ratio 4.5:1 entre texto y fondo |
| Presets oscuros | Paletas predefinidas | Las 6 paletas tienen sus 8 valores (claro+oscuro) diseñados a mano |
| Filtros UI | Catálogo en mobile | Panel colapsable/modal; en desktop barra lateral fija |
| Backlog | No se construye ahora | Cupones, blog, cuenta comprador, couriers, PDF, 2FA, roles internos de tienda |

---

## ❌ Preguntas abiertas

> [!NOTE]
> **No quedan preguntas abiertas.** El plan está completo y listo para implementar.

Único dato pendiente de confirmar antes de hacer el primer deploy:
- **Dominio exacto** del portal (`portalmaker.com.ar` u otro) — se configura como `NEXT_PUBLIC_PORTAL_DOMAIN` en variables de entorno de Cloudflare, no hardcodeado en el código.

- Sin emojis en ninguna parte de la UI (incluyendo mensajes de WhatsApp generados)
- Íconos: solo `lucide-react`; para el logo de WhatsApp evaluar `simple-icons` solo si hace falta el logo real
- Mobile-first, breakpoints estándar de Tailwind
- Touch targets mínimos 44×44px
- Carrito en `localStorage` (sin cuenta de comprador)
- `product_views`: aproximado, sin deduplicar por sesión en v1
- Backlog: cupones, newsletter, lista de deseos, cuenta de comprador, recomendaciones automáticas, CSV import/export — no se construyen ahora
- WCAG AA (4.5:1) como criterio de contraste para paletas libres en modo oscuro automático

---

## ❓ Preguntas abiertas — necesito tus respuestas antes de codificar

> [!IMPORTANT]
> Las marcadas como **BLOQUEANTE** detienen el inicio de la fase correspondiente si no están respondidas.

### Estructura del proyecto

**P1 (BLOQUEANTE — Fase 1):** ¿Existe un script SQL de la v2 con el schema base (`stores`, `categories`, `products`, `product_variants`, `orders`)?
- a) Sí, te lo paso → necesito leerlo para no duplicar ni romper nada
- b) No, partimos de cero → construyo el schema completo desde scratch, incluyendo todas las tablas base

**P2 (BLOQUEANTE — Fase 1):** ¿Dónde se va a hostear el `/superadmin`? Necesito el dominio exacto para configurar el middleware.
- a) `panel.portalmaker.com` (subdominio dedicado)
- b) `portalmaker.com` (dominio raíz, sin subdominio de tienda)
- c) Otro dominio / todavía no definido

**P3 (Fase 1):** ¿Cuál es el nombre del proyecto en Supabase y en Cloudflare Pages? ¿O se crean desde cero como parte de la Fase 1?

### Base de datos y comportamiento

**P4 (Fase 1):** El trigger de `suscripcion_activa = false` automático al vencer `dias_gracia` — ¿debe correr via un cron job de Supabase (pg_cron) o es suficiente con calcularlo al vuelo en tiempo de render (sin cambiar el campo en la base de datos)?
- a) Cron job: cambia el campo en la DB → más consistente, requiere `pg_cron` activado en Supabase
- b) Calculado al vuelo: el middleware/server-side compara fechas en tiempo real → más simple, sin infraestructura extra
- c) Automático por trigger de DB, pero no vía cron (requiere evento que lo dispare, p. ej. al cargar el panel del superadmin)

**P5 (Fase 1):** `subscription_payments.comprobante_url` — ¿es obligatorio o opcional?
- a) Opcional — sin Storage bucket dedicado
- b) Opcional pero con bucket de Storage → necesito crear el bucket y configurar permisos
- c) Obligatorio — siempre se adjunta comprobante

**P6 (Fase 2):** En el catálogo público, cuando se filtra por tipo de proceso, ¿los filtros son acumulables (AND) o alternativos (OR)?
- a) AND — "categoría X + proceso Y" muestra solo lo que cumple ambos
- b) OR dentro del mismo tipo, AND entre tipos distintos (patrón típico de e-commerce)
- c) Definir cuando implementemos, no es urgente ahora

**P7 (Fase 2):** Para el registro de `product_views`, ¿se excluyen las visitas del propio admin logueado?
- a) Sí, excluir si el JWT corresponde al `admin_email` de la tienda
- b) No, contar todas las visitas (más simple, métricas levemente infladas)

**P8 (Fase 3):** El editor de contenido de `store_pages` — ¿qué tipo de editor querés?
- a) Markdown con preview lado a lado (más técnico, más potente)
- b) Editor WYSIWYG simple (tipo básico de `@uiw/react-md-editor` o similar) — más amigable para el admin no técnico
- c) Textarea plano de HTML (máxima flexibilidad, requiere conocimiento técnico del admin)

**P9 (Fase 3):** El campo `stores.ga_measurement_id` (Google Analytics) y `meta_pixel_id` — ¿se inyectan como scripts en el `<head>` del layout público automáticamente al estar cargados, o el admin tiene que "activarlos" manualmente?
- a) Automático: si hay ID cargado, se inyecta el script en el head
- b) Con toggle explícito: el admin activa/desactiva desde `/admin/configuracion`

**P10 (Fase 4, BLOQUEANTE si se implementa Checkout):** El trigger de `stock_movement` tipo `'venta'` — ¿se dispara solo al pasar a `estado_pago = 'aprobado'`, o también en pedidos con pago en efectivo/transferencia que quedan en "pendiente de aprobación manual"?
- a) Solo al aprobarse el pago (nunca descontar stock de pago no confirmado)
- b) Al crearse el pedido, independientemente del estado de pago (reserva de stock inmediata)

### Diseño y UX

**P11 (Fase 1):** ¿Cuál es el dominio de la plataforma? Lo necesito para armar las URLs en el mensaje de WhatsApp pre-cargado y para el SEO.

**P12 (Fase 2):** El mensaje de WhatsApp con referencia al producto — ¿debe incluir el link a la página del producto, o solo el nombre?
- a) Solo nombre + variante (más simple, funciona sin URL pública disponible en dev)
- b) Nombre + variante + URL completa del producto (mejor para el vendedor, pero necesita el dominio del P11)

**P13 (Fase 3):** En `/admin/branding`, ¿el preview de colores es:
- a) Preview en tiempo real de un componente representativo (botón, header, card de producto)
- b) Preview de la tienda completa en un iframe (más potente, más complejo)

**P14 (Fase 3):** Las 5 páginas que se precargan por defecto al dar de alta una tienda nueva (`contacto`, `sobre-nosotros`, `preguntas-frecuentes`, `envios-y-devoluciones`, `terminos-y-condiciones`) — ¿se crean con contenido de ejemplo/placeholder, o completamente vacías para que el admin las llene?
- a) Con texto de ejemplo/placeholder (guía al admin sobre qué poner)
- b) Vacías, con el título solamente

### Operativo / deployment

**P15 (Fase 1):** ¿Cuándo arrancamos? ¿Vamos de frente con la Fase 1 completa (setup + SQL + middleware), o empezamos con algo más chico para validar que el stack funciona en Cloudflare Pages antes de comprometer todo el schema?

---

## Checklist de "clavos sueltos" del documento fuente

| # | Clave | Estado |
|---|---|---|
| v3.1 | ¿Qué pasa al vencer `dias_gracia`? → Ver P4 | ⏳ pendiente |
| v3.2 | ¿`comprobante_url` obligatorio? → Ver P5 | ⏳ pendiente |
| v3.3 | Compatibilidad `@cloudflare/next-on-pages` con rutas `[slug]` dinámicas | Se valida en Fase 1 |
| v3.4 | Dominio/subdominio de `/superadmin` → Ver P2 | ⏳ pendiente |
| v3.5 | Backup exportable al dar de baja un cliente | Backlog — agendar antes de primer cliente real |
| v3.6 | Validación server-side de precios → Incluida en Fase 4 | ✅ cubierta |
| v4.1 | ¿Excluir visitas del admin en `product_views`? → Ver P7 | ⏳ pendiente |
| v4.2 | Producto sin stock: bloquear o derivar → **Resuelto en v5**: nunca bloquea, deriva a WhatsApp | ✅ cubierta |
| v4.3 | Stock movement de venta: solo con pago aprobado → Ver P10 | ⏳ pendiente |
| v6.1 | Contraste WCAG AA (4.5:1) para modo oscuro automático → **Resuelto en v6** | ✅ cubierta |
| v7.1 | Valores hex de 6 paletas → **Resuelto en v7/v8** | ✅ cubierta |

---

## Verificación

### Automated Tests
- `next build` debe completar sin errores de TypeScript
- `wrangler pages dev` (build de Cloudflare) debe servir la app localmente
- Queries de Supabase deben respetar RLS + GRANTs antes de mergear cualquier feature

### Manual Verification
- Flujo completo: crear tienda desde `/superadmin` → visitar dominio de tienda → agregar producto con ficha extendida → ver catálogo público → ir a página de producto → verificar botón según stock → ir a página informativa dinámica
- Panel admin: subir logo, cambiar paleta, ver preview
- Panel admin: ver sección `/admin/suscripcion` después de que el developer registra un pago
