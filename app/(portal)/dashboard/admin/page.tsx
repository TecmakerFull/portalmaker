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
  Package,
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

  // 3. Obtener todas las tiendas de la plataforma con conteo de productos
  const { data: stores } = await supabase
    .from('stores')
    .select('*, products:products(count)')
    .order('created_at', { ascending: false })

  const rawStores = stores ?? []
  const allStores = rawStores.map((s: any) => ({
    ...s,
    product_count: s.products?.[0]?.count ?? 0,
  }))

  // Métricas avanzadas
  const totalStores = allStores.length
  const activeStores = allStores.filter((s) => s.suscripcion_activa).length
  const testStores = totalStores - activeStores
  const totalProducts = allStores.reduce((acc, s) => acc + (s.product_count || 0), 0)
  const estimatedMRR = allStores
    .filter((s) => s.suscripcion_activa)
    .reduce((acc, s) => acc + (Number(s.precio_mensual) || 0), 0)

  // Cuentas por vencer en los próximos 7 días o en período de gracia
  const atRiskStores = allStores.filter((s) => {
    if (!s.suscripcion_activa || !s.fecha_proximo_vencimiento) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(s.fecha_proximo_vencimiento + 'T00:00:00')
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays <= 7
  }).length

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-portal-body)] pb-16 transition-colors duration-200">
      {/* Header del Superadmin */}
      <header className="bg-[var(--color-superficie)] border-b border-[var(--color-borde)] sticky top-0 z-20 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 space-y-8">
        {/* Título & Acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-[var(--font-portal-heading)]">
              Panel de Plataforma
            </h1>
            <p className="text-xs sm:text-sm opacity-70 mt-1">
              Control global de cuentas, clientes makers, fechas de cobro, tolerancia y planes activos.
            </p>
          </div>

          <NuevaTiendaModal />
        </div>

        {/* Tarjetas de Métricas de la Red */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-[var(--color-superficie)] p-4 sm:p-5 rounded-2xl border border-[var(--color-borde)] shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70">
                Tiendas Totales
              </span>
              <Store className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight">{totalStores}</div>
            <p className="text-[11px] opacity-60 mt-0.5">Talleres creados</p>
          </div>

          <div className="bg-[var(--color-superficie)] p-4 sm:p-5 rounded-2xl border border-[var(--color-borde)] shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70">
                Al Día / Activas
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {activeStores}
            </div>
            <p className="text-[11px] opacity-60 mt-0.5">Suscripciones vigentes</p>
          </div>

          <div className="bg-[var(--color-superficie)] p-4 sm:p-5 rounded-2xl border border-[var(--color-borde)] shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70">
                Por Vencer / Gracia
              </span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {atRiskStores}
            </div>
            <p className="text-[11px] opacity-60 mt-0.5">Vencen en ≤ 7 días</p>
          </div>

          <div className="bg-[var(--color-superficie)] p-4 sm:p-5 rounded-2xl border border-[var(--color-borde)] shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70">
                Productos en Red
              </span>
              <Package className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
              {totalProducts}
            </div>
            <p className="text-[11px] opacity-60 mt-0.5">Items en catálogos</p>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-[var(--color-superficie)] p-4 sm:p-5 rounded-2xl border border-[var(--color-borde)] shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70">
                Ingresos Estimados
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">$</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#CA8A04] dark:text-[#FACC15]">
              ${estimatedMRR.toLocaleString('es-AR')}
            </div>
            <p className="text-[11px] opacity-60 mt-0.5">MRR de tiendas activas</p>
          </div>
        </div>

        {/* Listado y Gestión Avanzada de Cuentas */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">Cuentas y Empresas Clientes</h2>
            <p className="text-xs opacity-70 mt-0.5">
              Relevamiento de planes, control de pagos, días de gracia y acceso administrativo
            </p>
          </div>

          <SuperadminTiendasList initialStores={allStores} />
        </div>
      </main>
    </div>
  )
}
