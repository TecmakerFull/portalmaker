// =============================================================================
// PORTALMAKER — Tipos TypeScript del schema de base de datos
// "El portal del Maker" | portalmaker.com.ar
//
// Este archivo es el contrato entre el código y la base de datos.
// Cada tipo refleja exactamente una tabla de supabase/schema.sql.
// Se actualiza manualmente cuando se modifica el schema.
//
// Alternativa: en el futuro se puede auto-generar con:
//   npx supabase gen types typescript --project-id <id> > types/database.ts
// =============================================================================

// =============================================================================
// TIPOS BASE (reutilizados en múltiples tablas)
// =============================================================================

export type UUID = string;
export type Timestamp = string; // ISO 8601: "2026-08-04T00:00:00Z"
export type DateString = string; // "2026-08-04"

// =============================================================================
// PROCESS_TYPES — Tipos de proceso maker (global a la plataforma)
// =============================================================================
export interface ProcessType {
  id: UUID;
  nombre: string;       // "Impresión 3D", "Grabado Láser"
  slug: string;         // "impresion-3d", "grabado-laser"
  orden: number;
}

// =============================================================================
// PLATFORM_ADMINS — Developer / superadmin de Portalmaker
// =============================================================================
export interface PlatformAdmin {
  id: UUID;
  email: string;
  created_at: Timestamp;
}

// =============================================================================
// STORES — Tiendas de los makers
// =============================================================================
export interface Store {
  id: UUID;
  nombre: string;
  slug: string;          // subdominio: "tecmaker" → tecmaker.portalmaker.com.ar
  custom_domain: string | null;  // dominio propio del maker
  admin_email: string;

  // Operación
  modo_operacion: 'vitrina' | 'tienda';
  checkout_activo: boolean;
  whatsapp_numero: string | null;

  // Suscripción
  suscripcion_activa: boolean;
  fecha_inicio_suscripcion: DateString | null;
  fecha_proximo_vencimiento: DateString | null;
  dias_gracia: number;

  // Branding — Identidad visual
  logo_url: string | null;
  icono_url: string | null;
  favicon_url: string | null;
  hero_banner_url: string | null;
  slogan: string | null;

  // Branding — Paleta de colores (modo claro)
  color_primario: string;
  color_secundario: string;
  color_fondo: string;
  color_texto: string;

  // Branding — Paleta de colores (modo oscuro, null = calculado automáticamente)
  color_primario_dark: string | null;
  color_secundario_dark: string | null;
  color_fondo_dark: string | null;
  color_texto_dark: string | null;

  // Branding — Preferencia de tema
  tema_por_defecto: 'claro' | 'oscuro' | 'sistema';

  // Branding — Tipografía
  font_heading: string;
  font_body: string;

  // Contacto y redes
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  email_contacto: string | null;
  horario_atencion: string | null;
  direccion: string | null;

  // SEO y analítica
  meta_title: string | null;
  meta_description: string | null;
  ga_measurement_id: string | null;
  meta_pixel_id: string | null;
  google_maps_embed_url: string | null;

  created_at: Timestamp;
  updated_at: Timestamp;
}

// Estado de suscripción calculado en runtime (no es una columna de la BD)
export type SubscriptionStatus =
  | 'activa'      // fecha_proximo_vencimiento > hoy
  | 'por_vencer'  // quedan ≤ 7 días
  | 'en_gracia'   // venció pero está dentro de dias_gracia
  | 'vencida'     // venció y superó dias_gracia

// =============================================================================
// CATEGORIES — Categorías de productos por tienda
// =============================================================================
export interface Category {
  id: UUID;
  store_id: UUID;
  parent_id: UUID | null;  // null = categoría raíz
  nombre: string;
  slug: string;
  descripcion: string | null;
  imagen_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  visible: boolean;
  orden: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Categoría con sus hijos (para el árbol de categorías en el admin)
export interface CategoryWithChildren extends Category {
  children: Category[];
}

// =============================================================================
// PRODUCTS — Productos del catálogo
// =============================================================================
export interface Product {
  id: UUID;
  store_id: UUID;
  category_id: UUID | null;
  process_type_id: UUID | null;

  nombre: string;
  slug: string;
  descripcion: string | null;
  imagenes: string[];  // array de URLs

  // Precios
  precio_base: number;
  precio_costo: number | null;  // solo visible para el admin
  precio_oferta: number | null;
  oferta_activa: boolean;

  // Identificadores
  sku: string | null;
  codigo_interno: string | null;

  // Stock
  gestiona_stock: boolean;
  stock: number | null;
  stock_minimo: number;

  tiempo_fabricacion_estimado: string | null;

  visible: boolean;
  destacado: boolean;
  orden: number;

  created_at: Timestamp;
  updated_at: Timestamp;
}

// Producto con datos relacionados (para la página de producto y el admin)
export interface ProductWithDetails extends Product {
  category?: Category | null;
  process_type?: ProcessType | null;
  variants?: ProductVariant[];
  details?: ProductDetails | null;
}

// Estado del botón de acción en la tienda pública (calculado en runtime)
export type ProductActionState =
  | 'comprar'              // gestiona_stock = false, o stock > 0
  | 'consultar'            // modo vitrina (whatsapp de contacto general)
  | 'sin_stock_whatsapp'   // gestiona_stock = true y stock = 0

// =============================================================================
// PRODUCT_VARIANTS — Variantes de productos
// =============================================================================
export interface ProductVariant {
  id: UUID;
  product_id: UUID;
  nombre: string;           // "Rojo / PLA / Grande"
  precio_adicional: number; // se suma al precio_base
  stock: number | null;
  stock_minimo: number;
  imagen_url: string | null;
  activo: boolean;
  orden: number;
  created_at: Timestamp;
}

// =============================================================================
// PRODUCT_DETAILS — Ficha técnica extendida (1:1 con products, opcional)
// =============================================================================
export interface TechnicalAttribute {
  clave: string;  // "Material"
  valor: string;  // "PLA"
}

export interface ProductDetails {
  product_id: UUID;
  marca: string | null;
  peso_kg: number | null;
  alto_cm: number | null;
  ancho_cm: number | null;
  profundidad_cm: number | null;
  garantia_texto: string | null;
  ficha_tecnica: TechnicalAttribute[];
  tags: string[] | null;
  video_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  productos_relacionados: UUID[];
  created_at: Timestamp;
  updated_at: Timestamp;
}

// =============================================================================
// ORDERS — Pedidos
// =============================================================================
export interface OrderItem {
  product_id: UUID;
  nombre: string;         // snapshot del nombre al momento del pedido
  variante?: string;      // snapshot de la variante elegida
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Order {
  id: UUID;
  store_id: UUID;
  nombre_comprador: string | null;
  email_comprador: string | null;
  telefono_comprador: string | null;
  direccion_entrega: string | null;
  items: OrderItem[];           // snapshot inmutable en jsonb
  total: number;
  costo_envio: number;
  estado_pedido: 'nuevo' | 'en_produccion' | 'despachado' | 'entregado' | 'cancelado';
  estado_pago: 'pendiente' | 'aprobado' | 'rechazado';
  metodo_pago: string | null;
  zona_envio_id: UUID | null;
  notas: string | null;
  observaciones_admin: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// =============================================================================
// STORE_PAGES — Páginas informativas configurables
// =============================================================================
export interface StorePage {
  id: UUID;
  store_id: UUID;
  slug: string;       // determina la URL: /contacto, /sobre-nosotros
  titulo: string;
  contenido: string | null;  // HTML generado por el editor WYSIWYG
  visible: boolean;
  orden: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Slugs predefinidos que se crean por defecto al dar de alta una tienda
export type DefaultPageSlug =
  | 'contacto'
  | 'sobre-nosotros'
  | 'preguntas-frecuentes'
  | 'envios-y-devoluciones'
  | 'terminos-y-condiciones';

// =============================================================================
// PORTFOLIO — Galería de trabajos realizados
// =============================================================================
export interface PortfolioItem {
  id: UUID;
  store_id: UUID;
  imagen_url: string;
  titulo: string | null;
  descripcion: string | null;
  visible: boolean;
  orden: number;
  created_at: Timestamp;
}

// =============================================================================
// BANNERS — Banners promocionales con vigencia
// =============================================================================
export interface Banner {
  id: UUID;
  store_id: UUID;
  imagen_url: string;
  video_url: string | null;
  titulo: string | null;
  cta_texto: string | null;   // texto del botón
  cta_url: string | null;     // URL del botón
  orden: number;
  activo: boolean;
  fecha_desde: DateString | null;
  fecha_hasta: DateString | null;
  created_at: Timestamp;
}

// =============================================================================
// SHIPPING_ZONES — Zonas de envío con tarifa fija
// =============================================================================
export interface ShippingZone {
  id: UUID;
  store_id: UUID;
  nombre: string;   // "CABA", "GBA Zona 1", "Retiro en local"
  precio: number;   // 0 para retiro en local
  activo: boolean;
  orden: number;
  created_at: Timestamp;
}

// =============================================================================
// SUBSCRIPTION_PAYMENTS — Historial de pagos de suscripción
// =============================================================================
export interface SubscriptionPayment {
  id: UUID;
  store_id: UUID;
  monto: number;
  metodo_pago: string | null;
  periodo_desde: DateString;
  periodo_hasta: DateString;
  fecha_pago: DateString;
  comprobante_url: string | null;
  registrado_por: string | null;
  notas: string | null;
  created_at: Timestamp;
}

// =============================================================================
// STOCK_MOVEMENTS — Trazabilidad de movimientos de stock
// =============================================================================
export interface StockMovement {
  id: UUID;
  store_id: UUID;
  product_id: UUID;
  variant_id: UUID | null;
  tipo: 'entrada' | 'salida' | 'ajuste' | 'venta';
  cantidad: number;       // positivo en entrada, negativo en salida/venta
  motivo: string | null;
  registrado_por: string | null;
  order_id: UUID | null;
  created_at: Timestamp;
}

// =============================================================================
// ORDER_ITEMS — Versión relacional de orders.items (para métricas)
// =============================================================================
export interface OrderItemRecord {
  id: UUID;
  order_id: UUID;
  store_id: UUID;
  product_id: UUID | null;  // null si el producto fue borrado
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  created_at: Timestamp;
}

// =============================================================================
// AUDIT_LOG — Registro de acciones del admin
// =============================================================================
export interface AuditLog {
  id: UUID;
  store_id: UUID;
  admin_email: string;
  accion: 'crear' | 'editar' | 'eliminar' | 'activar' | 'desactivar';
  entidad: string;
  entidad_id: UUID | null;
  detalle: Record<string, unknown> | null;
  created_at: Timestamp;
}

// =============================================================================
// TENANT — Contexto de la tienda activa (resuelto por el middleware)
// Se inyecta como header en cada request y se usa en los Server Components.
// =============================================================================
export interface TenantContext {
  store_id: UUID;
  store_slug: string;
  resolved_by: 'subdomain' | 'custom_domain' | 'query-param-dev';
}
