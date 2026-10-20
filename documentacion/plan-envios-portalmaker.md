# PortalMaker — Plan de integración de envíos (Argentina)

Base: auditoría de Antigravity corregida (Next.js 15 + Supabase, **hosting en Vercel con funciones Node.js**, sin Edge Functions de Supabase, sin colas, sin pg_cron, sin tests, sin staging, sin sandbox de MP).

---

## 0. Decisiones de diseño (defaults; avisar si alguna cambia)

| # | Decisión | Default propuesto |
|---|---|---|
| D1 | Modelo de cuentas | **Descentralizado**: cada dueño conecta SU cuenta de envíos (igual que Mercado Pago). El portal no liquida envíos. |
| D2 | Proveedor principal | **Zipnova** (multi-correo, una sola integración). Correo Argentino/MiCorreo y Andreani directo quedan como adaptadores opcionales. |
| D3 | Quién paga el envío | El cliente paga lo cotizado (+ markup opcional de la tienda). Envío gratis desde un monto configurable por tienda. |
| D4 | Comisión 2% del portal | Se calcula **solo sobre productos**, no sobre el envío (configurable). |
| D5 | Recargo MP de la tienda | Se calcula sobre productos + envío (como cobertura del costo de MP). |
| D6 | Modalidades | Domicilio, sucursal (si el proveedor lo permite) y retiro en local (siempre disponible). |
| D7 | Zonas manuales existentes (`shipping_zones`) | Se mantienen como proveedor `manual` (útil para envío local, ej. Rosario). |
| D8 | Cifrado de credenciales | AES-256-GCM en la app (`node:crypto`), clave en `SHIPPING_ENC_KEY`. No texto plano. |
| D9 | Sin colas | Creación de envío con `waitUntil` (`@vercel/functions`) + 3 reintentos en línea + cron de Vercel como red de seguridad + botón "Reintentar" manual. Frecuencia del cron según plan (ver sección 1). |

**Advertencia sobre la sección 15 de la auditoría:** los endpoints de carriers que listó Antigravity no están verificados (varios parecen inferidos). En la documentación de MiCorreo que revisé aparecen register, token, users/validate, rates, agencies y shipping/import, **sin endpoint de etiqueta ni de tracking**. Por eso, con Correo Argentino directo la etiqueta no sería automática. Regla: ningún adaptador se escribe hasta tener documentación oficial + credenciales sandbox y respuestas reales grabadas.

---

## 1. Reglas operativas sobre el Supabase actual

- [ ] **Respaldo previo:** Antes de cada migración, avisar al usuario para que realice un respaldo en Supabase; NUNCA aplicar nada sin su confirmación explícita ("OK").
- [ ] **SQL y diff visible:** Mostrar el SQL completo y los diffs de código antes de aplicarlos.
- [ ] **Feature flag:** Todo el código nuevo de envíos queda condicionado a `stores.envios_activo` (default `false`), manteniendo intacto el funcionamiento de las tiendas actuales.
- [ ] **Solo Sandbox:** Usar exclusivamente credenciales de sandbox (Zipnova, carriers y Mercado Pago de prueba); nunca credenciales reales ni emails a destinatarios reales en las pruebas.
- [ ] **Migraciones no destructivas:** Las migraciones solo agregan columnas y tablas nuevas, sin borrar ni alterar datos existentes.
- [ ] **Plan de Vercel:** Tener en cuenta la cadencia de cron (diario en Hobby, por minuto en Pro).
- [ ] **Clave de cifrado:** Generar `SHIPPING_ENC_KEY` (32 bytes aleatorios en base64) y guardarla en Vercel + `.env.local`.

---

## 2. Esquema de base de datos (migración propuesta)

```sql
-- 2.1 Origen y configuración por tienda
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

-- 2.1b Zonas de envío manuales existentes (shipping_zones)
alter table shipping_zones
  add column if not exists codigos_postales text[] not null default '{}',
  add column if not exists plazo_texto text;

-- 2.2 Medidas por variante (null = hereda del producto) y valor declarado
alter table product_variants
  add column if not exists peso_kg numeric(6,3),
  add column if not exists alto_cm numeric(6,2),
  add column if not exists ancho_cm numeric(6,2),
  add column if not exists profundidad_cm numeric(6,2);

alter table product_details
  add column if not exists valor_declarado numeric(12,2); -- null = precio efectivo

-- 2.3 Dirección de entrega estructurada en pedidos (se mantiene direccion_entrega como texto legible)
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

-- 2.4 Credenciales por tienda y proveedor (cifradas)
create table store_shipping_providers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  provider text not null check (provider in ('zipnova','correo_argentino','andreani','manual')),
  activo boolean not null default false,
  credentials_enc text,            -- JSON cifrado AES-GCM (iv.ciphertext en base64)
  config jsonb not null default '{}',
  status text not null default 'sin_verificar'
    check (status in ('sin_verificar','ok','credenciales_invalidas','error')),
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, provider)
);

-- 2.5 Cotizaciones guardadas en servidor (evita confiar en precios del navegador)
create table shipping_quotes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  codigo_postal text not null,
  cart_hash text not null,         -- hash(items verificados + cantidades + cp)
  options jsonb not null,          -- [{id, provider, service, modalidad, precio, plazo_dias, sucursal?}]
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index on shipping_quotes (store_id, cart_hash);

-- 2.6 Envíos
create table shipments (
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
  label_path text,                 -- ruta en bucket privado
  estado text not null default 'pendiente'
    check (estado in ('pendiente','creando','creado','etiquetado','despachado','en_camino','entregado','incidencia','cancelado','error')),
  error_message text,
  attempts int not null default 0,
  next_retry_at timestamptz,
  idempotency_key text not null unique,   -- 'order:<order_id>:1', 'order:<order_id>:2' (permite recrear tras cancelación)
  raw jsonb,                       -- payload sanitizado (NUNCA credenciales ni tokens)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index shipments_one_active_per_order on shipments(order_id) where estado <> 'cancelado';
create index on shipments (store_id, estado);
create index on shipments (next_retry_at) where estado in ('pendiente','error');

create table shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments(id) on delete cascade,
  store_id uuid not null,
  provider_event_id text,
  estado text not null,
  descripcion text,
  ocurrido_at timestamptz not null default now(),
  source text not null check (source in ('webhook','poll','manual','system')),
  raw jsonb,
  unique (shipment_id, provider_event_id)
);

-- 2.7 Historial de pedidos (hoy no existe)
create table order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  store_id uuid not null,
  tipo text not null,              -- 'estado_pedido','estado_pago','envio'
  de text, a text,
  actor text,                      -- email o 'system'
  created_at timestamptz not null default now()
);

-- 2.8 RLS
alter table store_shipping_providers enable row level security;
revoke all on store_shipping_providers from anon, authenticated;
grant all on store_shipping_providers to service_role;

alter table shipping_quotes enable row level security;
revoke all on shipping_quotes from anon, authenticated;
grant all on shipping_quotes to service_role;

alter table shipments enable row level security;
alter table shipment_events enable row level security;
alter table order_events enable row level security;
-- lectura solo para el admin de la tienda y superadmin (mismo patrón que orders); escritura solo service_role
-- (Antigravity: replicar el patrón exacto de admin_all_orders pero SELECT-only)
```

Storage: bucket privado `shipping-labels`, acceso solo por URL firmada de corta vida generada en servidor tras validar `isStoreAdmin`.

---

## 3. Contratos de las piezas de código

**Interfaz común** (`lib/shipping/types.ts`):
```ts
interface CarrierProvider {
  verifyCredentials(): Promise<{ok: boolean; error?: string}>
  quote(input: QuoteInput): Promise<QuoteOption[]>
  listBranches?(input: {cp?: string; provincia?: string}): Promise<Branch[]>
  createShipment(input: ShipmentInput): Promise<{providerShipmentId: string; tracking?: string; trackingUrl?: string; costoReal?: number}>
  getLabel?(providerShipmentId: string): Promise<{pdf: ArrayBuffer} | {url: string}>
  getTracking(providerShipmentId: string): Promise<TrackingEvent[]>
  cancelShipment?(providerShipmentId: string): Promise<void>
}
```
- Solo `fetch` nativo, sin SDKs de carriers, para controlar timeouts y evitar dependencias.
- En las rutas de cotización y de creación de envío declarar `export const maxDuration` explícito (ej. 60) y verificar el límite real de tu plan: la auditoría dice 15 s en Hobby y la documentación oficial de Vercel indica 300 s por defecto, así que confirmalo en tu dashboard.
- Timeout de 8 s por llamada, 1 reintento en 5xx/red, cache de tokens JWT en memoria con margen de expiración.
- Errores tipados: `AUTH`, `VALIDATION`, `NO_COVERAGE`, `TIMEOUT`, `UPSTREAM`.

**Endpoints propios:**
- `POST /api/checkout/shipping/quote` — entrada: `store`, `items[]`, `codigoPostal`. Recalcula precios/medidas desde la DB, agrupa bultos, consulta proveedores activos en paralelo, aplica markup/gratis, guarda `shipping_quotes` (TTL 30 min) y devuelve opciones con `quote_id`. Rate limit + Turnstile.
- `GET /api/checkout/shipping/branches` — sucursales por CP/provincia.
- `POST /api/checkout/orders` — acepta dirección estructurada + `quote_id` + `option_id`. Verifica `cart_hash` y vigencia; si venció, recotiza; si el carrier falla y existe `envio_tarifa_fallback`, usa el fallback marcándolo. Guarda `costo_envio` real.
- `POST /api/checkout/mercadopago/preference` — agrega ítem `Envío` (`unit_price = costo_envio`); `marketplace_fee` según D4; la validación de total contempla el envío.
- `POST /api/webhooks/zipnova` — verificación de firma/secreto, idempotente por `provider_event_id`.
- `GET /api/cron/shipments` (declarado en `vercel.json`; Vercel siempre hace GET; validar `Authorization: Bearer ${CRON_SECRET}`) — reintenta `pendiente/error` vencidos, consulta tracking de envíos activos, expira cotizaciones. Debe ser **idempotente**: un cron puede dispararse más de una vez. Cadencia: Pro cada 5 min; Hobby una vez por día (o un scheduler externo apuntando a la ruta protegida).
- Refresco de tracking bajo demanda: la página pública de seguimiento consulta al carrier si el último dato tiene más de 15 min (con cache y rate limit). Así el cliente ve datos frescos aunque el cron sea diario.
- `GET /api/tienda/admin/envios/[id]/label` — URL firmada de etiqueta, solo admin.

**Flujo post-pago:**
1. Webhook MP aprobado → `process_approved_payment` (sin cambios) devuelve `first_time=true`.
2. Se inserta `shipments` (`pendiente`, `idempotency_key = order:<id>`) y se intenta crear con `waitUntil` de `@vercel/functions`, sin demorar la respuesta del webhook de MP.
3. OK → guarda tracking/etiqueta, estado `creado`, evento, email al comprador. Falla → 3 intentos en línea (a 0 s, 15 s y 60 s) y, si siguen fallando, estado `error` + `next_retry_at` + alerta al dueño. Luego lo retoma el cron o el botón "Reintentar".
4. Retiro en local no crea envío en el carrier; avisa al dueño y al comprador.

**Emails nuevos al comprador** (Resend): confirmación de pedido, envío despachado con tracking, entregado. Hoy no existe ninguno.

---

## 4. Fases de ejecución

Cada fase termina con: typecheck + lint + tests pasando, diff mostrado, nada migrado a producción sin mi OK.

### Fase 1 — Base de datos y datos de producto
- [ ] Migración 2.1–2.8 aplicada en **staging**
- [ ] Formularios de admin: origen de despacho (CP obligatorio), peso/medidas por variante, valor declarado
- [ ] Aviso en el admin de productos sin peso/medidas ("no podrán cotizarse")
- [ ] Verificar cómo se usa hoy `shipping_zones` y `orders.zona_envio_id`

### Fase 2 — Capa de proveedores
- [ ] `lib/shipping/` con interfaz, cifrado AES-GCM, registro de proveedores
- [ ] Adaptador `manual` (zonas existentes)
- [ ] Adaptador Zipnova contra sandbox con respuestas reales grabadas como fixtures
- [ ] Vitest instalado; tests de contrato y de cifrado

### Fase 3 — Panel de envíos del dueño
- [ ] `/tienda/admin/envios`: conectar cuenta, verificar credenciales, activar proveedores, markup, gratis desde, fallback, retiro en local
- [ ] Enlace en el sidebar (ícono Truck)

### Fase 4 — Checkout, cotización y Mercado Pago
- [ ] Formulario de checkout con campos estructurados (CP primero)
- [ ] Endpoint de cotización, selector de opciones y de sucursal
- [ ] `orders/route.ts` y `preference/route.ts` con envío; total consistente
- [ ] Tests: total con envío, cotización vencida, CP sin cobertura, carrier caído, manipulación de precio desde el navegador

### Fase 5 — Automatización post-pago
- [ ] Creación de envío tras pago aprobado, idempotente
- [ ] Etiqueta en bucket privado, descarga desde el panel
- [ ] Webhook/polling de tracking, `shipment_events`, `order_events`
- [ ] Emails al comprador; página pública de seguimiento por `public_token`
- [ ] Cron `/api/cron/shipments` en `vercel.json` (probarlo en staging llamando la ruta a mano con `CRON_SECRET`, porque los cron no corren en previews)

### Fase 6 — Paneles, pruebas y salida
- [ ] Ventas: estado de envío, reimprimir etiqueta, reintentar, cancelar
- [ ] Superadmin: errores de envío por tienda
- [ ] Pruebas end-to-end en staging con MP de prueba; luego un envío real de bajo costo
- [ ] Migración a producción, monitoreo y documentación para dueños

### Fase 7 (opcional) — Correo Argentino y Andreani directos
- [ ] Solo después de tener credenciales y documentación oficial; MiCorreo sin etiqueta automática (carga en panel de Correo)

---

## 5. Prompts para Antigravity

> Pegar de a uno. Esperar el resultado de cada uno antes de pasar al siguiente.

### Prompt general (anteponer a todos)
```
Contexto: PortalMaker (Next.js 15 App Router, Supabase actual, hosting en Vercel con funciones Node.js, sin Edge Functions de Supabase, sin colas, sin tests). Estamos agregando envíos para Argentina siguiendo el documento plan-envios-portalmaker.md. Reglas: (1) antes de cada migración avisar al usuario para respaldo y no aplicar nada sin su OK; (2) mostrar el SQL completo y los diffs antes de aplicar; (3) todo código nuevo de envíos queda detrás de stores.envios_activo (default false); (4) usar solo credenciales de sandbox (Zipnova, carriers y Mercado Pago de prueba); nunca credenciales reales ni emails a destinatarios reales en pruebas; (5) migraciones no destructivas (solo agregar columnas y tablas, sin borrar ni alterar datos existentes); (6) usar fetch nativo para llamar a los carriers, sin SDKs de terceros; (7) todo precio, peso y total se recalcula en el servidor; (8) las credenciales de carriers van cifradas (node:crypto) y nunca llegan al cliente; (9) no inventar endpoints de carriers; (10) al terminar correr typecheck, lint y tests y reportar el resultado.
```

### Prompt Fase 1
```
FASE 1. (a) Creá la migración SQL de las secciones 2.1 a 2.8 del plan en supabase/migrations/ con nombre fechado; aplicá RLS con el mismo patrón de admin_all_orders pero solo SELECT para admin de tienda y superadmin en shipments, shipment_events y order_events; las tablas store_shipping_providers y shipping_quotes solo para service_role. (b) Antes de aplicar, investigá cómo se usan hoy shipping_zones y orders.zona_envio_id y decime si hay conflicto. (c) Agregá en el admin: formulario de origen de despacho en /tienda/admin/contacto o una sección nueva (calle, altura, piso, localidad, provincia, CP obligatorio con validación de 4 dígitos o formato CPA, CUIT con validación de dígito verificador, teléfono, email); campos peso/alto/ancho/profundidad por variante con "heredar del producto" cuando estén vacíos; campo valor declarado en detalles del producto. (d) Mostrá un aviso en el listado de productos para los que no tengan peso y medidas. (e) Mostrame el SQL y diff completos, avisame para hacer el respaldo de Supabase y no apliques nada hasta tener mi OK explícito. Tras tu aplicación verificá columnas, constraints y RLS.
```

### Prompt Fase 2
```
FASE 2. Creá lib/shipping/ con: types.ts (interfaz CarrierProvider del plan), crypto.ts (AES-256-GCM con node:crypto, clave SHIPPING_ENC_KEY base64, formato iv.ciphertext), errors.ts (AUTH, VALIDATION, NO_COVERAGE, TIMEOUT, UPSTREAM), http.ts (fetch con timeout 8s, 1 reintento en 5xx/red, sin loguear credenciales ni datos personales), registry.ts (carga el proveedor activo de una tienda descifrando credenciales con createSupabaseAdminClient), manual.ts (adaptador sobre shipping_zones existentes) y zipnova.ts. PARA ZIPNOVA: primero pedime la documentación oficial vigente y las credenciales sandbox; no uses los endpoints de la auditoría anterior sin verificarlos. Si no los tengo todavía, dejá el adaptador con la interfaz y TODOs explícitos y avisame. Instalá Vitest y escribí tests: cifrado/descifrado, manejo de errores y timeouts con fetch mockeado, y tests de contrato con fixtures de respuestas reales cuando las tengamos. Agregá el script "test" a package.json.
```

### Prompt Fase 3
```
FASE 3. Creá /tienda/admin/envios (page + componentes) y el enlace en sidebar.tsx con ícono Truck. Debe permitir al dueño: conectar su cuenta de Zipnova (los campos que defina el adaptador), botón "Verificar credenciales" que llame a verifyCredentials y guarde status/last_verified_at; activar/desactivar proveedores (manual, zipnova); configurar envio_gratis_desde, envio_markup_porcentaje, envio_tarifa_fallback, retiro en local, y envio_comision_incluye_envio. Todas las escrituras de credenciales pasan por un Route Handler de servidor que cifra; el cliente nunca recibe credenciales descifradas (solo "configurado: sí/no"). Validá con isStoreAdmin en cada handler. No muestres la tienda con envíos activos si no hay origen completo y al menos un proveedor verificado.
```

### Prompt Fase 4
```
FASE 4. (a) checkout-form.tsx: pedí CP primero y enviá campos estructurados (calle, altura, piso/depto, localidad, provincia, CP, referencias, y DNI solo si el servicio elegido lo exige). (b) Creá POST /api/checkout/shipping/quote y GET /api/checkout/shipping/branches según el plan: recalcular ítems, precios y medidas desde la DB, agrupar bultos (suma de pesos, volumen consolidado, valor declarado), consultar proveedores activos en paralelo con timeout, aplicar markup y envío gratis, guardar shipping_quotes con cart_hash y TTL 30 min, rate limit + Turnstile. (c) UI: lista de opciones con precio y plazo, selector de sucursal, opción de retiro en local. (d) orders/route.ts: aceptar quote_id y option_id, verificar cart_hash y vigencia, recotizar si venció, usar envio_tarifa_fallback si el carrier falla (marcándolo), guardar costo_envio real y campos envio_*; sacar el costo_envio hardcodeado en 0. (e) preference/route.ts: agregar ítem "Envío"; marketplace_fee sobre productos salvo envio_comision_incluye_envio; actualizar la validación del total para incluir envío sin disparar TOTAL_MISMATCH. (f) Tests de: total con envío, cotización vencida, CP sin cobertura, carrier caído con y sin fallback, y intento de manipular precios desde el navegador. No toques la verificación de firma del webhook de MP.
```

### Prompt Fase 5
```
FASE 5. (a) En el flujo de pago aprobado (processMpPayment) cuando first_time=true: insertar shipments con idempotency_key 'order:<id>' y llamar a createShipment con waitUntil de @vercel/functions; guardar tracking, tracking_url, etiqueta en el bucket privado shipping-labels, estado y shipment_events; si falla, 3 intentos en línea (0 s, 15 s, 60 s) y, si siguen fallando, estado 'error', attempts+1 y next_retry_at; ahí notifyPlatformAlert al dueño. Garantizá que un webhook de MP duplicado jamás cree dos envíos. (b) /api/cron/shipments protegido con CRON_SECRET: reintenta envíos vencidos, consulta tracking de envíos activos y expira shipping_quotes; agregalo a vercel.json (recordá que es GET, valida Authorization Bearer CRON_SECRET, puede dispararse dos veces y debe ser idempotente) y decime qué cadencia admite mi plan de Vercel. Agregá también el refresco de tracking bajo demanda en la página de seguimiento (cache de 15 min). (c) /api/webhooks/zipnova con verificación de firma si el proveedor la ofrece (si no, secreto en URL), idempotente. (d) Registrar order_events en cada cambio de estado_pedido y estado_pago, incluyendo los cambios manuales del panel. (e) Emails al comprador con Resend: confirmación de pedido, despachado con tracking, entregado. (f) Página pública de seguimiento usando public_token. (g) Tests: webhook duplicado, fallo del carrier, reintento exitoso, retiro en local sin envío.
```

### Prompt Fase 6
```
FASE 6. (a) En ventas-manager.tsx mostrar estado de envío, tracking, botón de etiqueta (URL firmada generada en servidor tras isStoreAdmin), reintentar y cancelar. (b) Panel superadmin: listado de envíos en error por tienda. (c) Tests end-to-end en staging con Mercado Pago de prueba (agregá un switch MP_SANDBOX para usar sandbox_init_point sin afectar producción). (d) Checklist de salida: variables de entorno en Vercel (Production y Preview), migración a producción con backup previo, plan de rollback, monitoreo de errores y documentación corta para dueños. Entregá el checklist completo y esperá mi OK antes de tocar producción.
```

---

## 6. Riesgos a tener presentes

- **Tokens de Mercado Pago en texto plano** (hallazgo de la auditoría): conviene cifrarlos con el mismo módulo de la Fase 2 en una tarea aparte.
- **Sin staging ni tests**: Fase 1 y 2 los resuelven; no saltearlas.
- **Vercel**: duración máxima de funciones y cron según plan; por eso timeouts cortos por llamada, `maxDuration` explícito y creación de envío desacoplada del request del comprador con `waitUntil`.
- **Cron en Hobby**: solo diario y con imprecisión de hasta una hora. Los reintentos no dependen de él (se hacen en línea), pero un envío que falle los 3 intentos puede quedar horas sin reintento automático. Pro o un scheduler externo lo resuelve.
- **Productos sin medidas**: sin peso no hay cotización; el fallback y los avisos en admin son parte del diseño, no opcionales.
- **Cambio de precios del carrier entre cotización y creación**: guardar `costo_cotizado` y `costo_real` y mostrar la diferencia al dueño.
