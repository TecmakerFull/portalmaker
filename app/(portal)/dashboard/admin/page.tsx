// =============================================================================
// PORTALMAKER — Panel de Superadmin / Plataforma (Paleta 06: Yellow & Gray)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ThemeToggle from '@/app/tienda/theme-toggle'
import {
  ShieldCheck,
  Store,
  CheckCircle2,
  Clock,
  LogOut,
} from 'lucide-react'
import SuperadminTiendasList from './tiendas-list'
import NuevaTiendaModal from './nueva-tienda-modal'

export default async function SuperadminDashboardPage() {
  const supabase = await createSupabaseServerClient()

  // 1. Obtener usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/login')
  }

  // 2. Verificar si es platform_admin
  const { data: platformAdmin } = await supabase
    .from('platform_admins')
    .select('id')
    .eq('email', user.email)
    .single()

  // Si no está registrado en platform_admins, verificar si es el dueño
  const isSuperadmin = Boolean(platformAdmin) || user.email === 'temperini@gmail.com'

  if (!isSuperadmin) {
    redirect('/dashboard/maker')
  }

  // 3. Obtener todas las tiendas de la plataforma
  const { data: stores } = await supabase
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false })

  const allStores = stores ?? []

  // Métricas
  const totalStores = allStores.length
  const activeStores = allStores.filter((s) => s.suscripcion_activa).length
  const testStores = totalStores - activeStores

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-portal-body)] pb-16 transition-colors duration-200">
      {/* Header del Superadmin */}
      <header className="bg-[var(--color-superficie)] border-b border-[var(--color-borde)] sticky top-0 z-20 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt="Portalmaker"
                width={34}
                height={34}
                className="w-8 h-8 rounded-xl object-contain shadow-2xs"
              />
              <span className="text-xl font-bold tracking-tight font-[var(--font-portal-heading)]">
                Portalmaker
              </span>
            </Link>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FACC15]/20 border border-[#FACC15]/50 text-amber-900 dark:text-amber-200">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Superadmin</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Acceso a panel de Maker personal */}
            <Link
              href="/dashboard/maker"
              className="text-xs sm:text-sm font-semibold px-3 py-2 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors hidden sm:inline-flex items-center gap-1.5"
            >
              <Store className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Mi Taller Maker</span>
            </Link>

            <ThemeToggle />

            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="min-h-[40px] px-3 py-2 text-xs sm:text-sm font-medium opacity-80 hover:opacity-100 flex items-center gap-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10">
        {/* Título & Acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-[var(--font-portal-heading)]">
              Panel de Plataforma
            </h1>
            <p className="text-sm opacity-70 mt-1">
              Control global de empresas, makers registrados y estado de suscripciones.
            </p>
          </div>

          <NuevaTiendaModal />
        </div>

        {/* Tarjetas de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-[var(--color-superficie)] p-5 rounded-2xl border border-[var(--color-borde)] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
                Tiendas Totales
              </span>
              <Store className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
            </div>
            <div className="text-3xl font-bold tracking-tight">{totalStores}</div>
            <p className="text-xs opacity-60 mt-1">Talleres makers creados</p>
          </div>

          <div className="bg-[var(--color-superficie)] p-5 rounded-2xl border border-[var(--color-borde)] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
                Suscripciones Activas
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {activeStores}
            </div>
            <p className="text-xs opacity-60 mt-1">Al día en la plataforma</p>
          </div>

          <div className="bg-[var(--color-superficie)] p-5 rounded-2xl border border-[var(--color-borde)] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
                En Prueba / Pendientes
              </span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {testStores}
            </div>
            <p className="text-xs opacity-60 mt-1">Requieren activación o pago</p>
          </div>
        </div>

        {/* Listado y Gestión de Tiendas */}
        <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold">Empresas y Talleres Makers</h2>
              <p className="text-xs opacity-70 mt-0.5">
                Gestiona el estado, subdominio y acceso a cada tienda
              </p>
            </div>
          </div>

          <SuperadminTiendasList initialStores={allStores} />
        </div>
      </main>
    </div>
  )
}
