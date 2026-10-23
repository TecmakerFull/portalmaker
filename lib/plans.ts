// =============================================================================
// PORTALMAKER — Definición Oficial de Planes, Límites y Funcionalidades
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import type { Store } from '@/types/database'

export type PlanKey = 'free' | 'starter' | 'maker_pro' | 'enterprise' | 'bonificado'

export interface PlanLimits {
  key: PlanKey
  nombre: string
  nivel: number
  badgeColor: string
  precioMensualSugerido: number
  descripcion: string

  // Catálogo & Productos
  limiteProductos: number
  gestionaStock: boolean
  trazabilidadStock: boolean

  // Ventas & Cobros
  modoOperacionDefault: 'vitrina' | 'tienda'
  checkoutActivo: boolean
  transferenciaBancaria: boolean
  mercadoPagoHabilitado: boolean
  comisionPortalmakerPct: number

  // Logística & Envíos
  retiroEnTaller: boolean
  enviosZonasFijas: boolean // Tarifas fijas manuales creadas por el maker
  enviosCouriersEnVivo: boolean // Zipnova, Correo Argentino, Andreani con cotización automática

  // Branding & Diseño
  subdominioPortalmaker: boolean
  dominioPropio: boolean
  logoPersonal: boolean
  paletaColoresPersonalizable: boolean
  bannersMaxSlides: number
  paginasInstitucionales: boolean

  // Gestión & Equipo
  maxColaboradoresExtra: number // 0 en Free (solo dueño), 1 en Starter (dueño + 1), 3 en Pro, 999 en Enterprise
  crmClientes: boolean
  resenasProductos: boolean
  analyticsTracking: boolean // Google Analytics y Meta Pixel
  diasGraciaDefault: number
}

export const PLANS_CONFIG: Record<PlanKey, PlanLimits> = {
  free: {
    key: 'free',
    nombre: 'Free / Vitrina',
    nivel: 1,
    badgeColor: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700',
    precioMensualSugerido: 0,
    descripcion: 'Catálogo online y pedidos directos por WhatsApp para comenzar a mostrar piezas sin costo.',

    limiteProductos: 15,
    gestionaStock: true,
    trazabilidadStock: false,

    modoOperacionDefault: 'vitrina',
    checkoutActivo: false,
    transferenciaBancaria: false,
    mercadoPagoHabilitado: false,
    comisionPortalmakerPct: 0,

    retiroEnTaller: true,
    enviosZonasFijas: false,
    enviosCouriersEnVivo: false,

    subdominioPortalmaker: true,
    dominioPropio: false,
    logoPersonal: true,
    paletaColoresPersonalizable: true,
    bannersMaxSlides: 1, // 1 banner estático
    paginasInstitucionales: true,

    maxColaboradoresExtra: 0, // Solo el dueño
    crmClientes: false,
    resenasProductos: false,
    analyticsTracking: false,
    diasGraciaDefault: 3,
  },

  starter: {
    key: 'starter',
    nombre: 'Starter',
    nivel: 2,
    badgeColor: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    precioMensualSugerido: 12000,
    descripcion: 'Tienda transaccional con carrito, tarifas de envío fijas y cobros integrados.',

    limiteProductos: 50,
    gestionaStock: true,
    trazabilidadStock: true,

    modoOperacionDefault: 'tienda',
    checkoutActivo: true,
    transferenciaBancaria: true,
    mercadoPagoHabilitado: true,
    comisionPortalmakerPct: 5.0,

    retiroEnTaller: true,
    enviosZonasFijas: true, // Zonas manuales fijas (ej. CABA $4.000, Moto $5.500)
    enviosCouriersEnVivo: false,

    subdominioPortalmaker: true,
    dominioPropio: false,
    logoPersonal: true,
    paletaColoresPersonalizable: true,
    bannersMaxSlides: 3,
    paginasInstitucionales: true,

    maxColaboradoresExtra: 1, // Dueño + 1 colaborador
    crmClientes: true,
    resenasProductos: true,
    analyticsTracking: false,
    diasGraciaDefault: 5,
  },

  maker_pro: {
    key: 'maker_pro',
    nombre: 'Maker Pro',
    nivel: 3,
    badgeColor: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    precioMensualSugerido: 25000,
    descripcion: 'La herramienta definitiva para makers consolidados con couriers en vivo, dominio propio y mayor capacidad.',

    limiteProductos: 150,
    gestionaStock: true,
    trazabilidadStock: true,

    modoOperacionDefault: 'tienda',
    checkoutActivo: true,
    transferenciaBancaria: true,
    mercadoPagoHabilitado: true,
    comisionPortalmakerPct: 2.5,

    retiroEnTaller: true,
    enviosZonasFijas: true,
    enviosCouriersEnVivo: true, // Correo Argentino, Zipnova, Andreani cotización en tiempo real

    subdominioPortalmaker: true,
    dominioPropio: true, // mitienda.com.ar incluido
    logoPersonal: true,
    paletaColoresPersonalizable: true,
    bannersMaxSlides: 10,
    paginasInstitucionales: true,

    maxColaboradoresExtra: 3, // Dueño + hasta 3 colaboradores
    crmClientes: true,
    resenasProductos: true,
    analyticsTracking: true, // GA4 + Meta Pixel
    diasGraciaDefault: 7,
  },

  enterprise: {
    key: 'enterprise',
    nombre: 'Enterprise',
    nivel: 4,
    badgeColor: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    precioMensualSugerido: 50000,
    descripcion: 'Para talleres y fabricantes a gran escala: catálogo ilimitado, 0% comisión y equipo ilimitado.',

    limiteProductos: 9999,
    gestionaStock: true,
    trazabilidadStock: true,

    modoOperacionDefault: 'tienda',
    checkoutActivo: true,
    transferenciaBancaria: true,
    mercadoPagoHabilitado: true,
    comisionPortalmakerPct: 0, // 0% comisión Portalmaker para nivel 4

    retiroEnTaller: true,
    enviosZonasFijas: true,
    enviosCouriersEnVivo: true,

    subdominioPortalmaker: true,
    dominioPropio: true,
    logoPersonal: true,
    paletaColoresPersonalizable: true,
    bannersMaxSlides: 999,
    paginasInstitucionales: true,

    maxColaboradoresExtra: 999, // Ilimitados
    crmClientes: true,
    resenasProductos: true,
    analyticsTracking: true,
    diasGraciaDefault: 15,
  },

  bonificado: {
    key: 'bonificado',
    nombre: 'Bonificado',
    nivel: 4,
    badgeColor: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    precioMensualSugerido: 0,
    descripcion: 'Cuenta bonificada para fundadores, partners estratégicos o beta testers con acceso completo.',

    limiteProductos: 9999,
    gestionaStock: true,
    trazabilidadStock: true,

    modoOperacionDefault: 'tienda',
    checkoutActivo: true,
    transferenciaBancaria: true,
    mercadoPagoHabilitado: true,
    comisionPortalmakerPct: 0,

    retiroEnTaller: true,
    enviosZonasFijas: true,
    enviosCouriersEnVivo: true,

    subdominioPortalmaker: true,
    dominioPropio: true,
    logoPersonal: true,
    paletaColoresPersonalizable: true,
    bannersMaxSlides: 999,
    paginasInstitucionales: true,

    maxColaboradoresExtra: 999,
    crmClientes: true,
    resenasProductos: true,
    analyticsTracking: true,
    diasGraciaDefault: 30,
  },
}

// Claves de funcionalidades que pueden estar activas o bloqueadas
export type PlanFeatureKey =
  | 'checkout_online'
  | 'mercado_pago'
  | 'envios_zonas_fijas'
  | 'envios_couriers'
  | 'trazabilidad_stock'
  | 'crm_clientes'
  | 'resenas'
  | 'colaboradores'
  | 'dominio_propio'
  | 'analytics'

export interface FeatureRequirement {
  id: PlanFeatureKey
  nombre: string
  categoria: 'ventas' | 'logistica' | 'catalogo' | 'branding' | 'gestion'
  minPlan: PlanKey
  minPlanNombre: string
  descripcion: string
}

export const FEATURE_REQUIREMENTS: Record<PlanFeatureKey, FeatureRequirement> = {
  checkout_online: {
    id: 'checkout_online',
    nombre: 'Carrito y Checkout Online',
    categoria: 'ventas',
    minPlan: 'starter',
    minPlanNombre: 'Plan Starter',
    descripcion: 'Permite a tus clientes comprar piezas directamente con carrito y pasarela.',
  },
  mercado_pago: {
    id: 'mercado_pago',
    nombre: 'Mercado Pago (Tarjetas / Cuotas)',
    categoria: 'ventas',
    minPlan: 'starter',
    minPlanNombre: 'Plan Starter',
    descripcion: 'Cobro automatizado con tarjetas de crédito, débito y dinero en cuenta.',
  },
  envios_zonas_fijas: {
    id: 'envios_zonas_fijas',
    nombre: 'Tarifas de Envío Fijas',
    categoria: 'logistica',
    minPlan: 'starter',
    minPlanNombre: 'Plan Starter',
    descripcion: 'Tarifas manuales creadas por el maker por zona geográfica o código postal.',
  },
  envios_couriers: {
    id: 'envios_couriers',
    nombre: 'Couriers en Vivo (Correo Arg / Andreani)',
    categoria: 'logistica',
    minPlan: 'maker_pro',
    minPlanNombre: 'Plan Maker Pro',
    descripcion: 'Cotización en tiempo real según peso/volumen y generación de etiquetas de despacho.',
  },
  trazabilidad_stock: {
    id: 'trazabilidad_stock',
    nombre: 'Historial y Movimientos de Stock',
    categoria: 'catalogo',
    minPlan: 'starter',
    minPlanNombre: 'Plan Starter',
    descripcion: 'Trazabilidad de entradas, salidas, ventas y ajustes de inventario.',
  },
  crm_clientes: {
    id: 'crm_clientes',
    nombre: 'Clientes Registrados en CRM',
    categoria: 'gestion',
    minPlan: 'starter',
    minPlanNombre: 'Plan Starter',
    descripcion: 'Base de datos de compradores con historial de pedidos e información de contacto.',
  },
  resenas: {
    id: 'resenas',
    nombre: 'Reseñas Públicas de Compradores',
    categoria: 'gestion',
    minPlan: 'starter',
    minPlanNombre: 'Plan Starter',
    descripcion: 'Calificaciones de 1 a 5 estrellas y opiniones en fichas de producto.',
  },
  colaboradores: {
    id: 'colaboradores',
    nombre: 'Colaboradores de Taller',
    categoria: 'gestion',
    minPlan: 'starter',
    minPlanNombre: 'Plan Starter',
    descripcion: 'Cuentas secundarias para socios o ayudantes con acceso al panel.',
  },
  dominio_propio: {
    id: 'dominio_propio',
    nombre: 'Dominio Propio (.com.ar)',
    categoria: 'branding',
    minPlan: 'maker_pro',
    minPlanNombre: 'Plan Maker Pro',
    descripcion: 'Conecta tu propio dominio web personalizado con certificado SSL incluido.',
  },
  analytics: {
    id: 'analytics',
    nombre: 'Google Analytics & Meta Pixel',
    categoria: 'branding',
    minPlan: 'maker_pro',
    minPlanNombre: 'Plan Maker Pro',
    descripcion: 'Seguimiento de tráfico y campañas publicitarias en Meta y Google.',
  },
}

/**
 * Obtiene la configuración base del plan
 */
export function getPlanConfig(planKey?: string | null): PlanLimits {
  const normalized = (planKey || 'free').toLowerCase() as PlanKey
  return PLANS_CONFIG[normalized] || PLANS_CONFIG.free
}

/**
 * Verifica si una tienda tiene habilitada una funcionalidad específica.
 * IMPORTANTE: Si el superadmin otorgó un override explícito en la base de datos
 * (ej: store.envios_activo === true o store.checkout_activo === true),
 * el override manual del superadmin prevalece sobre el plan base.
 */
export function isFeatureAllowed(
  store: Store | null | undefined,
  feature: PlanFeatureKey
): {
  allowed: boolean
  isManualOverride: boolean
  minPlanNombre: string
  reason?: string
} {
  if (!store) {
    return { allowed: false, isManualOverride: false, minPlanNombre: 'Plan Starter' }
  }

  const plan = getPlanConfig(store.plan)
  const req = FEATURE_REQUIREMENTS[feature]
  const minPlanNombre = req?.minPlanNombre || 'Plan Starter'

  // 1. Overrides manuales del superadmin (prevalecen sobre cualquier plan)
  switch (feature) {
    case 'checkout_online':
      if (store.checkout_activo === true || store.modo_operacion === 'tienda') {
        return { allowed: true, isManualOverride: plan.key === 'free', minPlanNombre }
      }
      break

    case 'mercado_pago':
      if (store.mp_connected) {
        return { allowed: true, isManualOverride: plan.key === 'free', minPlanNombre }
      }
      break

    case 'envios_zonas_fijas':
    case 'envios_couriers':
      if (store.envios_activo === true) {
        return { allowed: true, isManualOverride: plan.key === 'free', minPlanNombre }
      }
      break

    case 'dominio_propio':
      if (Boolean(store.custom_domain)) {
        return { allowed: true, isManualOverride: plan.nivel < 3, minPlanNombre }
      }
      break

    case 'analytics':
      if (Boolean(store.ga_measurement_id || store.meta_pixel_id)) {
        return { allowed: true, isManualOverride: plan.nivel < 3, minPlanNombre }
      }
      break
  }

  // 2. Evaluación por nivel de plan base
  const planReq = PLANS_CONFIG[req.minPlan]
  const allowed = plan.nivel >= planReq.nivel

  return {
    allowed,
    isManualOverride: false,
    minPlanNombre,
  }
}

/**
 * Matriz estructurada de comparación para renderizar en UI (como la imagen de referencia)
 */
export interface MatrixCategory {
  nombre: string
  items: {
    nombre: string
    descripcion: string
    free: string | boolean
    starter: string | boolean
    maker_pro: string | boolean
    enterprise: string | boolean
  }[]
}

export const SUBSCRIPTION_MATRIX: MatrixCategory[] = [
  {
    nombre: 'Catálogo & Productos',
    items: [
      {
        nombre: 'Límite de Productos Activos',
        descripcion: 'Cantidad máxima de piezas publicadas simultáneamente',
        free: '15 piezas',
        starter: '50 piezas',
        maker_pro: '150 piezas',
        enterprise: 'Ilimitado',
      },
      {
        nombre: 'Gestión de Stock y Variantes',
        descripcion: 'Colores, tamaños, materiales (PLA, PETG, Resina) con stock propio',
        free: true,
        starter: true,
        maker_pro: true,
        enterprise: true,
      },
      {
        nombre: 'Historial y Trazabilidad de Stock',
        descripcion: 'Registro de entradas, salidas, ventas y motivos de ajuste',
        free: false,
        starter: true,
        maker_pro: true,
        enterprise: true,
      },
    ],
  },
  {
    nombre: 'Ventas, Cobros & Pasarelas',
    items: [
      {
        nombre: 'Canal de Pedidos por WhatsApp',
        descripcion: 'Comunicación directa y personalizada con el maker',
        free: true,
        starter: true,
        maker_pro: true,
        enterprise: true,
      },
      {
        nombre: 'Carrito y Checkout Online',
        descripcion: 'Procesamiento de órdenes web en checkout sin intermediación',
        free: false,
        starter: true,
        maker_pro: true,
        enterprise: true,
      },
      {
        nombre: 'Transferencia Bancaria Directa',
        descripcion: 'Datos de CBU/Alias propios sin comisión',
        free: false,
        starter: true,
        maker_pro: true,
        enterprise: true,
      },
      {
        nombre: 'Mercado Pago (Tarjetas & Cuotas)',
        descripcion: 'Cobro automatizado con acreditación a tu cuenta',
        free: false,
        starter: true,
        maker_pro: true,
        enterprise: true,
      },
      {
        nombre: 'Comisión Portalmaker en Mercado Pago',
        descripcion: 'Retención de plataforma por cada venta procesada',
        free: 'Sin pasarela',
        starter: '5.0%',
        maker_pro: '2.5%',
        enterprise: '0% (Sin comisión)',
      },
    ],
  },
  {
    nombre: 'Logística & Envíos',
    items: [
      {
        nombre: 'Retiro en Taller / A coordinar',
        descripcion: 'Permite entregar en mano sin costo de flete',
        free: true,
        starter: true,
        maker_pro: true,
        enterprise: true,
      },
      {
        nombre: 'Tarifas de Envío Fijas por Zona',
        descripcion: 'Precios manuales definidos por el maker (ej. CABA $4.000)',
        free: false,
        starter: true,
        maker_pro: true,
        enterprise: true,
      },
      {
        nombre: 'Couriers en Vivo (Correo Arg / Andreani)',
        descripcion: 'Cotización automática por CP y emisión de etiquetas de despacho',
        free: false,
        starter: false,
        maker_pro: true,
        enterprise: true,
      },
    ],
  },
  {
    nombre: 'Identidad, Marca & Diseño',
    items: [
      {
        nombre: 'Subdominio oficial .portalmaker.ar',
        descripcion: 'Dirección web pública dentro de la red',
        free: true,
        starter: true,
        maker_pro: true,
        enterprise: true,
      },
      {
        nombre: 'Logo e Ícono Personal',
        descripcion: 'Personalización de la identidad visual de tu taller',
        free: true,
        starter: true,
        maker_pro: true,
        enterprise: true,
      },
      {
        nombre: 'Paleta de Colores Personalizable',
        descripcion: 'Colores a medida y modo oscuro automático',
        free: true,
        starter: true,
        maker_pro: true,
        enterprise: true,
      },
      {
        nombre: 'Banners Promocionales',
        descripcion: 'Carrusel de cabecera con promociones y llamados a la acción',
        free: '1 banner fijo',
        starter: 'Hasta 3 slides',
        maker_pro: 'Hasta 10 slides',
        enterprise: 'Ilimitados',
      },
      {
        nombre: 'Páginas Institucionales',
        descripcion: 'Sobre Nosotros, Contacto, Preguntas Frecuentes',
        free: true,
        starter: true,
        maker_pro: true,
        enterprise: true,
      },
      {
        nombre: 'Dominio Propio Personalizado (.com.ar)',
        descripcion: 'Tu propia dirección web sin subdominios con certificado SSL',
        free: false,
        starter: false,
        maker_pro: true,
        enterprise: true,
      },
    ],
  },
  {
    nombre: 'Gestión, Equipo & Soporte',
    items: [
      {
        nombre: 'Colaboradores de Taller',
        descripcion: 'Accesos adicionales para socios o ayudantes',
        free: 'Solo dueño',
        starter: 'Dueño + 1 colaborador',
        maker_pro: 'Dueño + 3 colaboradores',
        enterprise: 'Ilimitados',
      },
      {
        nombre: 'CRM de Clientes Registrados',
        descripcion: 'Listado y seguimiento de compradores frecuentes',
        free: false,
        starter: true,
        maker_pro: true,
        enterprise: true,
      },
      {
        nombre: 'Reseñas de Clientes',
        descripcion: 'Calificaciones de 1 a 5 estrellas con comentarios verificados',
        free: false,
        starter: true,
        maker_pro: true,
        enterprise: true,
      },
      {
        nombre: 'Google Analytics & Meta Pixel',
        descripcion: 'Métricas de visitantes y conversiones de publicidad',
        free: false,
        starter: false,
        maker_pro: true,
        enterprise: true,
      },
      {
        nombre: 'Tolerancia y Días de Gracia',
        descripcion: 'Días adicionales de servicio tras vencer el ciclo mensual',
        free: '3 días',
        starter: '5 días',
        maker_pro: '7 días',
        enterprise: '15 días',
      },
    ],
  },
]
