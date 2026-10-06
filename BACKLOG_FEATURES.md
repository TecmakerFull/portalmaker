# Backlog de Funcionalidades Inspiradas en Jumpseller

> **Documento de Hoja de Ruta (Roadmap)**
> **Portalmaker — "El portal del Maker"** | portalmaker.com.ar
> 
> *Nota: Este backlog sirve como hoja de ruta para seleccionar e implementar feature por feature en orden de prioridad una vez consolidado el MVP.*

---

## Objetivo
Integrar progresivamente estas características al roadmap de Portalmaker, manteniendo la arquitectura multi-tenant (Next.js + Supabase + Cloudflare / Vercel) y priorizando el flujo "WhatsApp-first" para makers y negocios locales.

---

### Fase A: Catálogo, Búsqueda y Experiencia de Usuario (Frontend Vitrina)
Funcionalidades de navegación para aumentar la conversión y facilitar que el comprador encuentre lo que busca:
1. **Búsqueda predictiva con autocompletar**: Buscador con debounce y sugerencias en tiempo real por título, categoría y etiquetas.
2. **Filtrado avanzado de productos**: Filtros por rango de precio, categorías, etiquetas, estado de stock (Inmediato / Por encargo) y atributos personalizados.
3. **Listas de favoritos (Wishlist)**: Guardado local (LocalStorage) o por sesión para que el comprador guarde productos antes de pedir cotización.
4. **Alerta "Nuevamente en stock"**: Formulario rápido donde el cliente deja su WhatsApp/Email para recibir aviso cuando un producto agotado vuelva a tener disponibilidad.
5. **Productos frecuentemente comprados juntos / Cross-selling**: Sugerencia de productos complementarios en la ficha de producto y en el drawer de consulta.

---

### Fase B: Gestión Comercial y Cotizaciones (Panel Maker)
Herramientas para que el maker gestione ventas personalizadas y clientes mayoristas o recurrentes:
1. **Cotizaciones personalizadas**: Módulo para armar presupuestos a medida desde el admin y enviarlos por link/PDF o mensaje estructurado de WhatsApp.
2. **Listas de precios y precios por volumen**: Definición de precios diferenciales según cantidad mínima de compra (ideal para ventas mayoristas de piezas impresas o insumos).
3. **Suscripciones de productos / Pagos recurrentes**: Soporte para modelos de membresía o pedidos periódicos programados.
4. **Venta de productos digitales**: Soporte para subida y entrega segura de archivos descargables (ej. modelos STL, planos, guías técnicas).
5. **Cuentas de clientes / Portal del comprador**: Autenticación para compradores recurrentes, consulta de historial de pedidos y estado de producción.

---

### Fase C: Punto de Venta (POS) y Operatoria Física
Herramientas para ventas presenciales en taller, showroom o ferias:
1. **Pedidos manuales (Módulo POS)**: Interfaz ágil para cargar una venta manual de mostrador, descontar inventario en tiempo real y emitir comprobante.
2. **Múltiples ubicaciones de stock**: Gestión de inventario segmentado por depósitos (ej. "Taller Principal", "Stock para Ferias / Showroom", "Depósito de Insumos").
3. **Tarjetas de regalo (Gift Cards)**: Emisión y validación de cupones de crédito prepagos con código único.

---

### Fase D: Marketing, Retención y Automatización
Estrategias para recuperar ventas y generar recurrencia:
1. **Recuperación de carrito / consultas abandonadas**: Registro de carritos iniciados y recordatorios automáticos/manuales vía WhatsApp.
2. **Solicitud automatizada de reseñas**: Envío programado post-entrega para que el cliente califique el producto y deje su testimonio visible en la tienda.
3. **Campañas con promociones avanzadas**: Reglas de descuento complejas (2x1, envío gratis condicional, cupones por fecha de vigencia o porcentaje).
4. **Integración con catálogos externos (Google Shopping / Meta / Mercado Libre)**: Feed XML/JSON para sincronizar el catálogo con Facebook Shop, Instagram Shopping, Google Merchant Center y sincronización básica con Mercado Libre.

---

### Fase E: Asistencia con Inteligencia Artificial (Maker Tools)
Aprovechar IA para acelerar la carga de catálogo al emprendedor:
1. **Generador de descripciones con IA**: Botón en el admin para redactar descripciones técnicas atractivas, beneficios y especificaciones a partir de pocas palabras clave.
2. **Asistente de diseño y personalización de temas**: Generador de paletas de colores y banners promocionales adaptados al rubro de la tienda.

---

### Fase F: Analítica, Multi-idioma y Roles de Equipo
Para cuando las tiendas escalen en volumen:
1. **Informes y métricas avanzadas**: Dashboard con productos más consultados, tasa de conversión a WhatsApp, ticket promedio estimado y recurrencia de clientes.
2. **Múltiples cuentas de administrador y roles**: Permisos granulares (Dueño, Operador de taller/depósito, Vendedor de mostrador).
3. **Multi-idioma / Moneda secundaria**: Soporte para traducir vitrina y manejar cotizaciones en moneda alternativa (ej. USD).
