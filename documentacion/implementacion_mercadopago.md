# Arquitectura y Lógica de Integración: Mercado Pago Checkout Pro

> **Portalmaker — "El portal del Maker"**  
> Documento técnico de referencia sobre la arquitectura, flujos, sincronización, base de datos y resguardos del sistema de cobros online con Mercado Pago.

---

## 1. Visión General del Modelo de Negocio

Portalmaker opera como un **Marketplace Multi-tenant**. Cada tienda (Maker) cobra directamente en su propia cuenta de Mercado Pago mediante el protocolo **OAuth 2.0**:

* **Cobro Directo**: El dinero del comprador ingresa de forma instantánea a la cuenta del vendedor.
* **Comisión de la Plataforma (`marketplace_fee`)**: Portalmaker retiene automáticamente el 2% de cada transacción (configurable por tienda por el superadmin mediante la columna `stores.comision_portalmaker`).
* **Recargo Opcional al Comprador**: Cada taller puede definir un recargo (0% a 15%) sobre el total si desea transferir el costo del procesamiento al comprador (`stores.mp_recargo_porcentaje`).
* **Multi-tienda Aislada**: Las credenciales de acceso de cada vendedor (`mp_access_token`, `mp_refresh_token`) se almacenan de forma segura en una tabla protegida (`store_mp_credentials`) accesible únicamente mediante el backend (`service_role`), sin que jamás queden expuestas en el navegador ni a otros usuarios.

---

## 2. Flujo Completo de Funcionamiento

### A. Vinculación del Taller (OAuth 2.0)
1. **Inicio**: El dueño de la tienda hace clic en **"Conectar con Mercado Pago"** desde su panel (`/tienda/admin/pagos`).
2. **Generación de Estado Seguro**:
   * Endpoint: `/api/auth/mercadopago/authorize`.
   * Verifica que el usuario sea el dueño legítimo de la tienda (`verifyStoreAccess`).
   * Genera un identificador aleatorio criptográfico (`state`) guardado en la tabla `mp_oauth_states` con expiración de 10 minutos.
   * Redirige al vendedor a la pantalla oficial de autorización de Mercado Pago.
3. **Retorno y Guardado de Tokens**:
   * Endpoint: `/api/auth/mercadopago/callback`.
   * Mercado Pago devuelve un `code` temporal y el `state`.
   * Se valida el `state` en base de datos para evitar ataques CSRF y se comprueba la identidad del usuario.
   * Se intercambia el `code` por el `access_token`, `refresh_token` y `user_id` del vendedor.
   * Las credenciales se guardan de forma encriptada/aislada en `store_mp_credentials`, y la tienda se marca con `stores.mp_connected = true`.
   * Redirige al dueño de vuelta a su panel de administración.

### B. Creación de Pedido y Preferencia de Pago
1. **Creación del Pedido**:
   * Endpoint: `/api/checkout/orders`.
   * Se validan datos del comprador, formato de cantidades (enteros de 1 a 999), límite de hasta 50 productos, y se agrupan líneas del mismo producto/variante.
   * Se genera el pedido en la tabla `orders` con estado inicial `estado_pago = 'pendiente'` y un `public_token` único para que el comprador pueda seguir su orden sin exponer datos personales.
2. **Generación de la Preferencia**:
   * Endpoint: `/api/checkout/mercadopago/preference`.
   * Comprueba que la orden admita pago (`pendiente` o `rechazado` para permitir reintentos).
   * Obtiene el token de acceso vigente del vendedor mediante `getValidMpAccessToken()` (renovando el token automáticamente si está próximo a expirar).
   * Calcula el split: importe de los productos, recargo configurado, y el `marketplace_fee` que recibe Portalmaker.
   * Genera la preferencia en Mercado Pago con `notification_url` que incluye el identificador de orden (`?order_id=...`).
   * Guarda el snapshot de recargo y comisión en el pedido y devuelve el `init_point` al cliente.

### C. Webhook y Procesamiento Atómico del Pago
1. **Recepción de la Notificación**:
   * Endpoint: `/api/webhooks/mercadopago`.
   * Si Mercado Pago notifica una revocación (`action: 'seller_token_revoked'`), se desvincula la tienda y se despacha alerta por email.
   * Si es un pago (`type: 'payment'`), se valida la firma criptográfica HMAC en el encabezado `x-signature` en producción.
2. **Auditoría e Inmutabilidad**:
   * Todo evento se inserta de inmediato en la tabla `mp_webhook_events` con estado `pending`.
3. **Motor Unificado (`lib/mp-payments.ts`)**:
   * Consulta el pago oficial en la API de Mercado Pago utilizando el token del vendedor.
   * Si el pago está `approved`, invoca la función de base de datos `process_approved_payment(...)`.
4. **Función Transaccional Segura (`process_approved_payment`)**:
   * Aplica `SELECT ... FOR UPDATE` sobre el pedido para bloquear la fila contra condiciones de carrera.
   * Valida que el pedido no haya sido marcado previamente (`already_processed`).
   * Actualiza atómicamente el estado a `aprobado` y registra los importes reales cobrados.
   * Descuenta automáticamente el stock de productos y variantes involucrados utilizando `greatest(stock - cantidad, 0)`.
   * Si hubo sobreventa, activa `stock_warning = true` y anota el faltante en observaciones sin arrojar error.
5. **Notificaciones y Alertas**:
   * Se envía un correo electrónico al comprador con el recibo de compra.
   * Se envía un correo al vendedor avisándole que tiene un pedido nuevo pago listo para producir.
   * Si se detecta un cobro duplicado con otro identificador de pago, se alerta al vendedor y a administración para gestionar el reembolso.

### D. Reconciliación Automática (Cron)
* Endpoint: `/api/cron/mp-reconcile`.
* Diseñado para ejecutarse periódicamente (cada 15 minutos) protegido por `CRON_SECRET`.
* Busca pedidos creados entre 10 minutos y 48 horas atrás que continúen en estado `pendiente` o `rechazado`.
* Consulta a la API de Mercado Pago por los pagos asociados a la referencia externa de la orden y ejecuta el mismo motor transaccional, garantizando que ningún pago quede sin procesar si un webhook de Mercado Pago sufriera demoras de red.

---

## 3. Resguardo y Tablas de Base de Datos

| Tabla | Propósito y Seguridad |
| :--- | :--- |
| `store_mp_credentials` | Almacena `mp_access_token`, `mp_refresh_token` y vigencia. RLS activo, **solo accesible por `service_role`**. Ningún usuario ni dueño puede leer ni modificar esta tabla directamente. |
| `mp_oauth_states` | Tokens temporales de 10 minutos para validar el circuito de vinculación OAuth contra ataques CSRF. |
| `mp_webhook_events` | Registro histórico inmutable de cada notificación entrante de Mercado Pago (éxito, fallos y auditoría de eventos). |
| `orders` | Contiene snapshots inmutables del pedido (`mp_preference_id`, `mp_recargo_pct`, `comision_portalmaker_pct`, `mp_fee_portalmaker`, `mp_net_received`, `stock_descontado`). El trigger `trg_protect_order_columns` impide que un cliente altere totales o estados. |
| `store_admin_notes` | Notas internas exclusivas del superadmin, inaccesibles para dueños de tienda ni colaboradores. |

---

## 4. Parámetros de Entorno Involucrados

* `MP_CLIENT_ID`: Identificador de la aplicación Marketplace en Mercado Pago Developers.
* `MP_CLIENT_SECRET`: Clave secreta de la aplicación Marketplace.
* `MP_WEBHOOK_SECRET`: Firma secreta configurada en el panel de Webhooks de Mercado Pago para validar la autenticidad de cada notificación.
* `CRON_SECRET`: Clave secreta enviada en la cabecera `Authorization: Bearer <CRON_SECRET>` para disparar la reconciliación periódica.
* `MP_API_BASE_URL`: Opcional, reservada para pruebas locales simuladas (solo tiene efecto si `NODE_ENV !== 'production'`).
