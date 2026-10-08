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
} from 'lucide-react'

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
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-texto)] font-[var(--font-heading)]">
          Mi Cuenta & Perfil
        </h1>
        <p className="text-xs sm:text-sm opacity-70 mt-1">
          Modifica el nombre de tu página, revisa el estado de tu suscripción y personaliza tu panel.
        </p>
      </div>

      {/* 1. Modificar Nombre de la Tienda y Datos Básicos */}
      <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <StoreIcon className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
            <span>Nombre de tu Página / Tienda</span>
          </h2>
          <p className="text-xs opacity-70 mt-0.5">
            Puedes cambiar el nombre público de tu tienda y tu slogan en cualquier momento.
          </p>
        </div>

        <form onSubmit={handleSaveStoreData} className="space-y-4 pt-1">
          {storeSuccessMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{storeSuccessMsg}</span>
            </div>
          )}

          {storeErrorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{storeErrorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                Nombre de la Tienda *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Aetera, Tecmaker 3D..."
                required
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                Slogan / Frase corta
              </label>
              <input
                type="text"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                placeholder="Ej: Diversión duradera de alta gama."
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingStore}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] font-bold text-xs hover:bg-[#EAB308] active:scale-98 transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {savingStore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Nombre</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Tarjeta de Estado de Cuenta & Suscripción */}
      <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FACC15]/20 text-[#CA8A04] dark:text-[#FACC15] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Estado del Plan</h2>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    store.suscripcion_activa
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {store.suscripcion_activa ? 'Plan Activo' : 'En Pausa'}
                </span>
              </div>
              <p className="text-xs opacity-70 mt-0.5">
                {isTrial ? 'Periodo de prueba gratuito (10 días iniciales)' : 'Suscripción Maker Vitrina'}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs opacity-60 uppercase font-semibold tracking-wider block">
              Días Restantes
            </span>
            <span className="text-2xl font-black text-[#CA8A04] dark:text-[#FACC15]">
              {diasRestantes} {diasRestantes === 1 ? 'día' : 'días'}
            </span>
          </div>
        </div>

        {/* Barra de Progreso del Periodo de Prueba */}
        <div className="space-y-2 pt-2 border-t border-[var(--color-borde)]">
          <div className="flex items-center justify-between text-xs opacity-70">
            <span>Día {diffDays} de uso</span>
            <span>Vence el {vencimiento.toLocaleDateString('es-AR')}</span>
          </div>
          <div className="w-full bg-black/5 dark:bg-white/10 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-[#FACC15] h-full rounded-full transition-all duration-500"
              style={{ width: `${trialProgress}%` }}
            />
          </div>
        </div>

        {/* Métricas rápidas de la cuenta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-[var(--color-fondo)]/40 border border-[var(--color-borde)]">
            <div className="flex items-center gap-2 text-xs opacity-60 mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Fecha de alta</span>
            </div>
            <span className="text-sm font-bold block">
              {createdDate.toLocaleDateString('es-AR')}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--color-fondo)]/40 border border-[var(--color-borde)]">
            <div className="flex items-center gap-2 text-xs opacity-60 mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Tiempo activo</span>
            </div>
            <span className="text-sm font-bold block">
              {diffDays} {diffDays === 1 ? 'día en línea' : 'días en línea'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--color-fondo)]/40 border border-[var(--color-borde)]">
            <div className="flex items-center gap-2 text-xs opacity-60 mb-1">
              <Globe className="w-3.5 h-3.5" />
              <span>Dirección web</span>
            </div>
            <span className="text-sm font-bold truncate block">
              {store.slug}.portalmaker.ar
            </span>
          </div>
        </div>
      </div>

      {/* 3. Preferencia de Visualización del Menú / Panel Admin */}
      <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <Sun className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
            <span>Visualización de tu Panel de Control</span>
          </h2>
          <p className="text-xs opacity-70 mt-0.5">
            Selecciona el tema de tu panel de administración. Por defecto toma la preferencia de tu sistema operativo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Opción Automático / Sistema (Por Defecto) */}
          <button
            type="button"
            onClick={() => handleChangeTheme('sistema')}
            className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
              panelTheme === 'sistema'
                ? 'border-[#FACC15] ring-2 ring-[#FACC15]/40 bg-[#FACC15]/10 shadow-xs'
                : 'border-[var(--color-borde)] hover:border-[var(--color-texto-muted)] bg-[var(--color-fondo)]/40'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Laptop className="w-5 h-5" />
              </div>
              {panelTheme === 'sistema' && (
                <CheckCircle2 className="w-5 h-5 text-[#CA8A04] dark:text-[#FACC15]" />
              )}
            </div>
            <div>
              <span className="font-bold text-sm block">Según el Sistema</span>
              <span className="text-xs opacity-60">Se adapta a tu dispositivo (Por defecto)</span>
            </div>
          </button>

          {/* Opción Claro */}
          <button
            type="button"
            onClick={() => handleChangeTheme('light')}
            className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
              panelTheme === 'light'
                ? 'border-[#FACC15] ring-2 ring-[#FACC15]/40 bg-[#FACC15]/10 shadow-xs'
                : 'border-[var(--color-borde)] hover:border-[var(--color-texto-muted)] bg-[var(--color-fondo)]/40'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Sun className="w-5 h-5" />
              </div>
              {panelTheme === 'light' && (
                <CheckCircle2 className="w-5 h-5 text-[#CA8A04] dark:text-[#FACC15]" />
              )}
            </div>
            <div>
              <span className="font-bold text-sm block">Modo Claro</span>
              <span className="text-xs opacity-60">Fondo blanco luminoso</span>
            </div>
          </button>

          {/* Opción Oscuro */}
          <button
            type="button"
            onClick={() => handleChangeTheme('dark')}
            className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
              panelTheme === 'dark'
                ? 'border-[#FACC15] ring-2 ring-[#FACC15]/40 bg-[#FACC15]/10 shadow-xs'
                : 'border-[var(--color-borde)] hover:border-[var(--color-texto-muted)] bg-[var(--color-fondo)]/40'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-100 flex items-center justify-center">
                <Moon className="w-5 h-5" />
              </div>
              {panelTheme === 'dark' && (
                <CheckCircle2 className="w-5 h-5 text-[#CA8A04] dark:text-[#FACC15]" />
              )}
            </div>
            <div>
              <span className="font-bold text-sm block">Modo Oscuro</span>
              <span className="text-xs opacity-60">Fondo carbón de alto contraste</span>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Datos de Administrador & Dominio */}
      <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <User className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
          <span>Datos del Administrador</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[var(--color-fondo)]/40 border border-[var(--color-borde)]">
            <span className="text-xs font-semibold opacity-60 block mb-1">
              Email de Google OAuth
            </span>
            <span className="text-sm font-mono font-bold">{store.admin_email}</span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--color-fondo)]/40 border border-[var(--color-borde)] flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold opacity-60 block mb-1">
                Dominio Propio
              </span>
              <span className="text-sm font-bold">
                {store.custom_domain || 'Sin dominio configurado'}
              </span>
            </div>
            <Link
              href={`/tienda/admin/dominio${tenantQuery}`}
              className="px-3 py-1.5 rounded-xl border border-[var(--color-borde)] hover:border-[#FACC15] text-xs font-bold hover:bg-[#FACC15]/10 text-[#CA8A04] dark:text-[#FACC15] transition-all"
            >
              Configurar
            </Link>
          </div>
        </div>

        {/* Botón de Cerrar Sesión */}
        <div className="pt-3 flex justify-end">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2.5 rounded-xl border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
