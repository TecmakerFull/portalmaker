# Plan: Cobro de planes con Mercado Pago (v2, revisado)

Cobro mensual de los planes de Portalmaker con dos modalidades que conviven:

- **Pago manual mensual (Checkout Pro)**: la tienda paga cada mes desde su panel o desde el link del aviso por email. Es la modalidad por defecto.
- **Débito automático (opcional)**: la tienda autoriza una suscripción de Mercado Pago (`preapproval`) y MP cobra solo cada mes. Se puede activar y cancelar cuando quiera.

Ambas terminan en la **misma RPC** de acreditación, así que vencimientos, gracia, pausa y comprobantes se comportan igual.

Decisión tomada: **al terminar los días de gracia la tienda se pausa** (no se baja a Free).

Cambios respecto a la v1: ver sección 11.

---

## 1. Reglas de negocio

| Momento respecto a `fecha_proximo_vencimiento` | `estado_pago` | `suscripcion_activa` | Acción |
| :--- | :--- | :--- | :--- |
| Faltan 7 días | `pendiente` | true | Email "vence en 7 días" con botón de pago (omitir si tiene débito automático activo: se avisa del cobro próximo) |
| Falta 1 día | `pendiente` | true | Email "vence mañana" (solo si no pagó) |
| Vencida, dentro de `dias_gracia` | `gracia` | true | Email de inicio de gracia, una sola vez |
| Pasada la gracia | `vencido` | false | Pausa de la tienda pública + email con link de reactivación |
| Pago acreditado | `al_dia` | true | Nuevo vencimiento + email de comprobante |

- Tiendas `bonificado` o sin `fecha_proximo_vencimiento` quedan fuera del ciclo.
- Tienda pausada: el dueño entra al panel (`/tienda/admin`), ve una barra de alerta y puede pagar. La tienda pública, `/api/checkout/orders` y `/api/turnos` ya bloquean con `suscripcion_activa = false`; hay que revisar además `mercadopago/preference`, `transfer-details` y las páginas de producto y servicio.
- Aplica a los tres tipos de negocio (`productos`, `servicios`, `ambos`): el plan se paga igual.
- Las fechas se calculan en `America/Argentina/Buenos_Aires`, no en UTC.

## 2. Precio

Única fuente de precio de lista: **`plans.price_ars`** (ya existe; `lib/plans.ts` queda como fallback). No se agregan `monthly_price` ni `grace_days`; los días de gracia siguen en `stores.dias_gracia` y `diasGraciaDefault`.

1. Renovación del mismo plan con `stores.precio_mensual > 0`: se cobra el precio acordado.
2. Cambio a un plan superior: se cobra `plans.price_ars` del plan elegido y, al acreditar, se actualiza `stores.precio_mensual`.
3. `free` y `bonificado` no se pueden pagar ni elegir desde el panel.
4. El monto siempre se calcula en el servidor. Nunca se acepta monto ni plan con precio desde el cliente.

## 3. Modelo de datos

Migración `supabase/migrations/20261110_subscription_billing_system.sql` y mismo contenido en `supabase/schema.sql`. Todas las tablas con RLS y GRANTs explícitos.

### 3.1 `subscription_invoices` (cada cobro esperado)
`id`, `store_id`, `target_plan`, `amount numeric(12,2)`, `period_start`, `period_end`, `due_date`, `status` (`pending|paid|expired|cancelled|refunded`), `source` (`manual|auto_debit`), `mp_preference_id`, `mp_init_point`, `mp_payment_id unique`, `paid_at`, `created_at`.
- Índice único parcial `(store_id, period_end) where status = 'pending' and source = 'manual'` para no duplicar facturas pendientes del mismo período.
- RLS: el dueño solo lee las suyas (por `admin_email`); sin insert/update para `authenticated`. Escribe únicamente `service_role`.

### 3.2 `subscription_mandates` (débito automático)
`id`, `store_id unique`, `mp_preapproval_id unique`, `status` (`pending|authorized|paused|cancelled`), `target_plan`, `amount`, `payer_email`, `billing_day`, `created_at`, `updated_at`.
- RLS: el dueño lee la suya. Escribe solo `service_role`.

### 3.3 `subscription_notifications_log`
`store_id`, `due_date`, `notification_type` (`reminder_7d|reminder_1d|grace_started|store_paused|payment_confirmed|payment_failed`), `sent_to`, `sent_at`, `unique (store_id, due_date, notification_type)`. Solo `service_role`.

### 3.4 Cambios en `subscription_payments`
Agregar `plan_pagado`, `mp_payment_id unique`, `invoice_id`, `estado` (`aprobado|reembolsado`).
- El trigger `actualizar_vencimiento_suscripcion` se reemplaza: hoy pisa el vencimiento con `periodo_hasta` en cada insert y permite acortarlo con un pago manual retroactivo. Nuevo comportamiento: solo adelanta la fecha (`greatest`) y no se dispara para filas de MP, que ya maneja la RPC.
- Un pago manual del superadmin cierra (`cancelled`) las facturas `pending` del mismo período.

### 3.5 RPC `process_subscription_payment`
- `SECURITY DEFINER`, `set search_path = public`, `revoke execute from public, anon, authenticated`, `grant execute to service_role`.
- Bloquea la factura con `for update` y exige `status = 'pending'` dentro de la transacción. Idempotente por `mp_payment_id`.
- Efectos atómicos: inserta en `subscription_payments`, marca la factura `paid`, actualiza `plan`, `precio_mensual`, `estado_pago = 'al_dia'`, `suscripcion_activa = true` y la nueva `fecha_proximo_vencimiento`, y escribe en `config_audit_log` (`entity_type = 'store_plan'`).
- **No** pisa `dias_gracia` (no se puede distinguir un valor especial del default).
- Vencimiento: si pagó antes de vencer o en gracia, suma 1 mes sobre el vencimiento anterior; si estaba pausada o venía de Free, corre desde hoy. Se usa `billing_day` como ancla para evitar la deriva de fin de mes (31/01 → 28/02 → 28/03).
- Reversa `reverse_subscription_payment` para reembolsos y contracargos: deshace el período, marca el pago `reembolsado` y alerta al superadmin.

## 4. Pago manual mensual (Checkout Pro)

`POST /api/subscriptions/create-preference`
- Valida sesión y rol **admin** de la tienda con `verifyStoreAccess()` (editores y colaboradores no pueden pagar ni cambiar de plan).
- `target_plan` contra lista permitida (`starter`, `maker_pro`, `enterprise`). Rate limit con Upstash.
- Reutiliza la factura pendiente del período; si no existe, la crea y genera la preferencia con el token de Portalmaker.
- `external_reference = sub_<invoice_id>`. Las facturas vencen a los 7 días (cubre pagos en efectivo, que se acreditan en 1 a 3 días).

## 5. Débito automático (opcional)

Suscripción sin plan asociado (`POST /preapproval`), con `status = pending`: el dueño es redirigido a Mercado Pago, carga su medio de pago y autoriza. El monto lo define el servidor.

Endpoints (todos con `verifyStoreAccess()` rol admin):
- `POST /api/subscriptions/autodebit/enable`: crea el `preapproval` (`reason`, `payer_email` del dueño, `auto_recurring` mensual con `transaction_amount` de la sección 2, `external_reference = mandate_<id>`, `back_url` a `/tienda/admin/suscripcion`) y guarda el mandato en `pending`.
- `POST /api/subscriptions/autodebit/cancel`: `PUT /preapproval/{id}` con `status = cancelled`. La tienda vuelve a pago manual sin perder el período ya pagado.
- Al cambiar `precio_mensual` o el plan (upgrade, superadmin): `PUT /preapproval/{id}` con el nuevo `transaction_amount`. Si la tienda pasa a `bonificado` o `free`, se cancela el mandato.

Webhooks (activar en la app de MP los topics `subscription_preapproval`, `subscription_authorized_payment` y `payments`):
- `subscription_preapproval`: sincroniza el estado del mandato (`authorized`, `paused`, `cancelled`) consultando siempre la API de MP; nunca se confía en el body.
- `subscription_authorized_payment` y `payments`: cada cobro se resuelve contra la API de MP, se identifica el mandato por `preapproval_id` y se crea una factura `source = auto_debit` para ese período, que se acredita con la misma RPC (idempotente por `mp_payment_id`).
- Cobro rechazado: MP reintenta por su cuenta. Mientras tanto corre el ciclo normal de gracia y pausa, y se manda el email `payment_failed` con el link de pago manual para regularizar. Si MP cobra después, la tienda se reactiva sola.
- Un mandato `authorized` no pausa la tienda antes de tiempo: el cron solo evalúa fechas.

Puntos a validar en sandbox antes de producción (no los doy por confirmados):
- Qué `external_reference` trae el `payment` generado por cada cobro automático y cómo se relaciona con el `preapproval_id`.
- Si la firma del webhook usa el mismo secreto que el marketplace (ver sección 6).
- Si la fecha del primer cobro y el `billing_day` se pueden fijar para alinearlos con `fecha_proximo_vencimiento`.

## 6. Webhooks: enrutado y seguridad

- El enrutado se decide **después** de consultar el pago/suscripción en la API de MP, por `external_reference` (`sub_`, `mandate_` o id de pedido). No se usan `?type=` ni `?invoice_id=` en la URL: no están cubiertos por la firma y el endpoint actual ignora todo lo que no sea `payment`.
- Se agrega manejo de los topics de suscripción en [route.ts](../app/api/webhooks/mercadopago/route.ts) sin romper el flujo de pedidos. Si el token de Portalmaker pertenece a otra aplicación de MP que la del marketplace, se usa `MP_SUBSCRIPTIONS_WEBHOOK_SECRET` con endpoint propio (`/api/webhooks/mercadopago-subscriptions`).
- Validaciones de pago: `status = approved`, `currency_id = ARS`, `external_reference` coincide con la factura, y `transaction_amount` igual al esperado (si es mayor se acredita y se alerta; si es menor se rechaza y se alerta).
- Si el pago pasa a `refunded` o `charged_back`, se llama a `reverse_subscription_payment`.
- Variable nueva: `MP_PLATFORM_ACCESS_TOKEN` (sin fallback a `MP_ACCESS_TOKEN`) y, si corresponde, `MP_SUBSCRIPTIONS_WEBHOOK_SECRET`. Se agregan a `.env.example`. Nunca se imprimen valores.

## 7. Cron diario `/api/cron/subscriptions`

- Autenticación con `CRON_SECRET`, falla cerrado en producción (mismo patrón que `/api/cron/turnos`).
- `vercel.json` ya tiene 2 crons: verificar el límite del plan de Vercel. Alternativa: `pg_cron` como en `supabase/migrations/20261107_turnos_cron.sql`.
- Transiciones con `update` condicional (`where fecha_proximo_vencimiento = <valor leído>` y `estado_pago <> 'al_dia'`), para no pausar una tienda que acaba de pagar.
- Emails: se inserta la fila del log **antes** de enviar y se borra si el envío falla. Así no se duplican ni se pierden avisos.
- Reconciliación: facturas `pending` de los últimos 7 días se consultan en MP, y los mandatos `pending/authorized` se sincronizan. Cubre webhooks perdidos y la ventana anti-replay de 5 minutos de la firma.
- El estado mostrado en la UI sale de una única función compartida con `getSubscriptionStatus` ([lib/tenant.ts](../lib/tenant.ts#L225-L238)); el cron solo escribe `estado_pago` y `suscripcion_activa`.

## 8. Emails (Resend)

Plantillas en `lib/subscriptions/emails.ts`: aviso 7 días, aviso 1 día, inicio de gracia, tienda pausada, pago confirmado, cobro automático fallido.
- Sin emojis. Datos de marca leídos de la base y todo escapado (`lib/store-auth-email.ts`).
- El destinatario es siempre `stores.admin_email` leído de la base.
- El botón apunta a `/tienda/admin/suscripcion` (no lleva `invoice_id` en la URL).

## 9. Panel de la tienda

Componente `app/tienda/admin/components/subscription-billing-card.tsx`, usado en Perfil y en `/tienda/admin/suscripcion`:
- Plan, estado de cuenta, valor mensual, próximo vencimiento y días de gracia restantes.
- Tarjeta de saldo con botón **"Pagar con Mercado Pago"** y, en la grilla de planes, **"Elegir y pagar"** además de la consulta por WhatsApp.
- Bloque **"Débito automático"**: estado del mandato, botón para activarlo o cancelarlo y aviso de que se puede volver a pago manual cuando quiera.
- Historial de pagos (fecha, período, plan, medio, ID de operación, monto, estado).
- Barra superior en `app/tienda/admin/layout.tsx` en gracia o pausada.
- Reglas del proyecto: sin emojis, solo `lucide-react`, mobile-first, targets de 44px, sin hover-only, `styled-select` en lugar de `<select>`.
- Superadmin: sigue registrando pagos manuales y editando vencimiento y precio acordado; ve el estado de cada tienda y el mandato de débito automático.

## 10. Tests y orden de implementación

- Agregar `lib/subscriptions/billing.test.ts` al script `npm test` (hoy solo corre `lib/shipping`). Casos: monto acordado vs upgrade, idempotencia, concurrencia de la RPC, vencimiento sin perder días y con ancla de fin de mes, transición a gracia y pausa, carrera cron/pago, reembolso, mandato (alta, cambio de monto, cancelación), pagos con monto distinto.
- Orden: (1) migración y RPC con sus tests, (2) pago manual y webhook, (3) cron y emails, (4) UI del panel, (5) débito automático (queda detrás de un flag hasta validar en sandbox de MP), (6) revisión de bloqueos en endpoints públicos.

## 11. Qué cambió respecto a la v1

- Webhook: se enruta por `external_reference` y no por parámetros de la URL.
- RPC blindada (permisos, bloqueo de fila, idempotencia) y trigger de vencimiento corregido.
- Una sola fuente de precio (`plans.price_ars`), sin `monthly_price` ni `grace_days`.
- Reembolsos y contracargos contemplados.
- Ancla de facturación, zona horaria argentina y updates condicionales en el cron.
- Facturas con vigencia de 7 días y sin fallback de token.
- Agregado: débito automático opcional con `preapproval`.
- Decisión: al vencer la gracia se pausa la tienda.
