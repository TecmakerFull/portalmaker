<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Portalmaker — Contexto y reglas para agentes de IA

> portalmaker.com.ar (también portalmaker.ar) · Next.js 15.5 (App Router) + React 19 + Tailwind 4 + Supabase + Vercel

## Qué es el producto (posicionamiento actual)

Plataforma SaaS **multi-tenant de comercio** para Argentina, al estilo Tiendanube, con WhatsApp como canal principal. Nació para makers (impresión 3D, láser, CNC), pero **hoy apunta a cualquier persona o negocio que quiera vender**. No hay que asumir un rubro maker en código nuevo, textos, ejemplos, prompts de IA ni modelo de datos. Los términos "maker" y "taller" que todavía aparecen en la UI y en `lib/plans.ts` son herencia y se van a generalizar.

**Próxima gran línea (todavía no empezada):** módulo para **prestadores de servicios**, con agenda de turnos, calendario, disponibilidad y sincronización con Google Calendar. Hay que diseñar pensando en que una "tienda" puede vender productos, servicios o ambos.

## Fuentes de verdad

- **Schema SQL:** `supabase/schema.sql`. Toda tabla, función o política nueva se agrega ahí **y** en una migración fechada en `supabase/migrations/` (los cambios en producción se aplican con migraciones; schema.sql documenta el estado completo).
- **Tipos:** `types/database.ts`, sincronizado con el schema.
- **Planes y límites:** `lib/plans.ts` (`free`, `starter`, `maker_pro`, `enterprise`, `bonificado` más `features_override` por tienda). Helpers: `isFeatureAllowed`, `getStoreEffectiveLimit`.
- **Documentos históricos** (sirven de contexto, pero no reflejan el estado actual): `maker-shop-plan-implementacion.md` (v3–v10), `implementation_plan.md` (menciona Cloudflare: el deploy real es Vercel), `BACKLOG_FEATURES.md` (roadmap estilo Jumpseller), `documentacion/` (Mercado Pago, envíos y manual del usuario).

## Reglas críticas (no negociables)

1. **Sin emojis** en la UI ni en mensajes de WhatsApp o emails generados por el sistema.
2. **Solo `lucide-react`** para iconografía.
3. **Mobile-first**: estilos base para mobile, variantes `sm:` / `md:` / `lg:` / `xl:`.
4. **Touch targets de al menos 44×44px** en mobile.
5. **Sin hover-only**: todo lo que se ve al pasar el mouse tiene alternativa por tap.
6. **Código comentado**: explicar el "por qué", no el "qué".
7. **GRANTs de Supabase obligatorios** en cada tabla nueva (ver el patrón en `supabase/schema.sql`).
8. **Pesos tipográficos sutiles**: no usar `font-black` ni `font-extrabold`. Usar `font-semibold` / `font-medium`, y `font-bold` solo con moderación.
9. **Sin navegador**: prohibido usar subagentes de navegador o interacción DOM. Validar con `tsc`, tests (`npm test`) o llamadas HTTP.

## Arquitectura multi-tenant (real)

```
portalmaker.com.ar / portalmaker.ar   → app/(portal)/   landing, login, /dashboard/maker, /dashboard/admin (superadmin)
[slug].portalmaker.com.ar             → middleware hace rewrite a app/tienda/*  (tienda pública + /admin)
dominio propio (custom_domain)        → idem, resuelto por custom_domain (apex o www)
localhost / *.vercel.app ?tenant=slug → simulación de tienda en desarrollo y previews
```

- `middleware.ts` **borra** los headers `x-store-slug`, `x-store-domain` y `x-tenant-source` que mande el cliente y los vuelve a inyectar; además comparte la cookie de sesión entre subdominios.
- Los Server Components llaman a `getTenantStore()` (`lib/tenant.ts`, cacheado por request). Los visitantes leen la vista `stores_public`; dueños y superadmin leen `stores` según RLS.
- No existe un route group `(tienda)`: la tienda vive en `app/tienda/` y se llega por rewrite.

## Mapa de módulos

- **Tienda pública** `app/tienda/`: catálogo, `productos/[slug]`, carrito (`lib/cart-context.tsx`), `checkout`, `pedido-confirmado`, `seguimiento/[token]`, `cuenta` (cuenta de comprador con magic link y contraseña), `favoritos`, `legal`, `sobre-nosotros`, `contacto`, `ayuda`.
- **Admin de tienda** `app/tienda/admin/`: productos, categorías, ventas, clientes (CRM), envíos, pagos, branding/diseño, banners, reseñas, suscriptores (newsletter con export CSV), colaboradores, dominio, suscripción, perfil, guía.
- **API** `app/api/`:
  - checkout: `orders` (precios y stock siempre desde la base), `mercadopago/preference`, `shipping/quote`, `transfer-details`
  - webhooks: `mercadopago` (HMAC), `zipnova` (secreto compartido)
  - crons (Vercel, `CRON_SECRET`): `mp-reconcile` y `shipments`
  - OAuth de Mercado Pago: `auth/mercadopago/*`
  - auth de compradores: `auth/store-magic-link` y `auth/store-recover`
  - IA con Gemini: `ai/*`
  - `colaboradores/invitar`, `store/*`, `tienda/admin/*`
- **Pagos:** Mercado Pago marketplace con OAuth por tienda y `marketplace_fee` (`lib/mercadopago.ts`, `lib/mp-payments.ts`, RPC `process_approved_payment`), más transferencia bancaria. Los tokens viven solo en `store_mp_credentials` (accesible únicamente con service_role).
- **Envíos:** `lib/shipping/` (registry de proveedores, manual y Zipnova, credenciales cifradas con `SHIPPING_ENC_KEY`, automatización post-pago). Las etiquetas se guardan en el bucket privado `shipping-labels`.
- **Infraestructura:** Resend (emails), Upstash (rate limit, con fallback en memoria), Turnstile (opcional en checkout), Vercel Domains API (`lib/vercel-domains.ts`), Georef (direcciones).

## Supabase y seguridad (convenciones obligatorias)

- `lib/supabase/server.ts` tiene `createSupabaseServerClient()` (sesión del usuario, respeta RLS) y `createSupabaseAdminClient()` (service_role, **solo en servidor**, saltea RLS y el trigger de columnas protegidas).
- **Toda Server Action o Route Handler que use service_role** valida primero la sesión y los permisos con `verifyStoreAccess()` (`lib/store-auth.ts`). Las Server Actions son endpoints públicos: nunca confiar en IDs, dominios, precios ni nombres que mande el cliente.
- **Emails con `.ilike()`**: usar siempre `emailIlikePattern()` (`lib/sql-utils.ts`). Sin escapar, `_` y `%` funcionan como comodines y permiten heredar permisos de otro email.
- **Redirecciones de auth** (`redirectTo`, `next`, `store_origin`) con origen absoluto: validar con `getTrustedOrigin()` / `getTrustedRedirectUrl()` (`lib/safe-redirect.ts`). Los dominios propios solo cuentan como confiables si `custom_domain_verified = true`.
- **Emails públicos con identidad de tienda**: los datos de marca se leen de la base (`lib/store-auth-email.ts`) y todo se escapa. Nunca interpolar HTML que venga del cliente.
- **Columnas protegidas de `stores`** (trigger `protect_store_sensitive_columns`): plan, precio_mensual, limite_productos, features_override, modo_operacion, checkout_activo, comision_portalmaker, suscripcion_activa, slug, admin_email, estado_pago, fechas y días de gracia, notas_admin, mp_connected, custom_domain_verified. Solo las modifican el superadmin o el service_role. Si se agrega una columna que dependa del plan o de la facturación, sumarla al trigger.
- **Webhooks y crons** fallan cerrados en producción si falta el secreto.
- Headers de seguridad globales en `next.config.ts` (nosniff, Referrer-Policy, `X-Frame-Options: SAMEORIGIN`, Permissions-Policy).

## Paletas y modo oscuro

- 6 paletas preset en `lib/constants.ts` (8 valores cada una: 4 para claro y 4 para oscuro). Con el color picker libre, los valores oscuros quedan `null` y se calculan con contraste WCAG AA (4.5:1).
- El toggle claro/oscuro lo elige el **visitante** (localStorage), no el admin.

## Botón de acción del producto (3 estados)

```
gestiona_stock = false             → "Consultar" (WhatsApp general)
gestiona_stock = true, stock > 0   → "Comprar" (checkout si la tienda lo tiene activo)
gestiona_stock = true, stock = 0   → "Consultar disponibilidad" (WhatsApp con referencia al producto)
```

## Estado de funcionalidades

- **Ya implementado** (antes figuraba en el backlog): newsletter/suscriptores, cuenta de comprador, favoritos, reseñas, colaboradores con roles (admin, editor, colaborador), couriers (Zipnova), seguimiento de pedidos.
- **Backlog (no implementar sin pedido explícito):** cupones, factura PDF, 2FA, editor visual de páginas, blog, recomendaciones automáticas e import/export CSV de catálogo.
- **Roadmap próximo:** generalizar textos y planes fuera del rubro maker; módulo de turnos y servicios con Google Calendar.

## Desarrollo

- `npm run dev` (ejecuta `dev.js` con polling para WSL), `npm run build`, `npm test` (tests de `lib/shipping`), `npx tsc --noEmit`.
- `eslint-config-next` 16.x convive con `next` 15.5 a propósito: usa la flat config de `eslint.config.mjs` y funciona. No bajarlo sin migrar la configuración.
- Variables de entorno: ver `.env.example`. En producción deben existir `MP_WEBHOOK_SECRET`, `CRON_SECRET`, `ZIPNOVA_WEBHOOK_SECRET`, `SHIPPING_ENC_KEY`, `UPSTASH_REDIS_REST_URL/TOKEN`, `RESEND_API_KEY` y `VERCEL_AUTH_TOKEN/PROJECT_ID`. Nunca imprimir sus valores.
