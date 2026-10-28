// =============================================================================
// PORTALMAKER — Gestor de Perfil, Datos de Tienda, Suscripción y Preferencias del Panel
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Store } from '@/types/database'
import {
  User,
  ShieldCheck,
  Calendar,
  Clock,
  Sun,
  Moon,
  Laptop,
  Globe,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Store as StoreIcon,
  Loader2,
  Save,
  Check,
  Mail,
  Phone,
  Power,
  ShoppingCart,
  BadgeCheck,
} from 'lucide-react'
import { getPlanConfig } from '@/lib/plans'
import { AdminPageHeader } from '../components/admin-page-header'

export default function PerfilManager({
  store,
  tenantQuery,
}: {
  store: Store
  tenantQuery: string
}) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  // Datos de la tienda editables desde el perfil
  const [nombre, setNombre] = useState(store.nombre)
  const [slogan, setSlogan] = useState(store.slogan ?? '')
  const [savingStore, setSavingStore] = useState(false)
  const [storeSuccessMsg, setStoreSuccessMsg] = useState<string | null>(null)
  const [storeErrorMsg, setStoreErrorMsg] = useState<string | null>(null)

  // Tema del panel del cliente: 'sistema' | 'light' | 'dark'
  const [panelTheme, setPanelTheme] = useState<'sistema' | 'light' | 'dark'>('sistema')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('portalmaker-admin-theme') as
        | 'sistema'
        | 'light'
        | 'dark'
        | null

      if (saved && (saved === 'light' || saved === 'dark' || saved === 'sistema')) {
        setPanelTheme(saved)
      } else {
        // Por defecto: sistema
        setPanelTheme('sistema')
      }
    } catch (e) {
      setPanelTheme('sistema')
    }
    setMounted(true)
  }, [])

  const handleChangeTheme = (theme: 'sistema' | 'light' | 'dark') => {
    try {
      localStorage.setItem('portalmaker-admin-theme', theme)
      localStorage.setItem('portalmaker-theme', theme === 'sistema' ? '' : theme)

      const effectiveTheme =
        theme === 'sistema'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : theme

      document.documentElement.setAttribute('data-theme', effectiveTheme)
      if (effectiveTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }

      setPanelTheme(theme)
    } catch (e) {
      console.error(e)
    }
  }

  // Guardar nombre y datos de la tienda
  const handleSaveStoreData = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      setStoreErrorMsg('El nombre de la tienda no puede estar vacío.')
      return
    }

    setSavingStore(true)
    setStoreErrorMsg(null)
    setStoreSuccessMsg(null)

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          nombre: nombre.trim(),
          slogan: slogan.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', store.id)

      if (error) throw error

      setStoreSuccessMsg('¡Nombre y datos de la tienda guardados correctamente!')
      router.refresh()
      setTimeout(() => setStoreSuccessMsg(null), 4000)
    } catch (err: any) {
      setStoreErrorMsg(err?.message || 'Error al guardar los datos de la tienda.')
    } finally {
      setSavingStore(false)
    }
  }

  // Cálculo de fechas y periodo de prueba (ej: 10 días de prueba base)
  const createdDate = new Date(store.created_at)
  const today = new Date()

  // Calcular días de antigüedad
  const diffTime = Math.abs(today.getTime() - createdDate.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  // Fecha de vencimiento o periodo de prueba
  let vencimiento = store.fecha_proximo_vencimiento
    ? new Date(store.fecha_proximo_vencimiento)
    : new Date(createdDate.getTime() + 10 * 24 * 60 * 60 * 1000) // 10 días de prueba por defecto

  const diasRestantes = Math.max(
    0,
    Math.ceil((vencimiento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  )

  const isTrial = !store.fecha_proximo_vencimiento || diasRestantes <= 10
  const trialProgress = Math.min(100, Math.max(0, ((10 - diasRestantes) / 10) * 100))

  return (
    <div className="space-y-5">
      {/* Encabezado Compacto y Proporcional */}
      <AdminPageHeader
        title="Perfil de Tienda"
        description="Modifica el nombre de tu página, revisa el estado de tu cuenta y personaliza tus preferencias."
        icon={User}
        className="!rounded-2xl !p-4 sm:!p-5"
      />

      {/* Layout Principal: 2 columnas en Desktop (2/3 y 1/3) y 1 columna en Móvil */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Columna Izquierda / Principal (2/3) */}
        <div className="lg:col-span-2 space-y-5">
          {/* 1. Nombre de la Tienda y Slogan */}
          <div className="bg-[var(--color-superficie)] rounded-2xl border border-[var(--color-borde)] p-4 sm:p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <StoreIcon className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
                <span>Nombre de tu Página / Tienda</span>
              </h2>
              <p className="text-xs opacity-70 mt-0.5">
                Configura el nombre público de tu tienda y el slogan visible en tu cabecera.
              </p>
            </div>

            <form onSubmit={handleSaveStoreData} className="space-y-4">
              {storeSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{storeSuccessMsg}</span>
                </div>
              )}

              {storeErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{storeErrorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium opacity-75 block">
                    Nombre de la Tienda *
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Tecmaker 3D"
                    required
                    className="w-full h-10 px-3 py-2 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium opacity-75 block">
                    Slogan / Frase corta
                  </label>
                  <input
                    type="text"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    placeholder="Ej: Insumos y servicio de impresión 3D"
                    className="w-full h-10 px-3 py-2 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15] transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingStore}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] font-semibold text-xs hover:bg-[#EAB308] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingStore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* 2. Datos Básicos del Administrador */}
          <div className="bg-[var(--color-superficie)] rounded-2xl border border-[var(--color-borde)] p-4 sm:p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
                <span>Datos Básicos del Administrador</span>
              </h2>
              <p className="text-xs opacity-70 mt-0.5">
                Información de contacto oficial, credenciales y configuración del taller.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Email Titular */}
              <div className="p-3 rounded-xl bg-[var(--color-fondo)]/40 border border-[var(--color-borde)] flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium opacity-60 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Email Titular
                  </span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    OAuth
                  </span>
                </div>
                <span className="text-xs font-mono font-medium truncate" title={store.admin_email}>
                  {store.admin_email}
                </span>
              </div>

              {/* Rol de Cuenta */}
              <div className="p-3 rounded-xl bg-[var(--color-fondo)]/40 border border-[var(--color-borde)] flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium opacity-60 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Rol de Cuenta
                  </span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-800 dark:text-amber-300">
                    Titular
                  </span>
                </div>
                <span className="text-xs font-semibold">Administrador General</span>
              </div>

              {/* WhatsApp Oficial */}
              <div className="p-3 rounded-xl bg-[var(--color-fondo)]/40 border border-[var(--color-borde)] flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium opacity-60 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    WhatsApp Oficial
                  </span>
                  <Link
                    href={`/tienda/admin/contacto${tenantQuery}`}
                    className="text-[10px] font-semibold text-[#CA8A04] dark:text-[#FACC15] hover:underline"
                  >
                    Editar
                  </Link>
                </div>
                <span className="text-xs font-mono font-semibold">
                  {store.whatsapp_numero || 'Sin configurar'}
                </span>
              </div>

              {/* Subdominio Portalmaker */}
              <div className="p-3 rounded-xl bg-[var(--color-fondo)]/40 border border-[var(--color-borde)] flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium opacity-60 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    Subdominio
                  </span>
                  <a
                    href={`/tienda${tenantQuery}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-semibold text-[#CA8A04] dark:text-[#FACC15] hover:underline flex items-center gap-0.5"
                  >
                    <span>Visitar</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <span className="text-xs font-medium truncate" title={`${store.slug}.portalmaker.ar`}>
                  {store.slug}.portalmaker.ar
                </span>
              </div>

              {/* Dominio Propio */}
              <div className="p-3 rounded-xl bg-[var(--color-fondo)]/40 border border-[var(--color-borde)] flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium opacity-60 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    Dominio Propio
                  </span>
                  <Link
                    href={`/tienda/admin/dominio${tenantQuery}`}
                    className="text-[10px] font-semibold text-[#CA8A04] dark:text-[#FACC15] hover:underline"
                  >
                    Gestionar
                  </Link>
                </div>
                <span className="text-xs font-medium truncate">
                  {store.custom_domain || 'Sin dominio vinculado'}
                </span>
              </div>

              {/* Modo de Operación */}
              <div className="p-3 rounded-xl bg-[var(--color-fondo)]/40 border border-[var(--color-borde)] flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium opacity-60 flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Modo Operativo
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      store.suscripcion_activa ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    title={store.suscripcion_activa ? 'Tienda Encendida' : 'Tienda Pausada'}
                  />
                </div>
                <span className="text-xs font-medium">
                  {store.modo_operacion === 'vitrina'
                    ? 'Vitrina Digital & WhatsApp'
                    : 'Tienda con Carrito & Checkout'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha / Lateral (1/3) */}
        <div className="space-y-5">
          {/* 3. Estado del Plan & Periodo de Prueba */}
          <div className="bg-[var(--color-superficie)] rounded-2xl border border-[var(--color-borde)] p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
                <h2 className="text-sm font-semibold">Estado del Plan</h2>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  store.suscripcion_activa
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                }`}
              >
                {store.suscripcion_activa ? 'Plan Activo' : 'En Pausa'}
              </span>
            </div>

            {/* Tarjeta de Días Restantes */}
            <div className="p-3.5 rounded-xl bg-[var(--color-fondo)]/40 border border-[var(--color-borde)] flex items-center justify-between">
              <div>
                <span className="text-[11px] opacity-60 uppercase font-medium tracking-wider block">
                  Días restantes
                </span>
                <span className="text-xl font-bold text-[#CA8A04] dark:text-[#FACC15]">
                  {diasRestantes} {diasRestantes === 1 ? 'día' : 'días'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] opacity-60 uppercase font-medium tracking-wider block">
                  Nivel
                </span>
                <span className="text-xs font-bold uppercase">
                  {getPlanConfig(store.plan).nombre}
                </span>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] opacity-70">
                <span>Día {diffDays} de uso</span>
                <span>Vence {vencimiento.toLocaleDateString('es-AR')}</span>
              </div>
              <div className="w-full bg-black/5 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#FACC15] h-full rounded-full transition-all duration-500"
                  style={{ width: `${trialProgress}%` }}
                />
              </div>
            </div>

            {/* Fechas clave compactas */}
            <div className="space-y-2 pt-2 border-t border-[var(--color-borde)] text-xs">
              <div className="flex items-center justify-between py-1 opacity-80">
                <span className="flex items-center gap-1.5 opacity-70">
                  <Calendar className="w-3.5 h-3.5" />
                  Fecha de alta
                </span>
                <span className="font-semibold">{createdDate.toLocaleDateString('es-AR')}</span>
              </div>
              <div className="flex items-center justify-between py-1 opacity-80">
                <span className="flex items-center gap-1.5 opacity-70">
                  <Clock className="w-3.5 h-3.5" />
                  Tiempo en línea
                </span>
                <span className="font-semibold">{diffDays} {diffDays === 1 ? 'día' : 'días'}</span>
              </div>
            </div>

            <Link
              href={`/tienda/admin/suscripcion${tenantQuery}`}
              className="min-h-[44px] w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-[var(--color-borde)] hover:border-[#FACC15] text-xs font-semibold hover:bg-[#FACC15]/10 text-[#CA8A04] dark:text-[#FACC15] transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gestionar Suscripción</span>
            </Link>
          </div>

          {/* 4. Preferencia de Visualización / Tema */}
          <div className="bg-[var(--color-superficie)] rounded-2xl border border-[var(--color-borde)] p-4 sm:p-5 shadow-xs space-y-3">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Sun className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
                <span>Tema del Panel</span>
              </h2>
              <p className="text-xs opacity-70 mt-0.5">
                Ajusta el modo visual de tu panel de administración.
              </p>
            </div>

            {/* Selector Segmentado Compacto */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-[var(--color-borde)]">
              <button
                type="button"
                onClick={() => handleChangeTheme('sistema')}
                className={`min-h-[44px] py-2 px-2 rounded-lg text-xs font-medium transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                  panelTheme === 'sistema'
                    ? 'bg-[var(--color-superficie)] text-[var(--color-texto)] shadow-xs font-semibold border border-[var(--color-borde)]'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px]">Auto</span>
              </button>
              <button
                type="button"
                onClick={() => handleChangeTheme('light')}
                className={`min-h-[44px] py-2 px-2 rounded-lg text-xs font-medium transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                  panelTheme === 'light'
                    ? 'bg-[var(--color-superficie)] text-[var(--color-texto)] shadow-xs font-semibold border border-[var(--color-borde)]'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Sun className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                <span className="text-[11px]">Claro</span>
              </button>
              <button
                type="button"
                onClick={() => handleChangeTheme('dark')}
                className={`min-h-[44px] py-2 px-2 rounded-lg text-xs font-medium transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                  panelTheme === 'dark'
                    ? 'bg-[var(--color-superficie)] text-[var(--color-texto)] shadow-xs font-semibold border border-[var(--color-borde)]'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Moon className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                <span className="text-[11px]">Oscuro</span>
              </button>
            </div>
          </div>

          {/* 5. Sesión del Administrador */}
          <div className="bg-[var(--color-superficie)] rounded-2xl border border-[var(--color-borde)] p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-semibold block">Sesión Activa</span>
              <span className="text-[11px] opacity-60 font-mono truncate block max-w-[150px]" title={store.admin_email}>
                {store.admin_email}
              </span>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2 rounded-xl border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
