// =============================================================================
// PORTALMAKER — Constantes globales de la aplicación
// "El portal del Maker" | portalmaker.com.ar
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
  /** Número de WhatsApp de contacto y asesoramiento */
  whatsapp: process.env.NEXT_PUBLIC_PORTAL_WHATSAPP ?? '5493415866464',
  /** Correo de contacto y soporte */
  email: process.env.NEXT_PUBLIC_PORTAL_EMAIL ?? 'temperini@gmail.com',
} as const;


// =============================================================================
// COLORES — Paleta por defecto del PORTAL (Paleta 06: Yellow & Gray)
// =============================================================================

export const PORTAL_COLORS = {
  claro: {
    primario:   '#FACC15',  // Amarillo dorado moderno
    secundario: '#FDE68A',  // Amarillo suave
    fondo:      '#F3F4F6',  // Gris claro suave
    texto:      '#1F2937',  // Gris oscuro carbón
    borde:      '#E5E7EB',
  },
  oscuro: {
    primario:   '#FACC15',  // Amarillo dorado
    secundario: '#FDE68A',
    fondo:      '#111827',  // Carbón oscuro profundo
    texto:      '#F9FAFB',  // Blanco tiza
    borde:      '#374151',
  },
} as const;


// =============================================================================
// TIPOGRAFÍAS — Opciones disponibles para las tiendas
// =============================================================================

export const AVAILABLE_FONTS = [
  { label: 'Inter',            value: 'Inter',             style: 'sans-serif' },
  { label: 'Outfit',           value: 'Outfit',            style: 'sans-serif' },
  { label: 'Playfair Display', value: 'Playfair Display',  style: 'serif' },
  { label: 'Space Grotesk',    value: 'Space Grotesk',     style: 'sans-serif' },
  { label: 'DM Serif Display', value: 'DM Serif Display',  style: 'serif' },
] as const;

export type AvailableFont = typeof AVAILABLE_FONTS[number]['value'];


// =============================================================================
// PALETAS DE COLOR PRESET (10 Paletas Oficiales)
// =============================================================================

export interface ColorPreset {
  id: number;
  nombre: string;
  descripcion: string;
  tags: string;
  coloresHex: string[]; // los 5 colores de la muestra
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
    nombre: '01 Royal Blue & White',
    descripcion: 'Corporativo y tecnológico — alta confianza',
    tags: 'SaaS, Tech, Finance, Corporate',
    coloresHex: ['#2563EB', '#60A5FA', '#DBEAFE', '#F1F5F9', '#FFFFFF'],
    claro:  { primario: '#2563EB', secundario: '#60A5FA', fondo: '#FFFFFF', texto: '#0F172A' },
    oscuro: { primario: '#60A5FA', secundario: '#DBEAFE', fondo: '#0B132B', texto: '#F8FAFC' },
  },
  {
    id: 2,
    nombre: '02 Emerald & White',
    descripcion: 'Sustentabilidad y precisión — fresco y limpio',
    tags: 'Health, Finance, Sustainability, Apps',
    coloresHex: ['#10B981', '#34D399', '#A7F3D0', '#ECFDF5', '#FFFFFF'],
    claro:  { primario: '#10B981', secundario: '#34D399', fondo: '#FFFFFF', texto: '#064E3B' },
    oscuro: { primario: '#34D399', secundario: '#A7F3D0', fondo: '#06281F', texto: '#ECFDF5' },
  },
  {
    id: 3,
    nombre: '03 Orange & Navy',
    descripcion: 'Moderno y enérgico — estilo taller y fabricación',
    tags: 'Startups, Agencies, SaaS, Landing Pages',
    coloresHex: ['#F97316', '#FDBA74', '#0F172A', '#334155', '#F8FAFC'],
    claro:  { primario: '#F97316', secundario: '#FDBA74', fondo: '#F8FAFC', texto: '#0F172A' },
    oscuro: { primario: '#FB923C', secundario: '#FDBA74', fondo: '#0F172A', texto: '#F8FAFC' },
  },
  {
    id: 4,
    nombre: '04 Purple & Pink',
    descripcion: 'Creativo y artístico — piezas de diseño y autor',
    tags: 'SaaS, Portfolio, Creative, Agency',
    coloresHex: ['#7C3AED', '#A78BFA', '#EC4899', '#F9A8D4', '#FCE7F3'],
    claro:  { primario: '#7C3AED', secundario: '#EC4899', fondo: '#FFFFFF', texto: '#1E1B4B' },
    oscuro: { primario: '#A78BFA', secundario: '#F9A8D4', fondo: '#130924', texto: '#FCE7F3' },
  },
  {
    id: 5,
    nombre: '05 Teal & Dark',
    descripcion: 'Look tech y láser — sobrio con contrastes cian',
    tags: 'SaaS, AI Tools, Modern Websites',
    coloresHex: ['#0D9488', '#2DD4BF', '#0F766E', '#1F2937', '#111827'],
    claro:  { primario: '#0D9488', secundario: '#2DD4BF', fondo: '#F0FDFA', texto: '#111827' },
    oscuro: { primario: '#2DD4BF', secundario: '#0F766E', fondo: '#111827', texto: '#F0FDFA' },
  },
  {
    id: 6,
    nombre: '06 Yellow & Gray',
    descripcion: 'Alto impacto y calidez — paleta oficial de Portalmaker',
    tags: 'Business, Portfolio, Creative, Blogs',
    coloresHex: ['#FACC15', '#FDE68A', '#1F2937', '#6B7280', '#F3F4F6'],
    claro:  { primario: '#FACC15', secundario: '#FDE68A', fondo: '#F3F4F6', texto: '#1F2937' },
    oscuro: { primario: '#FACC15', secundario: '#FDE68A', fondo: '#111827', texto: '#F9FAFB' },
  },
  {
    id: 7,
    nombre: '07 Red & White',
    descripcion: 'Comercial y vibrante — ideal ofertas y promociones',
    tags: 'E-commerce, Offers, News, Landing Pages',
    coloresHex: ['#EF4444', '#F87171', '#FECACA', '#F3F4F6', '#FFFFFF'],
    claro:  { primario: '#EF4444', secundario: '#F87171', fondo: '#FFFFFF', texto: '#1C1917' },
    oscuro: { primario: '#F87171', secundario: '#FECACA', fondo: '#180D0D', texto: '#FEF2F2' },
  },
  {
    id: 8,
    nombre: '08 Blue & Light Gray',
    descripcion: 'Elegante y limpio — ingeniería y precisión',
    tags: 'Corporate, SaaS, Education, Tech',
    coloresHex: ['#3B82F6', '#93C5FD', '#DBEAFE', '#E5E7EB', '#FFFFFF'],
    claro:  { primario: '#3B82F6', secundario: '#93C5FD', fondo: '#FFFFFF', texto: '#1E293B' },
    oscuro: { primario: '#60A5FA', secundario: '#DBEAFE', fondo: '#0F172A', texto: '#F8FAFC' },
  },
  {
    id: 9,
    nombre: '09 Rose & Cream',
    descripcion: 'Cálido y artesanal — piezas decorativas y hogar',
    tags: 'Beauty, Fashion, Lifestyle, Blogs',
    coloresHex: ['#F43F5E', '#FB7185', '#FFF1F2', '#FEF3C7', '#FFFBEB'],
    claro:  { primario: '#F43F5E', secundario: '#FB7185', fondo: '#FFFBEB', texto: '#1C1917' },
    oscuro: { primario: '#FB7185', secundario: '#FEF3C7', fondo: '#1F1316', texto: '#FFF1F2' },
  },
  {
    id: 10,
    nombre: '10 Green & Black',
    descripcion: 'Look terminal maker / tech — moderno y contrastado',
    tags: 'SaaS, Finance, Crypto, Technology',
    coloresHex: ['#22C55E', '#4ADE80', '#16A34A', '#0D1117', '#1F2937'],
    claro:  { primario: '#16A34A', secundario: '#4ADE80', fondo: '#F0FDF4', texto: '#0D1117' },
    oscuro: { primario: '#22C55E', secundario: '#4ADE80', fondo: '#0D1117', texto: '#F0FDF4' },
  },
];

// =============================================================================
// SLUGS DE PÁGINAS INFORMATIVAS POR DEFECTO
// =============================================================================

export const DEFAULT_PAGE_SLUGS = [
  'sobre-nosotros',
  'contacto',
  'preguntas-frecuentes',
  'envios-y-devoluciones',
  'terminos-y-condiciones',
] as const;

export type DefaultPageSlug = typeof DEFAULT_PAGE_SLUGS[number];
