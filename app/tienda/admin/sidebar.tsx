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
} from 'lucide-react'
import type { Store as StoreType } from '@/types/database'

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

  // Estados de navegación
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openTienda, setOpenTienda] = useState(true)
  const [openProductos, setOpenProductos] = useState(true)

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Estado del interruptor de tienda encendida/apagada
  const [tiendaEncendida, setTiendaEncendida] = useState(store.suscripcion_activa ?? true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const isInicio = pathname === '/tienda/admin'
  const isGuia = pathname.includes('/tienda/admin/guia')
  const isVentas = pathname.includes('/tienda/admin/ventas')
  const isCategorias = pathname.includes('/tienda/admin/categorias')
  const isNuevoProducto = pathname.includes('/tienda/admin/productos/nuevo')
  const isProductosAdmin =
    pathname.includes('/tienda/admin/productos') && !isNuevoProducto && !isCategorias
  const isDiseno = pathname.includes('/tienda/admin/diseno')
  const isBranding = pathname.includes('/tienda/admin/branding')
  const isBanners = pathname.includes('/tienda/admin/banners')
  const isSobreNosotros = pathname.includes('/tienda/admin/sobre-nosotros')
  const isContacto = pathname.includes('/tienda/admin/contacto')
  const isPagos = pathname.includes('/tienda/admin/pagos')
  const isDominio = pathname.includes('/tienda/admin/dominio')
  const isPerfil = pathname.includes('/tienda/admin/perfil')

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
        {/* Inicio */}
        <Link
          href={`/tienda/admin${tenantQuery}`}
          className={`min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
            isInicio
              ? 'bg-[#FACC15] text-[#1F2937] shadow-xs'
              : 'opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Inicio</span>
        </Link>

        {/* Guía Paso a Paso */}
        <Link
          href={`/tienda/admin/guia${tenantQuery}`}
          className={`min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
            isGuia
              ? 'bg-[#FACC15] text-[#1F2937] shadow-xs'
              : 'opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>Guía Paso a Paso</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-800 dark:text-amber-300">
            Tutorial
          </span>
        </Link>

        {/* Ventas & Pedidos */}
        <Link
          href={`/tienda/admin/ventas${tenantQuery}`}
          className={`min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
            isVentas
              ? 'bg-[#FACC15] text-[#1F2937] shadow-xs'
              : 'opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4" />
            <span>Ventas & Pedidos</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            Nuevo
          </span>
        </Link>

        {/* Grupo: Mi Tienda */}
        <div className="pt-2">
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
                href={`/tienda/admin/diseno${tenantQuery}`}
                className={`min-h-[40px] flex items-center justify-between px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isDiseno
                    ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span>Diseño de Tienda</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-700 dark:text-blue-400">
                  Nuevo
                </span>
              </Link>
              <Link
                href={`/tienda/admin/branding${tenantQuery}`}
                className={`min-h-[40px] flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isBranding
                    ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                Colores & Logo
              </Link>
              <Link
                href={`/tienda/admin/banners${tenantQuery}`}
                className={`min-h-[40px] flex items-center justify-between px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isBanners
                    ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span>Banners & Promos</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-[#FACC15]/20 text-[#CA8A04] dark:text-[#FACC15]">
                  Carrusel
                </span>
              </Link>
              <Link
                href={`/tienda/admin/sobre-nosotros${tenantQuery}`}
                className={`min-h-[40px] flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isSobreNosotros
                    ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                Sobre Nosotros
              </Link>
              <Link
                href={`/tienda/admin/contacto${tenantQuery}`}
                className={`min-h-[40px] flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isContacto
                    ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                Contacto & Ubicación
              </Link>
              <Link
                href={`/tienda/admin/pagos${tenantQuery}`}
                className={`min-h-[40px] flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isPagos
                    ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                Cobros & Transferencia
              </Link>
              <Link
                href={`/tienda/admin/dominio${tenantQuery}`}
                className={`min-h-[40px] flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isDominio
                    ? 'text-[#CA8A04] dark:text-[#FACC15] font-bold bg-[#FACC15]/10'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                Dominio Propio
              </Link>
            </div>
          )}
        </div>

        {/* Grupo: Productos */}
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

        {/* Mi Perfil / Cuenta */}
        <div className="pt-2">
          <Link
            href={`/tienda/admin/perfil${tenantQuery}`}
            className={`min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isPerfil
                ? 'bg-[#FACC15] text-[#1F2937] shadow-xs'
                : 'opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4" />
              <span>Mi cuenta</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
              Perfil
            </span>
          </Link>
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

      {/* Footer del Sidebar */}
      <div className="p-3.5 border-t border-[var(--color-borde)] text-xs flex items-center justify-between">
        <Link
          href={`/tienda/admin/perfil${tenantQuery}`}
          className="min-h-[36px] truncate font-mono text-[11px] opacity-70 hover:opacity-100 hover:underline flex items-center gap-1.5"
          title="Ver perfil de cuenta"
        >
          <User className="w-3.5 h-3.5 opacity-60" />
          <span className="truncate">{store.admin_email}</span>
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
            <Image
              src="/logo.png"
              alt="Portalmaker"
              width={28}
              height={28}
              className="w-7 h-7 rounded-lg object-contain shadow-2xs"
            />
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

          <Link
            href="/dashboard/maker"
            title="Volver al Portal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
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
                <Image
                  src="/logo.png"
                  alt="Portalmaker"
                  width={30}
                  height={30}
                  className="w-7 h-7 rounded-lg object-contain shadow-2xs"
                />
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
            <Image
              src="/logo.png"
              alt="Portalmaker"
              width={32}
              height={32}
              className="w-7 h-7 rounded-lg object-contain shadow-2xs"
            />
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate max-w-[150px] font-[var(--font-heading)] leading-tight">
                {store.nombre}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Link
              href="/dashboard/maker"
              title="Volver al Portal Maker"
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {navContent}
      </aside>
    </>
  )
}
