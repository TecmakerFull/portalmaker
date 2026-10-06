<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Portalmaker — Reglas para agentes de IA

> "El portal del Maker" | portalmaker.com.ar
> Stack: Next.js 15 + Tailwind CSS + Supabase + Cloudflare Pages

## Fuentes de verdad

- **Plan técnico:** `maker-shop-plan-implementacion.md` (versiones v3–v10)
- **Feature catalog:** documento de trabajo con las 102 funcionalidades clasificadas
- **Schema SQL:** `supabase/schema.sql` — toda tabla nueva debe agregarse ahí primero
- **Tipos TypeScript:** `types/database.ts` — se sincroniza con el schema

## Reglas críticas (no negociables)

1. **Sin emojis** en ninguna parte de la UI ni en mensajes de WhatsApp generados por el sistema
2. **Solo `lucide-react`** para iconografía — no mezclar con otras librerías de íconos
3. **Mobile-first**: estilos base para mobile, variantes para `sm:`, `md:`, `lg:`, `xl:`
4. **Touch targets mínimos 44×44px** en todos los elementos interactivos en mobile
5. **Sin hover-only**: toda información visible al hover necesita alternativa por tap en mobile
6. **Todo código comentado** — explicar el "por qué", no el "qué"
7. **GRANTs de Supabase obligatorios** en cada tabla nueva (ver patrón en `supabase/schema.sql`)
8. **Tipografía y pesos sutiles (NO usar bold excesivo)**: Evitar `font-black` (900) o `font-extrabold` (800) generalizado en textos y títulos. Usar pesos elegantes y limpios: `font-semibold` (600), `font-medium` (500) y `font-bold` (700) solo con moderación para jerarquía principal sin engrosar innecesariamente la letra.

## Arquitectura multi-tenant

```
portalmaker.com.ar          → (portal) route group — portal marketing + login + dashboards
[slug].portalmaker.com.ar   → (tienda) route group — tienda pública + /admin de tienda
dominiopropio.com.ar        → idem, resuelto por custom_domain
```

El middleware (`middleware.ts`) inyecta:
- `x-store-slug` — para tiendas por subdominio
- `x-store-domain` — para tiendas por dominio propio

Los Server Components llaman a `getTenantStore()` de `lib/tenant.ts` para obtener los datos de la tienda.

## Supabase clients

- `lib/supabase/server.ts` → Server Components, Server Actions, Route Handlers
- `lib/supabase/client.ts` → Client Components (browser)
- **Nunca** usar el service role key en el cliente del browser

## Paletas de colores y modo oscuro

- 6 paletas preset en `lib/constants.ts` (cada una con 8 valores: 4 claro + 4 oscuro)
- Si el admin elige preset → se cargan los 8 campos en `stores`
- Si usa color picker libre → los 4 campos oscuros quedan `null` y se calculan automáticamente con algoritmo de contraste WCAG AA (4.5:1)
- El toggle claro/oscuro es del **visitante** (localStorage), no del admin de la tienda

## Botón de acción del producto (3 estados)

```
gestiona_stock = false → "Consultar" (WhatsApp general)
gestiona_stock = true, stock > 0 → "Comprar" (checkout, cuando esté activo)
gestiona_stock = true, stock = 0 → "Consultar disponibilidad" (WhatsApp con ref. al producto)
```

## Backlog (NO implementar todavía)

Cupones, newsletter, cuenta de comprador, couriers, factura PDF, 2FA, roles internos de tienda, editor visual de páginas, blog, recomendaciones automáticas, CSV import/export.

