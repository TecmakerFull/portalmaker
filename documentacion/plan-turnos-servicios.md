# Portalmaker — Plan: tiendas de Servicios con turnos online

> Estado: **en desarrollo** (2026-11-06). Decisiones tomadas en la sección 9. Avance en la sección 10.
> Tienda piloto sugerida: **Totas** (`totasok.portalmaker.ar`), servicios de pestañas y cejas.

---

## 1. Objetivo

Hoy Portalmaker sirve a quien vende **productos**. El objetivo es sumar a quien ofrece **servicios con turno** (estética, peluquería, salud, clases, profesionales, técnicos) sin complicar la experiencia de las tiendas de productos.

En la creación de la tienda, antes de "¿Qué vendés?", se pregunta **"¿Qué ofrecés?"**:

| Opción | Qué se activa |
|---|---|
| **Productos** | Todo lo actual: catálogo, stock, carrito, envíos, ventas |
| **Servicios** | Catálogo de servicios, reserva de turnos, agenda. **Sin envíos, sin stock, sin carrito** |
| **Ambos** (a decidir) | Las dos cosas. Ejemplo: Totas ofrece servicios y además vende sérums o kits |

El modelo de datos va a soportar "ambos" desde el principio, aunque el alta muestre solo dos opciones. Agregar la tercera después sale casi gratis.

---

## 2. Cómo lo vive cada persona

### 2.1 El cliente que reserva (tienda pública)

1. Entra a la tienda y ve los **servicios** como tarjetas: nombre, foto, duración, precio y botón **"Reservar"**.
2. Elige el servicio. Si la tienda tiene más de un profesional, elige con quién o "Cualquiera disponible".
3. Ve un **calendario con los días disponibles** y, al tocar un día, los **horarios libres** como botones grandes ("10:00", "10:45"...).
4. Completa nombre, WhatsApp y email (si ya tiene cuenta en la tienda, se completan solos).
5. Confirma. Según la configuración de la tienda:
   - **Sin seña:** el turno queda reservado al instante.
   - **Con seña:** paga con Mercado Pago y el turno se confirma cuando se acredita.
   - **Con aprobación manual:** queda "pendiente" hasta que el dueño lo acepta.
6. Recibe un **email de confirmación** con el detalle, el botón **"Agregar a mi calendario"** (Google/Apple/Outlook) y un enlace para **cancelar o reprogramar** (dentro de la política de la tienda).
7. Recibe un **recordatorio** 24 h antes (configurable).

### 2.2 El dueño de la tienda (panel)

- **Servicios:** alta simple (nombre, duración, precio, foto, descripción). Opcionales: seña, tiempo de preparación entre turnos, qué profesionales lo hacen.
- **Horarios de atención:** reutiliza el editor actual de días y franjas, que ya soporta doble turno. Suma **días bloqueados** (vacaciones, feriados) y **horarios especiales** para una fecha puntual.
- **Agenda:** vista de **día y semana**, pensada primero para el celular. Ahí puede:
  - ver los turnos del día;
  - confirmar, cancelar, marcar "asistió" o "no vino";
  - cargar un turno a mano (para quien reserva por teléfono o WhatsApp);
  - bloquear un horario.
- **Profesionales** (opcional): si trabaja más de una persona, cada una tiene su horario y sus servicios. Con una sola persona, esta pantalla ni aparece.
- **Google Calendar:** ver la sección 5.

---

## 3. Funcionalidades por fase

Referencias del mercado: Calendly, Booksy, Fresha, AgendaPro y Turnito (AR). Se toma lo que suma valor sin volver complicado el panel.

### Fase 1 — MVP (lo mínimo para que Totas reciba turnos)
- [ ] Pregunta "¿Qué ofrecés?" en el alta y modo de tienda `servicios`.
- [ ] En modo servicios se ocultan envíos, stock, carrito y checkout de productos.
- [ ] ABM de servicios (duración, precio, buffer, foto, categoría).
- [ ] Disponibilidad semanal, reutilizando el modelo de `lib/horarios.ts`, más días bloqueados.
- [ ] Reglas de reserva: anticipación mínima (ej. 2 h), máxima (ej. 60 días) e intervalo de grilla (ej. cada 15 min).
- [ ] Página pública de reserva: servicio → día → horario → datos → confirmar.
- [ ] Protección contra **doble reserva** a nivel base de datos (ver 4.3).
- [ ] Agenda del dueño (lista del día y de la semana) con estados.
- [ ] Carga manual de turnos y bloqueos.
- [ ] Emails con Resend: confirmación al cliente y aviso al dueño. Enlace "Agregar a mi calendario" (`.ics` y enlace de Google).
- [ ] Cancelación por el cliente con enlace seguro (token), respetando "cancelar hasta X horas antes".
- [ ] Botón de WhatsApp con el detalle del turno, igual que hoy con los pedidos.

### Fase 2 — Pagos, recordatorios y calendario
- [ ] **Seña o pago total con Mercado Pago**, reutilizando el flujo actual (ver 6).
- [ ] **Recordatorios automáticos** por email (24 h antes y opcionalmente 2 h antes).
- [ ] **Reprogramación** por el cliente.
- [ ] **Google Calendar en una dirección**: feed privado `.ics` que el dueño suscribe en su Google Calendar y donde ve todos sus turnos (sin pedir permisos de Google).
- [ ] Estados "asistió" / "no vino" y conteo de ausencias por cliente.

### Fase 3 — Equipo y Google Calendar completo
- [ ] **Varios profesionales**, cada uno con horario y servicios propios.
- [ ] **Google Calendar en dos direcciones** (OAuth): los eventos personales ocupados bloquean turnos y cada turno se crea solo en su calendario.
- [ ] Modalidad del servicio: **en el local / a domicilio / online**. En los online se agrega un enlace de Google Meet.
- [ ] **Turnos grupales con cupo** (clases, talleres).

### Después (backlog)
Lista de espera, paquetes y abonos ("10 sesiones"), recordatorios por WhatsApp automáticos (requiere WhatsApp Business API, con costo por mensaje), reseñas posteriores al turno, reportes de ocupación y facturación, y turnos recurrentes ("todos los martes").

---

## 4. Modelo de datos (propuesta)

Todo con RLS y GRANTs según el patrón de `supabase/schema.sql`, y una migración fechada.

### 4.1 Cambios en `stores`
- `tipo_negocio text default 'productos' check (tipo_negocio in ('productos','servicios','ambos'))`. Va al trigger de columnas protegidas solo si se decide que depende del plan.
- Configuración de reservas en una tabla aparte, `store_booking_settings`, para no seguir agrandando `stores`:
  - `zona_horaria` (default `America/Argentina/Buenos_Aires`)
  - `anticipacion_min_minutos`, `anticipacion_max_dias`, `intervalo_grilla_minutos`
  - `requiere_aprobacion`, `cancelacion_hasta_horas`
  - `recordatorio_horas_antes` (array, ej. `{24}`)
  - `sena_modo` (`ninguna` | `porcentaje` | `monto` | `total`) y `sena_valor`

### 4.2 Tablas nuevas
| Tabla | Para qué |
|---|---|
| `services` | Servicio: nombre, slug, descripción, imágenes, `duracion_minutos`, `buffer_antes/despues`, precio, seña propia (opcional), `category_id` (reusa `categories`), modalidad, cupo, visible, orden |
| `staff` | Profesionales. Toda tienda de servicios tiene al menos 1 (el dueño), aunque la UI lo oculte |
| `staff_services` | Qué profesional hace qué servicio (y precio o duración propios, opcional) |
| `availability_rules` | Disponibilidad semanal por profesional: día, desde, hasta (varias franjas por día) |
| `availability_exceptions` | Fechas puntuales: día bloqueado completo, rango bloqueado u horario especial |
| `bookings` | El turno: servicio, profesional, `starts_at`/`ends_at` (timestamptz), estado, datos del cliente, `public_token`, notas, origen (web/manual), `order_id` (si hubo pago), `google_event_id` |
| `booking_events` | Historial: creado, confirmado, reprogramado, cancelado (por quién), recordatorio enviado |
| `calendar_connections` | OAuth de Google por profesional: tokens **cifrados** (mismo esquema AES-GCM que `lib/shipping/crypto.ts`), calendario elegido, estado. Solo service_role |

Reusos: `store_customers` (CRM) para los clientes de turnos y `categories` para agrupar servicios. Las reseñas hoy apuntan a `product_id`: para servicios hace falta un `service_id` opcional.

### 4.3 Doble reserva imposible
Dos personas pueden tocar el mismo horario al mismo tiempo. La garantía tiene que estar en la base, no solo en el código:

```sql
create extension if not exists btree_gist;
alter table bookings add constraint bookings_sin_superposicion
  exclude using gist (
    staff_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (estado in ('pendiente', 'confirmado'));
```

La reserva se crea en un Route Handler con service_role, igual que hoy `api/checkout/orders`: recalcula la disponibilidad en el servidor y deja que la base rechace el choque. El segundo cliente ve "Ese horario se acaba de ocupar, elegí otro".

Los turnos con seña pendiente bloquean el horario por **15 minutos**. Si no se paga, se liberan solos (el estado pasa a `expirado`).

### 4.4 Cálculo de horarios libres
Para un servicio, un profesional y un día, en la zona horaria de la tienda:

1. Franjas del día según `availability_rules`, ajustadas por `availability_exceptions`.
2. Se restan los turnos activos (con sus buffers) y, en fase 3, lo ocupado en Google Calendar.
3. Se recorre la grilla (cada 15 min) y se ofrece cada inicio donde entra la duración completa más los buffers.
4. Se filtra por anticipación mínima y máxima.

Va como función pura en `lib/booking/availability.ts`, con tests unitarios igual que `lib/shipping` (`npm test`). Los cambios de hora no son un problema en Argentina, pero todo se calcula con `timestamptz` y la zona horaria explícita.

---

## 5. Google Calendar

Dos niveles, en este orden:

**Nivel 1 — Feed `.ics` (fase 2, sin permisos de Google).** Cada profesional tiene una URL secreta, por ejemplo `/api/calendario/{token}.ics`, que en Google Calendar se agrega con "Agregar calendario → Desde URL". Ve todos sus turnos en su celular.
- Ventaja: cero configuración en Google y cero revisión de la app.
- Límite: es de una sola dirección, y Google refresca los calendarios suscriptos cada varias horas, no al instante.

**Nivel 2 — OAuth en dos direcciones (fase 3).**
- El dueño toca "Conectar Google Calendar" y autoriza.
- Al calcular horarios se consulta **free/busy** de su calendario, así una cita personal bloquea el turno. Se cachea unos minutos para no consultar en cada clic.
- Cada turno confirmado se **crea como evento**, y se actualiza o borra al reprogramar o cancelar. Los turnos online agregan el enlace de Google Meet.

**Riesgo importante:** los permisos de calendario son "sensibles" para Google. Para usarlos con usuarios reales, la app de Google tiene que pasar la **verificación de Google**: política de privacidad, video de demostración, dominio verificado, y puede tardar semanas. Sin verificar, el límite es de 100 usuarios y aparece una pantalla de advertencia. Conviene **iniciar la verificación en paralelo** apenas arranque la fase 2. El nivel 1 cubre mientras tanto. Hay que confirmar los scopes exactos al implementar: la idea es pedir solo lectura de free/busy y escritura de eventos, no acceso total al calendario.

---

## 6. Pagos (seña o total)

Se reutiliza **todo el flujo de Mercado Pago** existente (preferencia, webhook firmado, comisión de Portalmaker, reconciliación):

- Al reservar con seña se crea una **orden** vinculada al turno (`orders` con un ítem "Seña: Lifting de pestañas — 12/11 10:00") y se guarda `bookings.order_id`.
- Cuando el webhook aprueba el pago, además de lo de siempre, el turno pasa a `confirmado` y se envía el email.
- Así la comisión, los reembolsos, los contracargos y la reconciliación funcionan sin código nuevo de pagos.
- Política de cancelación: si cancela con anticipación, la seña se reintegra o queda a favor (lo decide la tienda). Fuera de término, la seña no se devuelve. Los reintegros los hace el dueño desde Mercado Pago (no se automatizan en la primera versión).

---

## 7. Recordatorios y tareas programadas

Los recordatorios necesitan correr **cada pocos minutos**. Hoy los crons de Vercel corren una vez por día, lo que sugiere el plan Hobby (confirmar). Opciones:

| Opción | Costo | Comentario |
|---|---|---|
| **Supabase `pg_cron` + `pg_net`** cada 10 min llamando a `/api/cron/turnos` con `CRON_SECRET` | Incluido | **Recomendado**: no agrega servicios |
| Upstash QStash (ya usamos Upstash) | Plan gratuito con límite | Permite agendar cada recordatorio a una hora exacta |
| Vercel Pro (crons cada minuto) | Pago mensual | Solo si se pasa a Pro por otros motivos |

La misma tarea libera los turnos con seña vencida y manda los recordatorios. Tiene que ser idempotente, como el cron de envíos.

---

## 8. Qué cambia en la tienda según el tipo

| Parte | Productos | Servicios |
|---|---|---|
| Portada | Catálogo de productos | Catálogo de servicios con "Reservar" |
| Ficha | Producto con stock y variantes | Servicio con duración, precio y calendario |
| Carrito | Sí | No (la reserva es directa) |
| Envíos | Sí | **Oculto** (modalidad: en el local / a domicilio / online) |
| Panel: Ventas | Pedidos | **Agenda de turnos** (y pedidos si hay señas) |
| Panel: Envíos | Sí | Oculto |
| Panel: Productos | Sí | **Servicios** |
| Mensajes de confianza (defaults) | "Envíos a todo el país"... | "Reservá online 24 hs", "Confirmación inmediata", "Recordatorio por email", "Pagá tu seña de forma segura" |
| Guía del panel | Actual | Pasos propios: cargar servicios, horarios, primer turno de prueba |

Lo editable que ya existe (diseño, branding, mensajes de confianza, dominio, colaboradores, Mercado Pago) sirve igual para los dos tipos.

Rubros sugeridos para servicios en el alta: Estética y belleza (pestañas, cejas, uñas), Peluquería y barbería, Salud y bienestar (kinesiología, nutrición, psicología), Clases y cursos, Entrenamiento y fitness, Profesionales y consultoría, Mascotas (peluquería y paseos), Técnicos y reparaciones, Tatuajes y piercing, Fotografía y eventos, y Otro.

---

## 9. Decisiones tomadas (2026-11-06)

1. **"Ambos" está desde el alta:** Productos / Servicios / Ambos.
2. **Planes:** se mantienen los actuales y se agrega un **límite de clientes registrados**, porque para reservar hay que tener cuenta en la tienda. Valores iniciales en `lib/plans.ts` (`limiteClientes`), ajustables por tienda con `features_override.limite_clientes`:
   - Free: 15
   - Starter: 50
   - Pro: 100
   - Enterprise y Bonificado: sin límite
3. **Seña:** opcional, la configura cada tienda. Arranca desactivada (`sena_modo = 'ninguna'`).
4. **Recordatorios:** solo por email. Las **reservas nuevas le llegan al dueño por WhatsApp**, igual que las ventas: al confirmar, el cliente envía el detalle con un botón de WhatsApp.
5. **Cambio de tipo:** permitido en cualquier momento desde el panel, sin borrar datos (solo se ocultan secciones).
6. **Piloto:** Totas.

## 10. Orden de trabajo y avance

1. [x] Migración `supabase/migrations/20261106_turnos_fase1.sql`:
   - `tipo_negocio` en `stores` y en la vista pública;
   - tablas `store_booking_settings`, `services`, `staff`, `staff_blocks`, `bookings` y `booking_events`, con RLS y GRANTs;
   - restricción contra superposición de turnos.
   Copiada en `schema.sql`; tipos en `types/database.ts`. **Aplicada en Supabase (2026-11-06).**
2. [x] `lib/booking/availability.ts` con 16 tests (`npm test`).
3. [x] Límite de clientes en `lib/plans.ts`.
4. [x] Alta con "¿Qué ofrecés?" (Productos / Servicios / Ambos) y rubros según el tipo, también en el modal de superadmin. Cambio de tipo desde Perfil.
5. [x] Panel:
   - menú según el tipo (grupo Turnos; sin Productos, Envíos ni Ventas si es solo servicios);
   - **Servicios** (alta, edición, foto, ocultar y borrar);
   - **Horarios y reglas** (semana con doble horario, bloqueos y reglas con opciones);
   - **Agenda** (tira de días, estados, carga manual, WhatsApp al cliente).
6. [x] Tienda pública:
   - catálogo de servicios en la portada;
   - página del servicio con calendario y horarios;
   - reserva con cuenta (si no hay sesión, vuelve con el horario elegido);
   - página del turno con cancelación;
   - sin carrito en tiendas solo de servicios.
7. [x] API: `/api/turnos/disponibilidad`, `/api/turnos` (web y manual, con límite de clientes), `/api/turnos/cancelar` y `/api/turnos/estado` (panel). Emails de confirmación, cancelación y aviso a la tienda, y botón de WhatsApp a la tienda al reservar.
7b. [x] **Lista de espera** (pedido del 2026-11-06):
   - en un día lleno, el cliente toca "Avisarme si se libera un turno";
   - al cancelarse un turno de ese servicio y día, se avisa por email a quienes esperan (el primero que reserva se lo queda);
   - en Agenda, la pestaña "Lista de espera" permite avisar por WhatsApp, marcar como resuelto y quitar.

   Migración `20261106_turnos_lista_espera.sql`.
8. [ ] Prueba completa con Totas.
8b. [ ] "Mis turnos" en la cuenta del cliente (hoy se gestiona desde el enlace del email).
9. [ ] Fase 2: seña con MP, recordatorios por email (pg_cron), feed `.ics` e inicio de la verificación de Google.
10. [ ] Fase 3: varios profesionales, OAuth de Google y modalidades.

Cada paso se puede desplegar por separado sin romper las tiendas de productos: todo lo nuevo queda detrás de `tipo_negocio`.
