// =============================================================================
// PORTALMAKER — Sidebar de Administración con Menú Hamburguesa Mobile
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  Home,
  Store,
  Package,
  FolderTree,
  PlusCircle,
  ListOrdered,
  Globe,
  User,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ArrowLeft,
  Loader2,
  Menu,
  X,
  Palette,
  MessageSquare,
  ShoppingBag,
  CreditCard,
  BookOpen,
  Users,
  Star,
  UserCheck,
  Mail,
  Truck,
  Lock,
  Sparkles,
  Info,
  Phone,
  Image as ImageIcon,
} from 'lucide-react'
import type { Store as StoreType } from '@/types/database'
import ThemeToggle from '@/app/tienda/theme-toggle'
import { isFeatureAllowed, FEATURE_REQUIREMENTS, getPlanConfig } from '@/lib/plans'

export default function AdminSidebar({
  store,
  tenantQuery,
}: {
  store: StoreType
  tenantQuery: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const isTiendaRoute =
    pathname.includes('/tienda/admin/branding') ||
    pathname.includes('/tienda/admin/diseno') ||
    pathname.includes('/tienda/admin/banners') ||
    pathname.includes('/tienda/admin/sobre-nosotros') ||
    pathname.includes('/tienda/admin/contacto') ||
    pathname.includes('/tienda/admin/envios') ||
    pathname.includes('/tienda/admin/pagos') ||
    pathname.includes('/tienda/admin/dominio')

  const isProductosRoute =
    pathname.includes('/tienda/admin/productos') ||
    pathname.includes('/tienda/admin/categorias')

  // Estados de navegación (replegados por defecto a pedido del usuario)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openTienda, setOpenTienda] = useState(false)
  const [openProductos, setOpenProductos] = useState(false)
  const [openCuenta, setOpenCuenta] = useState(false)

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Estado del interruptor de tienda encendida/apagada
  const [tiendaEncendida, setTiendaEncendida] = useState(store.suscripcion_activa ?? true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // URL del portal para volver a portalmaker.ar sin prefetch RSC erróneo en subdominio
  const [portalMakerUrl, setPortalMakerUrl] = useState('https://portalmaker.ar')
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.host
      const proto = window.location.protocol
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        setPortalMakerUrl(`${proto}//${host}/`)
      } else if (host.endsWith('portalmaker.ar')) {
        setPortalMakerUrl(`${proto}//portalmaker.ar/`)
      } else if (host.endsWith('portalmaker.com.ar')) {
        setPortalMakerUrl(`${proto}//portalmaker.com.ar/`)
      } else {
        setPortalMakerUrl('https://portalmaker.ar/')
      }
    }
  }, [])

  const isInicio = pathname === '/tienda/admin'
  const isGuia = pathname.includes('/tienda/admin/guia')
  const isVentas = pathname.includes('/tienda/admin/ventas')
  const isClientes = pathname.includes('/tienda/admin/clientes')
  const isResenas = pathname.includes('/tienda/admin/resenas')
  const isColaboradores = pathname.includes('/tienda/admin/colaboradores')
  const isSuscriptores = pathname.includes('/tienda/admin/suscriptores')
  const isCategorias = pathname.includes('/tienda/admin/categorias')
  const isNuevoProducto = pathname.includes('/tienda/admin/productos/nuevo')
  const isProductosAdmin =
    pathname.includes('/tienda/admin/productos') && !isNuevoProducto && !isCategorias
  const isDiseno = pathname.includes('/tienda/admin/diseno')
  const isBranding = pathname.includes('/tienda/admin/branding')
  const isBanners = pathname.includes('/tienda/admin/banners')
  const isSobreNosotros = pathname.includes('/tienda/admin/sobre-nosotros')
  const isContacto = pathname.includes('/tienda/admin/contacto')
  const isEnvios = pathname.includes('/tienda/admin/envios')
  const isPagos = pathname.includes('/tienda/admin/pagos')
  const isDominio = pathname.includes('/tienda/admin/dominio')
  const isPerfil = pathname.includes('/tienda/admin/perfil')
  const isSuscripcion = pathname.includes('/tienda/admin/suscripcion')

  const currentPlan = getPlanConfig(store.plan)
  const canEnvios = isFeatureAllowed(store, 'envios_zonas_fijas') || isFeatureAllowed(store, 'envios_couriers')
  const canCheckout = isFeatureAllowed(store, 'checkout_online') || isFeatureAllowed(store, 'mercado_pago')
  const canColaboradores = isFeatureAllowed(store, 'colaboradores')
  const canClientes = isFeatureAllowed(store, 'crm_clientes')
  const canResenas = isFeatureAllowed(store, 'resenas')
  const canDominio = isFeatureAllowed(store, 'dominio_propio')

  // Alternar estado Encendida / Apagada
  const handleToggleTienda = async () => {
    if (updatingStatus) return
    setUpdatingStatus(true)
    const nuevoEstado = !tiendaEncendida

    try {
      const { error } = await supabase
        .from('stores')
        .update({ suscripcion_activa: nuevoEstado })
        .eq('id', store.id)

      if (error) throw error

      setTiendaEncendida(nuevoEstado)
      router.refresh()
    } catch (err) {
      console.error('Error al cambiar estado de la tienda:', err)
      setTiendaEncendida(tiendaEncendida)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const navContent = (
    <>
      {/* Switch: Tienda Encendida / Tienda Apagada */}
      <div className="px-4 py-3 bg-[var(--color-fondo)]/60 border-b border-[var(--color-borde)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {updatingStatus ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
          ) : (
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                tiendaEncendida ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
          )}
          <span
            className={`text-xs font-bold ${
              tiendaEncendida
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {tiendaEncendida ? 'Tienda Encendida' : 'Tienda Apagada'}
          </span>
        </div>

        {/* Toggle Switch (Touch Target 44px) */}
        <button
          type="button"
          onClick={handleToggleTienda}
          disabled={updatingStatus}
          title={
            tiendaEncendida
              ? 'Click para pausar la tienda (modo mantenimiento)'
              : 'Click para encender y publicar la tienda'
          }
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            tiendaEncendida ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
              tiendaEncendida ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Menú de Navegación Vertical */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {/* 1. Inicio */}
        <Link
          href={`/tienda/admin${tenantQuery}`}
          prefetch={true}
          className={`min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
            isInicio
              ? 'bg-[#FACC15] text-[#1F2937] shadow-xs'
              : 'opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Inicio</span>
        </Link>

        {/* 2. Guía Paso a Paso */}
        <Link
          href={`/tienda/admin/guia${tenantQuery}`}
          prefetch={true}
          className={`min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
            isGuia
              ? 'bg-[#FACC15] text-[#1F2937] shadow-xs'
              : 'opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Guía Paso a Paso</span>
        </Link>

        {/* 3. Grupo: Mi Tienda (Configuración de marca, diseño y datos del negocio) */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setOpenTienda(!openTienda)}
            className="min-h-[44px] w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Store className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
              <span>Mi tienda</span>
            </div>
            {openTienda ? (
              <ChevronDown className="w-4 h-4 opacity-50" />
            ) : (
              <ChevronRight className="w-4 h-4 opacity-50" />
            )}
          </button>

          {openTienda && (
            <div className="ml-4 pl-3 border-l border-[var(--color-borde)] space-y-1 mt-1">
              <Link
                href={`/tienda/admin/branding${tenantQuery}`}
                prefetch={true}
                className={`min-h-[40px] flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98] ${
                  isBranding
                    ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Palette className="w-4 h-4 shrink-0" />
                <span>Colores & Logo</span>
              </Link>
              <Link
                href={`/tienda/admin/diseno${tenantQuery}`}
                prefetch={true}
                className={`min-h-[40px] flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98] ${
                  isDiseno
                    ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Diseño de Tienda</span>
              </Link>
              <Link
                href={`/tienda/admin/banners${tenantQuery}`}
                prefetch={true}
                className={`min-h-[40px] flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98] ${
                  isBanners
                    ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <ImageIcon className="w-4 h-4 shrink-0" />
                <span>Banners & Promos</span>
              </Link>
              <Link
                href={`/tienda/admin/sobre-nosotros${tenantQuery}`}
                prefetch={true}
                className={`min-h-[40px] flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98] ${
                  isSobreNosotros
                    ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Info className="w-4 h-4 shrink-0" />
                <span>Sobre Nosotros</span>
              </Link>
              <Link
                href={`/tienda/admin/contacto${tenantQuery}`}
                prefetch={true}
                className={`min-h-[40px] flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98] ${
                  isContacto
                    ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Phone className="w-4 h-4 shrink-0" />
                <span>Contacto & Ubicación</span>
              </Link>

              {/* Envíos & Logística */}
              {canEnvios ? (
                <Link
                  href={`/tienda/admin/envios${tenantQuery}`}
                  prefetch={true}
                  className={`min-h-[40px] flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98] ${
                    isEnvios
                      ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                      : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Truck className="w-4 h-4 shrink-0" />
                  <span>Envíos & Logística</span>
                </Link>
              ) : (
                <Link
                  href={`/tienda/admin/envios${tenantQuery}`}
                  prefetch={true}
                  className="min-h-[40px] flex items-center justify-between px-3 py-1.5 rounded-lg text-sm font-medium opacity-45 hover:opacity-75 text-zinc-400 dark:text-zinc-500 transition-all"
                  title="Módulo de envíos configurables disponible a partir del plan Starter (Nivel 2)"
                >
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 shrink-0 text-zinc-400" />
                    <span>Envíos & Logística</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300/50 dark:border-zinc-700">
                    <Lock className="w-2.5 h-2.5" />
                    Starter
                  </span>
                </Link>
              )}

              <Link
                href={`/tienda/admin/pagos${tenantQuery}`}
                prefetch={true}
                className={`min-h-[40px] flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98] ${
                  isPagos
                    ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>Cobros & Transferencia</span>
              </Link>

              {/* Dominio Propio */}
              {canDominio ? (
                <Link
                  href={`/tienda/admin/dominio${tenantQuery}`}
                  prefetch={true}
                  className={`min-h-[40px] flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98] ${
                    isDominio
                      ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                      : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Globe className="w-4 h-4 shrink-0" />
                  <span>Dominio Propio</span>
                </Link>
              ) : (
                <Link
                  href={`/tienda/admin/dominio${tenantQuery}`}
                  prefetch={true}
                  className="min-h-[40px] flex items-center justify-between px-3 py-1.5 rounded-lg text-sm font-medium opacity-45 hover:opacity-75 text-zinc-400 dark:text-zinc-500 transition-all"
                  title="Dominio propio disponible a partir del plan Maker Pro (Nivel 3)"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 shrink-0 text-zinc-400" />
                    <span>Dominio Propio</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300/50 dark:border-zinc-700">
                    <Lock className="w-2.5 h-2.5" />
                    Maker Pro
                  </span>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* 3. Grupo: Productos (Catálogo, inventario y categorías) */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setOpenProductos(!openProductos)}
            className="min-h-[44px] w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Package className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
              <span>Productos</span>
            </div>
            {openProductos ? (
              <ChevronDown className="w-4 h-4 opacity-50" />
            ) : (
              <ChevronRight className="w-4 h-4 opacity-50" />
            )}
          </button>

          {openProductos && (
            <div className="ml-4 pl-3 border-l border-[var(--color-borde)] space-y-1 mt-1">
              <Link
                href={`/tienda/admin/categorias${tenantQuery}`}
                prefetch={true}
                className={`min-h-[40px] flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isCategorias
                    ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <FolderTree className="w-4 h-4" />
                <span>Categorías</span>
              </Link>
              <Link
                href={`/tienda/admin/productos/nuevo${tenantQuery}`}
                prefetch={true}
                className={`min-h-[40px] flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isNuevoProducto
                    ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Agregar productos</span>
              </Link>
              <Link
                href={`/tienda/admin/productos${tenantQuery}`}
                prefetch={true}
                className={`min-h-[40px] flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isProductosAdmin
                    ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <ListOrdered className="w-4 h-4" />
                <span>Administrar productos</span>
              </Link>
            </div>
          )}
        </div>

        {/* 4. Gestión, métricas y operaciones */}
        {/* Ventas & Pedidos */}
        {canCheckout ? (
          <Link
            href={`/tienda/admin/ventas${tenantQuery}`}
            prefetch={true}
            className={`min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isVentas
                ? 'bg-[#FACC15] text-[#1F2937] shadow-xs'
                : 'opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Ventas & Pedidos</span>
          </Link>
        ) : (
          <Link
            href={`/tienda/admin/ventas${tenantQuery}`}
            prefetch={true}
            className="min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold opacity-45 hover:opacity-75 text-zinc-400 dark:text-zinc-500 transition-colors"
            title="Gestión de ventas y checkout disponible a partir de Nivel 2 (Starter)"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4 text-zinc-400" />
              <span>Ventas & Pedidos</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300/50 dark:border-zinc-700">
              <Lock className="w-2.5 h-2.5" />
              Starter
            </span>
          </Link>
        )}

        {/* Clientes & CRM */}
        {canClientes ? (
          <Link
            href={`/tienda/admin/clientes${tenantQuery}`}
            prefetch={true}
            className={`min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isClientes
                ? 'bg-[#FACC15] text-[#1F2937] shadow-xs'
                : 'opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes & CRM</span>
          </Link>
        ) : (
          <Link
            href={`/tienda/admin/clientes${tenantQuery}`}
            prefetch={true}
            className="min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold opacity-45 hover:opacity-75 text-zinc-400 dark:text-zinc-500 transition-colors"
            title="CRM de clientes disponible a partir de Nivel 2 (Starter)"
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-zinc-400" />
              <span>Clientes & CRM</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300/50 dark:border-zinc-700">
              <Lock className="w-2.5 h-2.5" />
              Starter
            </span>
          </Link>
        )}

        {/* Reseñas */}
        {canResenas ? (
          <Link
            href={`/tienda/admin/resenas${tenantQuery}`}
            prefetch={true}
            className={`min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isResenas
                ? 'bg-[#FACC15] text-[#1F2937] shadow-xs'
                : 'opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Reseñas</span>
          </Link>
        ) : (
          <Link
            href={`/tienda/admin/resenas${tenantQuery}`}
            prefetch={true}
            className="min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold opacity-45 hover:opacity-75 text-zinc-400 dark:text-zinc-500 transition-colors"
            title="Reseñas de clientes disponibles a partir de Nivel 2 (Starter)"
          >
            <div className="flex items-center gap-2.5">
              <Star className="w-4 h-4 text-zinc-400" />
              <span>Reseñas</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300/50 dark:border-zinc-700">
              <Lock className="w-2.5 h-2.5" />
              Starter
            </span>
          </Link>
        )}

        {/* Colaboradores */}
        {canColaboradores ? (
          <Link
            href={`/tienda/admin/colaboradores${tenantQuery}`}
            prefetch={true}
            className={`min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isColaboradores
                ? 'bg-[#FACC15] text-[#1F2937] shadow-xs'
                : 'opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Colaboradores</span>
          </Link>
        ) : (
          <Link
            href={`/tienda/admin/colaboradores${tenantQuery}`}
            prefetch={true}
            className="min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold opacity-45 hover:opacity-75 text-zinc-400 dark:text-zinc-500 transition-colors"
            title="Colaboradores de taller disponibles a partir de Nivel 2 (Starter)"
          >
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-4 h-4 text-zinc-400" />
              <span>Colaboradores</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300/50 dark:border-zinc-700">
              <Lock className="w-2.5 h-2.5" />
              Starter
            </span>
          </Link>
        )}

        {/* Marketing & Suscriptores */}
        <Link
          href={`/tienda/admin/suscriptores${tenantQuery}`}
          prefetch={true}
          className={`min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
            isSuscriptores
              ? 'bg-[#FACC15] text-[#1F2937] shadow-xs'
              : 'opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Suscriptores</span>
        </Link>

        {/* 5. Grupo: Mi cuenta (Contiene Perfil y Mi Suscripción) */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setOpenCuenta(!openCuenta)}
            className="min-h-[44px] w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4" />
              <span>Mi cuenta</span>
            </div>
            {openCuenta ? (
              <ChevronDown className="w-4 h-4 opacity-50" />
            ) : (
              <ChevronRight className="w-4 h-4 opacity-50" />
            )}
          </button>

          {openCuenta && (
            <div className="ml-4 pl-3 border-l border-[var(--color-borde)] space-y-1 mt-1">
              <Link
                href={`/tienda/admin/perfil${tenantQuery}`}
                prefetch={true}
                className={`min-h-[40px] flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isPerfil
                    ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Perfil y Datos</span>
              </Link>
              <Link
                href={`/tienda/admin/suscripcion${tenantQuery}`}
                prefetch={true}
                className={`min-h-[40px] flex items-center justify-between px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isSuscripcion
                    ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Mi Suscripción</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                  {currentPlan.nombre}
                </span>
              </Link>
            </div>
          )}
        </div>

        {/* Enlace a Tienda Pública */}
        <div className="pt-4 mt-4 border-t border-[var(--color-borde)]">
          <Link
            href={`/tienda${tenantQuery}`}
            target="_blank"
            className="min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Store className="w-4 h-4 opacity-70" />
              <span>Ver mi tienda</span>
            </div>
            <ExternalLink className="w-4 h-4 opacity-40" />
          </Link>
        </div>
      </nav>

      {/* Footer del Sidebar con datos rápidos del administrador */}
      <div className="p-3 border-t border-[var(--color-borde)]">
        <Link
          href={`/tienda/admin/perfil${tenantQuery}`}
          className="min-h-[44px] flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
          title="Ver perfil y datos básicos del administrador"
        >
          <div className="w-7 h-7 rounded-lg bg-[var(--color-fondo)]/80 border border-[var(--color-borde)] flex items-center justify-center shrink-0 opacity-70 group-hover:opacity-100">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block font-mono text-[11px] font-semibold truncate group-hover:underline opacity-90">
              {store.admin_email}
            </span>
            <span className="block text-[10px] opacity-60 truncate">
              Admin &bull; {store.nombre}
            </span>
          </div>
        </Link>
      </div>
    </>
  )

  return (
    <>
      {/* 1. Header Fijo para Dispositivos Móviles (< md) */}
      <div className="md:hidden bg-[var(--color-superficie)] border-b border-[var(--color-borde)] px-4 py-3 flex items-center justify-between sticky top-0 z-40 transition-colors duration-200">
        <div className="flex items-center gap-3">
          {/* Botón Menú Hamburguesa (Touch target 44x44px) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/50 text-[var(--color-texto)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo + Nombre */}
          <div className="flex items-center gap-2">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.nombre}
                className="w-7 h-7 rounded-lg object-contain bg-white/5 border border-[var(--color-borde)] shadow-2xs shrink-0"
              />
            ) : (
              <Image
                src="/logo.png"
                alt="Portalmaker"
                width={28}
                height={28}
                className="w-7 h-7 rounded-lg object-contain shadow-2xs shrink-0"
              />
            )}
            <span className="font-bold text-sm truncate max-w-[140px] font-[var(--font-heading)]">
              {store.nombre}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Indicador estado rápido */}
          <span
            className={`w-2 h-2 rounded-full ${
              tiendaEncendida ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
            title={tiendaEncendida ? 'Tienda Encendida' : 'Tienda Apagada'}
          />

          <ThemeToggle className="!w-8 !h-8 !min-w-[32px] !min-h-[32px] rounded-lg" />

          <a
            href={portalMakerUrl}
            title="Ir a Portalmaker.ar"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* 2. Drawer Móvil con Overlay Deslizante (< md) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
          {/* Overlay oscuro al fondo */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menú Lateral Deslizante */}
          <div className="relative w-4/5 max-w-xs bg-[var(--color-superficie)] h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {/* Header del Drawer */}
            <div className="p-4 border-b border-[var(--color-borde)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {store.logo_url ? (
                  <img
                    src={store.logo_url}
                    alt={store.nombre}
                    className="w-7 h-7 rounded-lg object-contain bg-white/5 border border-[var(--color-borde)] shadow-2xs shrink-0"
                  />
                ) : (
                  <Image
                    src="/logo.png"
                    alt="Portalmaker"
                    width={30}
                    height={30}
                    className="w-7 h-7 rounded-lg object-contain shadow-2xs shrink-0"
                  />
                )}
                <span className="font-bold text-sm truncate font-[var(--font-heading)]">
                  {store.nombre}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {navContent}
          </div>
        </div>
      )}

      {/* 3. Sidebar Fijo de Escritorio (md en adelante) */}
      <aside className="hidden md:flex w-64 bg-[var(--color-superficie)] border-r border-[var(--color-borde)] flex-col shrink-0 transition-colors duration-200 select-none">
        {/* Header de Escritorio */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-borde)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.nombre}
                className="w-7 h-7 rounded-lg object-contain bg-white/5 border border-[var(--color-borde)] shadow-2xs shrink-0"
              />
            ) : (
              <Image
                src="/logo.png"
                alt="Portalmaker"
                width={32}
                height={32}
                className="w-7 h-7 rounded-lg object-contain shadow-2xs shrink-0"
              />
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate max-w-[150px] font-[var(--font-heading)] leading-tight">
                {store.nombre}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle className="!w-8 !h-8 !min-w-[32px] !min-h-[32px] rounded-lg" />
            <a
              href={portalMakerUrl}
              title="Ir a Portalmaker.ar"
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </a>
          </div>
        </div>

        {navContent}
      </aside>
    </>
  )
}
