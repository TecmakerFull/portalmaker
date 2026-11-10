// =============================================================================
// PORTALMAKER — Helper para Resolución y Defaults de Secciones de Storefront
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Store,
  StoreSection,
  TopBarSettings,
  TopBarMessageItem,
  HeaderSettings,
  NavbarSettings,
  NavbarItem,
  HeroBannerSettings,
  HeroBannerSlide,
  TrustBarItem,
  TrustBarSettings,
  FooterSettings,
  CatalogHeaderSettings,
  StorySettings,
  StoryPillar,
  NewsletterSettings,
} from '@/types/database'
import { DEFAULT_TRUST_ITEMS, DEFAULT_TRUST_ITEMS_SERVICIOS } from '@/lib/trust-icons'
import { getStoreEffectiveLimit } from '@/lib/plans'

export interface ResolvedStoreSections {
  top_bar: StoreSection<TopBarSettings, TopBarMessageItem[]>
  header: StoreSection<HeaderSettings, []>
  navbar: StoreSection<NavbarSettings, NavbarItem[]>
  hero: StoreSection<HeroBannerSettings, HeroBannerSlide[]>
  sectionsList: StoreSection[]
}

/**
 * Genera la configuración por defecto de secciones para cualquier tienda.
 * Garantiza retrocompatibilidad total si la tienda no tiene filas en store_sections.
 */
/**
 * Enlaces del menú hacia el catálogo según lo que vende la tienda: productos,
 * servicios o ambos (en ese caso, los dos, porque en la portada conviven).
 */
export function itemsCatalogoNavbar(tipo: string | null | undefined): NavbarItem[] {
  const base = { tipo_destino: 'catalogo' as const, destacado: false, badge_texto: null, activo: true }
  if (tipo === 'servicios') {
    return [{ ...base, id: 'nav-1', texto: 'Servicios', destino_url: '/tienda', orden: 1 }]
  }
  if (tipo === 'ambos') {
    return [
      { ...base, id: 'nav-1', texto: 'Productos', destino_url: '/tienda', orden: 1 },
      // La portada de "ambos" tiene los servicios en su propia sección (#servicios)
      { ...base, id: 'nav-1b', texto: 'Servicios', destino_url: '/tienda#servicios', tipo_destino: 'pagina' as const, orden: 1.5 },
    ]
  }
  return [{ ...base, id: 'nav-1', texto: 'Productos', destino_url: '/tienda', orden: 1 }]
}

/**
 * Los menús ya guardados traen el texto "Productos" fijo, aunque la tienda haya
 * pasado a servicios después. Si el enlace es el automático (nunca renombrado por
 * la dueña: id nav-1 con el texto original), se reemplaza por el que corresponde.
 */
function ajustarCatalogoAlTipo(items: NavbarItem[], tipo: string | null | undefined): NavbarItem[] {
  const auto = items.find((it) => it.id === 'nav-1' && it.tipo_destino === 'catalogo' && (it.texto === 'Productos' || it.texto === 'Servicios'))
  if (!auto) return items
  const resto = items.filter((it) => it.id !== 'nav-1' && it.id !== 'nav-1b')
  return [...itemsCatalogoNavbar(tipo).map((it) => ({ ...it, activo: auto.activo })), ...resto].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
}

export function getDefaultStoreSections(
  store: Store,
  hasSobreNosotros: boolean = false
): ResolvedStoreSections {
  // 1. Top Bar Default
  const defaultTopBar: StoreSection<TopBarSettings, TopBarMessageItem[]> = {
    id: `default-top-bar-${store.id}`,
    store_id: store.id,
    section_type: 'top_bar',
    enabled: false, // Inactiva por defecto hasta que el maker cargue sus mensajes
    orden: 1,
    settings: {
      modo: 'rotativo',
      intervalo_segundos: 4,
      velocidad_ticker: 25,
      pausar_hover: true,
      fondo_color: 'primario',
      mostrar_en_mobile: true,
    },
    content: [
      {
        id: 'msg-1',
        // Una tienda solo de servicios no envía nada
        texto: store.tipo_negocio === 'servicios' ? 'Reservá tu turno online' : 'Envíos a todo el país',
        icono: store.tipo_negocio === 'servicios' ? 'Clock' : 'Truck',
        link_url: '',
        activo: true,
        orden: 1,
      },
      {
        id: 'msg-2',
        texto: 'Consultas por WhatsApp',
        icono: 'MessageSquare',
        link_url: store.whatsapp_numero ? `https://wa.me/${store.whatsapp_numero.replace(/[^0-9]/g, '')}` : '',
        activo: true,
        orden: 2,
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // 2. Header Default
  const defaultHeader: StoreSection<HeaderSettings, []> = {
    id: `default-header-${store.id}`,
    store_id: store.id,
    section_type: 'header',
    enabled: true,
    orden: 2,
    settings: {
      mostrar_logo: true,
      logo_tamano: 'mediano',
      mostrar_nombre: true,
      mostrar_slogan: true,
      tamano_slogan: 'mediano',
      mostrar_buscador: true,
      mostrar_carrito: true,
      mostrar_whatsapp_flotante: true,
      mostrar_tema_toggle: true,
      logo_posicion: 'centro',
      sticky: true,
    },
    content: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // 3. Navbar Default
  const navbarLinks: NavbarItem[] = itemsCatalogoNavbar(store.tipo_negocio)

  if (hasSobreNosotros) {
    navbarLinks.push({
      id: 'nav-2',
      texto: 'Sobre Nosotros',
      tipo_destino: 'pagina',
      destino_url: '/tienda/sobre-nosotros',
      destacado: false,
      badge_texto: null,
      activo: true,
      orden: 2,
    })
  }

  navbarLinks.push({
    id: 'nav-3',
    texto: 'Contacto & Ubicación',
    tipo_destino: 'pagina',
    destino_url: '/tienda/contacto',
    destacado: false,
    badge_texto: null,
    activo: true,
    orden: 3,
  })

  const defaultNavbar: StoreSection<NavbarSettings, NavbarItem[]> = {
    id: `default-navbar-${store.id}`,
    store_id: store.id,
    section_type: 'navbar',
    enabled: true,
    orden: 3,
    settings: {
      alineacion: 'centro',
      estilo: 'linea',
      sticky: false,
    },
    content: navbarLinks,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // 4. Hero / Banners Default
  const defaultHero: StoreSection<HeroBannerSettings, HeroBannerSlide[]> = {
    id: `default-hero-${store.id}`,
    store_id: store.id,
    section_type: 'hero',
    enabled: store.banners_activo ?? false,
    orden: 4,
    settings: {
      modo: 'carrusel',
      autoplay: true,
      intervalo_segundos: 5,
      mostrar_flechas: true,
      mostrar_indicadores: true,
      pausar_hover: true,
      altura: 'adaptable',
    },
    content: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return {
    top_bar: defaultTopBar,
    header: defaultHeader,
    navbar: defaultNavbar,
    hero: defaultHero,
    sectionsList: [defaultTopBar, defaultHeader, defaultNavbar, defaultHero],
  }
}

// -----------------------------------------------------------------------------
// Secciones "extra" de la portada: mensajes de confianza, encabezado del
// catálogo, "por qué elegirnos", novedades y footer.
// Viven aparte de sectionsList porque no participan del orden del encabezado.
// Sus textos por defecto son neutros (sirven para cualquier rubro) porque la
// mayoría de los dueños no los va a editar.
// -----------------------------------------------------------------------------
export interface StoreExtraSections {
  trust_bar: StoreSection<TrustBarSettings, TrustBarItem[]>
  catalog_header: StoreSection<CatalogHeaderSettings, []>
  story: StoreSection<StorySettings, StoryPillar[]>
  newsletter: StoreSection<NewsletterSettings, []>
  footer: StoreSection<FooterSettings, []>
}

/** Tipos de sección extra, en el orden en que aparecen en la portada. */
export const EXTRA_SECTION_TYPES = ['trust_bar', 'catalog_header', 'story', 'newsletter', 'footer'] as const

export function getDefaultExtraSections(store: Store): StoreExtraSections {
  const now = new Date().toISOString()
  const soloServicios = store.tipo_negocio === 'servicios'
  const base = (type: string, orden: number) => ({
    id: `default-${type}-${store.id}`,
    store_id: store.id,
    section_type: type,
    enabled: true, // Todo visible por defecto: las tiendas existentes no pierden secciones
    orden,
    created_at: now,
    updated_at: now,
  })

  return {
    trust_bar: {
      ...base('trust_bar', 10),
      settings: { mostrar_en_producto: true },
      content: soloServicios ? DEFAULT_TRUST_ITEMS_SERVICIOS : DEFAULT_TRUST_ITEMS,
    },
    catalog_header: {
      ...base('catalog_header', 11),
      settings: soloServicios
        ? {
            etiqueta: 'Nuestros servicios',
            titulo: 'Reservá tu turno',
            subtitulo: 'Elegí el servicio, el día y el horario que te queden mejor.',
          }
        : {
            etiqueta: 'Nuestros productos',
            titulo: 'Tus próximos favoritos',
            subtitulo: 'Elegí lo que te guste y hacé tu pedido online.',
          },
      content: [],
    },
    story: {
      ...base('story', 12),
      settings: {
        etiqueta: 'Por qué elegirnos',
        titulo: `Bienvenido a ${store.nombre}`,
        // En tiendas de servicios no se habla de productos ni de compras
        texto: soloServicios
          ? store.slogan
            ? `${store.slogan}. Te atendemos con dedicación y cuidamos cada detalle de tu turno.`
            : 'Te atendemos con dedicación y cuidamos cada detalle de tu turno.'
          : store.slogan
            ? `${store.slogan}. Elegimos cada producto con cuidado y te acompañamos antes y después de tu compra.`
            : 'Elegimos cada producto con cuidado y te acompañamos antes y después de tu compra.',
        mostrar_link_historia: true,
      },
      content: [
        { id: 'pilar-1', icono: 'BadgeCheck', titulo: 'Calidad en cada detalle', texto: soloServicios ? 'Trabajamos con dedicación en cada servicio.' : 'Productos elegidos con cuidado.' },
        { id: 'pilar-2', icono: 'Headphones', titulo: 'Atención cercana', texto: 'Respondemos tus consultas de forma rápida y personal.' },
      ],
    },
    newsletter: {
      ...base('newsletter', 13),
      settings: {
        etiqueta: 'Novedades',
        titulo: 'Enterate primero de las novedades',
        texto: 'Lanzamientos y ofertas exclusivas directo en tu correo.',
      },
      content: [],
    },
    footer: {
      ...base('footer', 14),
      settings: { mostrar_medios_pago: true, medios_pago: null },
      content: [],
    },
  }
}

/** Combina las filas guardadas en store_sections con los valores por defecto. */
export function mergeExtraSections(store: Store, rows: StoreSection[]): StoreExtraSections {
  const defaults = getDefaultExtraSections(store)
  const find = (type: string) => rows.find((r) => r.section_type === type)

  // Mezcla settings (los campos nuevos que falten toman el default) y, para las
  // secciones con lista, respeta un array vacío guardado: el dueño los borró a propósito.
  const merge = <S, C>(def: StoreSection<S, C>, row: StoreSection | undefined, hasList: boolean): StoreSection<S, C> => {
    if (!row) return def
    return {
      ...def,
      ...row,
      settings: { ...def.settings, ...(row.settings || {}) },
      content: hasList ? (Array.isArray(row.content) ? row.content : def.content) : def.content,
    } as StoreSection<S, C>
  }

  return {
    trust_bar: merge(defaults.trust_bar, find('trust_bar'), true),
    catalog_header: merge(defaults.catalog_header, find('catalog_header'), false),
    story: merge(defaults.story, find('story'), true),
    newsletter: merge(defaults.newsletter, find('newsletter'), false),
    footer: merge(defaults.footer, find('footer'), false),
  }
}

/**
 * Consulta Supabase y fusiona las secciones personalizadas con los valores por defecto.
 */
export async function getStoreSections(
  supabase: SupabaseClient,
  storeId: string,
  store: Store,
  hasSobreNosotros: boolean = false
): Promise<ResolvedStoreSections> {
  const defaults = getDefaultStoreSections(store, hasSobreNosotros)

  try {
    const { data: dbSections, error } = await supabase
      .from('store_sections')
      .select('*')
      .eq('store_id', storeId)
      .order('orden', { ascending: true })

    if (error || !dbSections || dbSections.length === 0) {
      return defaults
    }

    const sectionsMap = new Map<string, StoreSection>()
    dbSections.forEach((sec) => sectionsMap.set(sec.section_type, sec))

    const topBarSec = sectionsMap.get('top_bar') as StoreSection<TopBarSettings, TopBarMessageItem[]> | undefined
    const headerSec = sectionsMap.get('header') as StoreSection<HeaderSettings, []> | undefined
    const navbarSec = sectionsMap.get('navbar') as StoreSection<NavbarSettings, NavbarItem[]> | undefined
    const heroSec = sectionsMap.get('hero') as StoreSection<HeroBannerSettings, HeroBannerSlide[]> | undefined

    const resolvedTopBar = topBarSec
      ? {
          ...defaults.top_bar,
          ...topBarSec,
          settings: { ...defaults.top_bar.settings, ...(topBarSec.settings || {}) },
          content: Array.isArray(topBarSec.content) && topBarSec.content.length > 0 ? topBarSec.content : defaults.top_bar.content,
        }
      : defaults.top_bar

    const resolvedHeader = headerSec
      ? {
          ...defaults.header,
          ...headerSec,
          settings: { ...defaults.header.settings, ...(headerSec.settings || {}) },
        }
      : defaults.header

    const resolvedNavbar = navbarSec
      ? {
          ...defaults.navbar,
          ...navbarSec,
          settings: { ...defaults.navbar.settings, ...(navbarSec.settings || {}) },
          content:
            Array.isArray(navbarSec.content) && navbarSec.content.length > 0
              ? ajustarCatalogoAlTipo(navbarSec.content, store.tipo_negocio)
              : defaults.navbar.content,
        }
      : defaults.navbar

    const resolvedHero = heroSec
      ? {
          ...defaults.hero,
          ...heroSec,
          settings: { ...defaults.hero.settings, ...(heroSec.settings || {}) },
          content: Array.isArray(heroSec.content) ? heroSec.content : defaults.hero.content,
        }
      : defaults.hero

    // Si hero no tiene slides en store_sections pero hay banners en la tabla banners, mapearlos
    if (resolvedHero.content.length === 0) {
      const { data: legacyBanners } = await supabase
        .from('banners')
        .select('*')
        .eq('store_id', storeId)
        .eq('activo', true)
        .order('orden', { ascending: true })

      if (legacyBanners && legacyBanners.length > 0) {
        resolvedHero.content = legacyBanners.map((b) => ({
          id: b.id,
          imagen_desktop: b.imagen_url,
          imagen_mobile: null,
          titulo: b.titulo,
          subtitulo: b.subtitulo,
          texto_adicional: null,
          cta_texto: b.cta_texto,
          cta_url: b.cta_url,
          activo: b.activo,
          orden: b.orden,
        }))
        if (store.banners_activo) {
          resolvedHero.enabled = true
        }
      }
    }

    // Respetar el límite de slides del plan efectivo de la tienda en la portada pública
    const maxSlides = getStoreEffectiveLimit(store, 'banners_max_slides') || 1
    if (Array.isArray(resolvedHero.content) && resolvedHero.content.length > maxSlides) {
      resolvedHero.content = resolvedHero.content.slice(0, maxSlides)
    }

    const allOrdered = [resolvedTopBar, resolvedHeader, resolvedNavbar, resolvedHero].sort(
      (a, b) => (a.orden ?? 0) - (b.orden ?? 0)
    )

    return {
      top_bar: resolvedTopBar,
      header: resolvedHeader,
      navbar: resolvedNavbar,
      hero: resolvedHero,
      sectionsList: allOrdered,
    }
  } catch (err) {
    console.error('Error al obtener store_sections:', err)
    return defaults
  }
}
