// =============================================================================
// PORTALMAKER — Constantes globales de la aplicación
// "El portal del Maker" | portalmaker.com.ar
//
// Centraliza todos los valores "hardcodeados" del proyecto en un solo lugar.
// Para cambiar el dominio, el nombre de la plataforma o los colores por defecto,
// solo hay que editar este archivo.
// =============================================================================


// =============================================================================
// PLATAFORMA
// =============================================================================

export const PLATFORM = {
  /** Nombre público de la plataforma */
  nombre: 'Portalmaker',
  /** Tagline de la plataforma */
  tagline: 'El portal del Maker',
  /** Dominio principal del portal (sin protocolo, sin www) */
  domain: process.env.NEXT_PUBLIC_PORTAL_DOMAIN ?? 'portalmaker.com.ar',
  /** URL completa del portal */
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://portalmaker.com.ar',
} as const;


// =============================================================================
// COLORES — Paleta por defecto del PORTAL (no de las tiendas)
// Los colores de las tiendas vienen de la BD (stores.color_primario, etc.)
// Estos son los colores de portalmaker.com.ar en sí mismo.
// =============================================================================

export const PORTAL_COLORS = {
  primario:   '#6B8F71',  // verde salvia — paleta "Industrial"
  secundario: '#2F3336',  // carbón
  fondo:      '#F5F4F1',  // hueso
  texto:      '#202224',
} as const;


// =============================================================================
// TIPOGRAFÍAS — Opciones disponibles para las tiendas
// Solo fuentes de Google Fonts, seleccionables desde /admin/branding.
// No se permite texto libre para evitar tipografías que rompan el diseño.
// =============================================================================

export const AVAILABLE_FONTS = [
  { label: 'Inter',        value: 'Inter',         style: 'sans-serif' },
  { label: 'Outfit',       value: 'Outfit',        style: 'sans-serif' },
  { label: 'Playfair Display', value: 'Playfair Display', style: 'serif' },
  { label: 'Space Grotesk', value: 'Space Grotesk', style: 'sans-serif' },
  { label: 'DM Serif Display', value: 'DM Serif Display', style: 'serif' },
] as const;

export type AvailableFont = typeof AVAILABLE_FONTS[number]['value'];


// =============================================================================
// PALETAS DE COLOR PRESET
// Las 6 paletas predefinidas para tiendas, con sus versiones claro y oscuro.
// Al seleccionar un preset desde /admin/branding, se cargan los 8 campos
// (color_primario, color_secundario, color_fondo, color_texto + sus dark).
// Fuente de verdad: feature_catalog.md secciones 24 y 27.
// =============================================================================

export interface ColorPreset {
  id: number;
  nombre: string;
  descripcion: string;          // a quién está orientada
  claro: {
    primario: string;
    secundario: string;
    fondo: string;
    texto: string;
  };
  oscuro: {
    primario: string;
    secundario: string;
    fondo: string;
    texto: string;
  };
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 1,
    nombre: 'Industrial',
    descripcion: 'Taller/manufactura — estabilidad y precisión técnica',
    claro:  { primario: '#6B8F71', secundario: '#2F3336', fondo: '#F5F4F1', texto: '#202224' },
    oscuro: { primario: '#82A889', secundario: '#44484A', fondo: '#1C1E1F', texto: '#EDEDEA' },
  },
  {
    id: 2,
    nombre: 'Minimal B/N',
    descripcion: 'Piezas de diseño — atemporal, máximo contraste',
    claro:  { primario: '#111111', secundario: '#6B6B6B', fondo: '#FFFFFF', texto: '#111111' },
    oscuro: { primario: '#F2F2F2', secundario: '#9A9A9A', fondo: '#121212', texto: '#F2F2F2' },
  },
  {
    id: 3,
    nombre: 'Mahogany Premium',
    descripcion: 'Trabajos a medida / gama alta — calidad premium',
    claro:  { primario: '#6B2B2B', secundario: '#3A2C28', fondo: '#F7F3EF', texto: '#241C1A' },
    oscuro: { primario: '#A85C5C', secundario: '#6B5147', fondo: '#201613', texto: '#F0E7E1' },
  },
  {
    id: 4,
    nombre: 'Teal Tecnológico',
    descripcion: 'Corte y grabado láser — precisión, look tech',
    claro:  { primario: '#1F6F6B', secundario: '#163A3D', fondo: '#F2F6F5', texto: '#16211F' },
    oscuro: { primario: '#4FA8A3', secundario: '#2C5C58', fondo: '#0F1E1D', texto: '#E8F1EF' },
  },
  {
    id: 5,
    nombre: 'Cálida Natural',
    descripcion: 'Productos decorativos/hogar — artesanal y sustentable',
    claro:  { primario: '#A9713F', secundario: '#4A433C', fondo: '#F3EDE4', texto: '#2B2620' },
    oscuro: { primario: '#C99A63', secundario: '#6B6155', fondo: '#211C16', texto: '#EFE7DC' },
  },
  {
    id: 6,
    nombre: 'Corporate Navy',
    descripcion: 'Clientes B2B / pedidos corporativos — look formal',
    claro:  { primario: '#1B3A5C', secundario: '#8E97A3', fondo: '#FAFAF8', texto: '#1A1C1E' },
    oscuro: { primario: '#4A7BA6', secundario: '#6E7A87', fondo: '#12181F', texto: '#EDEFF2' },
  },
];


// =============================================================================
// SLUGS DE PÁGINAS INFORMATIVAS POR DEFECTO
// Se crean automáticamente al dar de alta una tienda nueva.
// El contenido inicial es un placeholder que el maker reemplaza desde /admin/paginas.
// =============================================================================

export const DEFAULT_PAGE_SLUGS = [
  'sobre-nosotros',
  'contacto',
  'preguntas-frecuentes',
  'envios-y-devoluciones',
  'terminos-y-condiciones',
] as const;

export type DefaultPageSlug = typeof DEFAULT_PAGE_SLUGS[number];

// Contenido placeholder inicial por página (HTML simple, apto para el editor WYSIWYG)
export const DEFAULT_PAGE_CONTENT: Record<DefaultPageSlug, { titulo: string; contenido: string }> = {
  'sobre-nosotros': {
    titulo: 'Sobre Nosotros',
    contenido: `<h2>¿Quiénes somos?</h2>
<p>Contá aquí la historia de tu taller, tu experiencia y qué te apasiona del mundo maker.</p>
<h2>Nuestra misión</h2>
<p>¿Qué querés comunicar sobre tu propuesta de valor? ¿Qué te diferencia de otros talleres?</p>`,
  },
  'contacto': {
    titulo: 'Contacto',
    contenido: `<p>Escribinos para consultas, pedidos personalizados o presupuestos. Respondemos en menos de 24hs.</p>`,
  },
  'preguntas-frecuentes': {
    titulo: 'Preguntas Frecuentes',
    contenido: `<h3>¿Cuánto tarda un pedido?</h3>
<p>Completá con los tiempos reales de fabricación y entrega.</p>
<h3>¿Hacen pedidos personalizados?</h3>
<p>Describí aquí tu política de personalización.</p>
<h3>¿Cómo puedo pagar?</h3>
<p>Listá los métodos de pago disponibles.</p>`,
  },
  'envios-y-devoluciones': {
    titulo: 'Envíos y Devoluciones',
    contenido: `<h2>Opciones de envío</h2>
<p>Describí tus zonas de cobertura y tiempos estimados de entrega.</p>
<h2>Política de devoluciones</h2>
<p>Explicá en qué casos aceptás devoluciones o cambios.</p>`,
  },
  'terminos-y-condiciones': {
    titulo: 'Términos y Condiciones',
    contenido: `<p>Al realizar una compra en esta tienda, aceptás los siguientes términos y condiciones.</p>
<h2>Productos</h2>
<p>Describí las condiciones de venta de tus productos.</p>`,
  },
};


// =============================================================================
// PAGINACIÓN
// =============================================================================

export const PAGINATION = {
  productosPorPagina: 24,
  pedidosPorPagina: 20,
  movimientosPorPagina: 30,
} as const;


// =============================================================================
// MÉTRICAS — Períodos disponibles para los filtros del dashboard
// =============================================================================

export const METRIC_PERIODS = [
  { label: 'Últimos 7 días',  value: 7   },
  { label: 'Últimos 30 días', value: 30  },
  { label: 'Últimos 90 días', value: 90  },
] as const;

export type MetricPeriod = typeof METRIC_PERIODS[number]['value'];


// =============================================================================
// SUSCRIPCIÓN — Umbrales visuales (semáforo de estado)
// Se usan en /admin/suscripcion y en el panel del developer.
// =============================================================================

export const SUBSCRIPTION_THRESHOLDS = {
  /** Días restantes para mostrar alerta amarilla */
  alertaAmarilla: 7,
} as const;
