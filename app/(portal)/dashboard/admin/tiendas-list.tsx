// =============================================================================
// PORTALMAKER — Gestión Integral de Cuentas, Tiendas y Suscripciones (Superadmin)
// Vista en lista compacta con buscador y filtros + Ficha Integral de Detalle
// con control de pagos, vencimientos, días de gracia, límites y métricas.
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { SubscriptionPayment } from '@/types/database'
import SuperadminTiendaDetailFullpage from './tienda-detail-fullpage'
import {
  Store,
  ExternalLink,
  Package,
  CheckCircle2,
  XCircle,
  Power,
  Loader2,
  Calendar,
  Clock,
  Search,
  Filter,
  X,
  Edit,
  Phone,
  Mail,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  Layers,
  FileText,
  Save,
  Plus,
  ArrowRight,
  TrendingUp,
  Copy,
  Check,
  Users,
  MessageSquare,
  DollarSign,
  Eye,
  LayoutList,
  LayoutGrid,
  ChevronRight,
  RefreshCw,
  Sliders,
} from 'lucide-react'
import WhatsAppIcon from '@/app/tienda/sections/whatsapp-icon'

export type SuperadminStoreItem = {
  id: string
  nombre: string
  slug: string
  custom_domain: string | null
  admin_email: string
  whatsapp_numero: string | null
  slogan: string | null
  logo_url: string | null
  modo_operacion?: string | null
  checkout_activo?: boolean | null
  envios_activo?: boolean | null
  plan?: string | null
  precio_mensual?: number | null
  comision_portalmaker?: number | null
  mp_connected?: boolean | null
  estado_pago?: string | null
  notas_admin?: string | null
  limite_productos?: number | null
  features_override?: Record<string, any> | null
  transferencia_activa?: boolean | null
  banners_activo?: boolean | null
  suscripcion_activa: boolean
  fecha_inicio_suscripcion: string | null
  fecha_proximo_vencimiento: string | null
  dias_gracia: number | null
  created_at: string
  product_count?: number
}

interface StoreLiveMetrics {
  totalOrders: number
  totalSales: number
  totalCustomers: number
  totalCollaborators: number
  totalReviews: number
}

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  starter: {
    label: 'Starter',
    color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50',
  },
  maker_pro: {
    label: 'Maker Pro',
    color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50',
  },
  enterprise: {
    label: 'Enterprise',
    color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50',
  },
  bonificado: {
    label: 'Bonificado',
    color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50',
  },
}

const ESTADO_PAGO_LABELS: Record<string, { label: string; color: string }> = {
  al_dia: {
    label: 'Al Día',
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50',
  },
  pendiente: {
    label: 'Pendiente',
    color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50',
  },
  bonificado: {
    label: 'Bonificado',
    color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50',
  },
  gracia: {
    label: 'En Gracia',
    color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/50',
  },
  vencido: {
    label: 'Vencido',
    color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50',
  },
}

export default function SuperadminTiendasList({ initialStores }: { initialStores: SuperadminStoreItem[] }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [stores, setStores] = useState<SuperadminStoreItem[]>(initialStores)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'activa' | 'por_vencer' | 'en_gracia' | 'vencida' | 'pausada'>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'lista' | 'tarjetas'>('lista')

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Tienda seleccionada para gestionar en Página Completa
  const [selectedStore, setSelectedStore] = useState<SuperadminStoreItem | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Abrir la página completa de la tienda y sincronizar URL
  const handleSelectStore = (store: SuperadminStoreItem) => {
    setSelectedStore(store)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('tienda', store.slug)
      window.history.pushState({ storeId: store.id }, '', url.toString())
    }
  }

  // Volver a la lista de tiendas y limpiar URL
  const handleBackToList = () => {
    setSelectedStore(null)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('tienda')
      window.history.pushState({}, '', url.toString())
    }
  }

  // Sincronizar actualización de la tienda desde el componente de página completa
  const handleStoreUpdated = (updatedStore: SuperadminStoreItem) => {
    setStores((prev) => prev.map((s) => (s.id === updatedStore.id ? updatedStore : s)))
    setSelectedStore(updatedStore)
  }

  // Sincronizar selección inicial desde la URL (?tienda=slug) y botón atrás del navegador
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const tiendaParam = params.get('tienda')
    if (tiendaParam) {
      const match = stores.find((s) => s.slug === tiendaParam || s.id === tiendaParam)
      if (match) {
        setSelectedStore(match)
      }
    }

    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search)
      const t = p.get('tienda')
      if (t) {
        const match = stores.find((s) => s.slug === t || s.id === t)
        setSelectedStore(match || null)
      } else {
        setSelectedStore(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [stores])

  // Formato de moneda ARS
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Helper de cálculo de estado de suscripción
  const getSubscriptionInfo = (store: SuperadminStoreItem) => {
    const isPausada = !store.suscripcion_activa
    const diasGracia = store.dias_gracia ?? 3

    let daysRemaining: number | null = null
    let status: 'activa' | 'por_vencer' | 'en_gracia' | 'vencida' | 'pausada' = 'activa'
    let statusLabel = 'Al Día'
    let badgeColor = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'

    if (isPausada) {
      status = 'pausada'
      statusLabel = 'Pausada'
      badgeColor = 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
    } else if (store.fecha_proximo_vencimiento) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dueDate = new Date(store.fecha_proximo_vencimiento + 'T00:00:00')
      const diffTime = dueDate.getTime() - today.getTime()
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (daysRemaining > 7) {
        status = 'activa'
        statusLabel = `Al día (${daysRemaining}d)`
        badgeColor = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      } else if (daysRemaining >= 0) {
        status = 'por_vencer'
        statusLabel = `Vence en ${daysRemaining === 0 ? 'hoy' : `${daysRemaining}d`}`
        badgeColor = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      } else {
        const daysOverdue = Math.abs(daysRemaining)
        if (daysOverdue <= diasGracia) {
          status = 'en_gracia'
          statusLabel = `En gracia (${diasGracia - daysOverdue}d extra)`
          badgeColor = 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
        } else {
          status = 'vencida'
          statusLabel = `Vencida (${daysOverdue}d)`
          badgeColor = 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
        }
      }
    }

    // Antigüedad
    const startDateStr = store.fecha_inicio_suscripcion || store.created_at
    let timeElapsed = 'Reciente'
    if (startDateStr) {
      const startDate = new Date(startDateStr)
      const now = new Date()
      const diffMonths = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth())
      const diffDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

      if (diffMonths >= 12) {
        const years = Math.floor(diffMonths / 12)
        const remainingMonths = diffMonths % 12
        timeElapsed = `${years}a${remainingMonths > 0 ? ` ${remainingMonths}m` : ''}`
      } else if (diffMonths >= 1) {
        timeElapsed = `${diffMonths} mes${diffMonths > 1 ? 'es' : ''}`
      } else {
        timeElapsed = `${Math.max(diffDays, 1)} día${diffDays !== 1 ? 's' : ''}`
      }
    }

    return {
      status,
      statusLabel,
      badgeColor,
      daysRemaining,
      timeElapsed,
    }
  }

  // Alternar estado activo / pausado
  const toggleSuscripcion = async (storeId: string, currentState: boolean) => {
    setLoadingId(storeId)
    try {
      const nextState = !currentState
      const { error } = await supabase
        .from('stores')
        .update({ suscripcion_activa: nextState })
        .eq('id', storeId)

      if (error) throw error

      setStores((prev) =>
        prev.map((s) => (s.id === storeId ? { ...s, suscripcion_activa: nextState } : s))
      )
      if (selectedStore?.id === storeId) {
        setSelectedStore((prev) => (prev ? { ...prev, suscripcion_activa: nextState } : null))
      }
      showToast(nextState ? 'Tienda activada exitosamente' : 'Tienda pausada')
    } catch (err: any) {
      alert('Error al actualizar la suscripción: ' + err.message)
    } finally {
      setLoadingId(null)
    }
  }

  // Copiar subdominio
  const handleCopyLink = (slug: string) => {
    const url = `https://${slug}.portalmaker.ar`
    navigator.clipboard.writeText(url)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 2000)
  }

  // Filtrado de tiendas
  const filteredStores = stores.filter((store) => {
    const q = searchTerm.toLowerCase().trim()
    const matchesSearch =
      !q ||
      store.nombre.toLowerCase().includes(q) ||
      store.slug.toLowerCase().includes(q) ||
      store.admin_email.toLowerCase().includes(q) ||
      (store.whatsapp_numero && store.whatsapp_numero.includes(q)) ||
      (store.notas_admin && store.notas_admin.toLowerCase().includes(q))

    const subInfo = getSubscriptionInfo(store)
    const matchesStatus =
      statusFilter === 'all' ? true : subInfo.status === statusFilter

    const matchesPlan =
      planFilter === 'all' ? true : (store.plan || 'maker_pro') === planFilter

    return matchesSearch && matchesStatus && matchesPlan
  })

  return (
    <div className="space-y-6">
      {/* Toast flotante */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-xl border border-white/10 dark:border-black/10 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Barra de Filtros, Búsqueda y Switch de Vista */}
      <div className="bg-[var(--color-superficie)] p-4 rounded-2xl border border-[var(--color-borde)] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, subdominio, email del maker o notas..."
              className="w-full min-h-[42px] pl-10 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro por Estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-[#FF5500] focus:ring-1 focus:ring-[#FF5500] cursor-pointer"
            >
              <option value="all">Todos los estados ({stores.length})</option>
              <option value="activa">Al día / Activas</option>
              <option value="por_vencer">Por vencer (≤7 días)</option>
              <option value="en_gracia">En período de gracia</option>
              <option value="vencida">Vencidas / En mora</option>
              <option value="pausada">Pausadas</option>
            </select>

            {/* Filtro por Plan */}
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-[#FF5500] focus:ring-1 focus:ring-[#FF5500] cursor-pointer"
            >
              <option value="all">Todos los planes</option>
              <option value="maker_pro">Maker Pro</option>
              <option value="starter">Starter</option>
              <option value="enterprise">Enterprise</option>
              <option value="bonificado">Bonificado / Beta</option>
            </select>

            {/* Selector de Modo de Vista */}
            <div className="flex items-center p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--color-borde)]">
              <button
                type="button"
                onClick={() => setViewMode('lista')}
                title="Vista en Lista compacta"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'lista'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'opacity-50 hover:opacity-100'
                  }`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('tarjetas')}
                title="Vista en Tarjetas"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'tarjetas'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'opacity-50 hover:opacity-100'
                  }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Renderizado de Tiendas */}
      {filteredStores.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[var(--color-borde)] rounded-2xl p-6 bg-[var(--color-superficie)]">
          <Store className="w-10 h-10 mx-auto opacity-30 mb-3" />
          <h3 className="text-base font-semibold">No se encontraron tiendas</h3>
          <p className="text-xs opacity-70 mt-1">
            Prueba ajustando los términos de búsqueda o los filtros seleccionados.
          </p>
        </div>
      ) : viewMode === 'lista' ? (
        /* VISTA 1: TABLA / LISTA COMPACTA DE TIENDAS */
        <div className="bg-[var(--color-superficie)] rounded-2xl border border-[var(--color-borde)] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] text-[11px] font-semibold opacity-70 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Tienda</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Maker / Contacto</th>
                  <th className="py-3.5 px-4">Plan & Precio</th>
                  <th className="py-3.5 px-4">Estado & Vencimiento</th>
                  <th className="py-3.5 px-4 hidden lg:table-cell">Catálogo / Cupo</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-borde)]">
                {filteredStores.map((store) => {
                  const subInfo = getSubscriptionInfo(store)
                  const cleanPhone = store.whatsapp_numero ? store.whatsapp_numero.replace(/[^0-9]/g, '') : null
                  const planMeta = PLAN_LABELS[store.plan || 'maker_pro'] || {
                    label: store.plan || 'Maker Pro',
                    color: 'bg-slate-100 text-slate-700',
                  }
                  const usagePercent = Math.min(
                    Math.round(((store.product_count || 0) / (store.limite_productos || 50)) * 100),
                    100
                  )

                  return (
                    <tr
                      key={store.id}
                      onClick={() => handleSelectStore(store)}
                      className="hover:bg-[#FF5500]/[0.04] transition-colors cursor-pointer group"
                    >
                      {/* Tienda: Logo + Nombre + Subdominio */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden border border-[var(--color-borde)] bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-2xs">
                            {store.logo_url ? (
                              <img src={store.logo_url} alt="" className="w-full h-full object-contain p-0.5" />
                            ) : (
                              <span className="font-bold text-sm text-[#FF5500]">
                                {store.nombre.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 block truncate group-hover:text-[#FF5500] transition-colors">
                              {store.nombre}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 group-hover:text-[#FF5500] transition-colors truncate">
                                {store.slug}.portalmaker.ar
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCopyLink(store.slug)
                                }}
                                title="Copiar URL"
                                className="opacity-40 hover:opacity-100 p-0.5 cursor-pointer"
                              >
                                {copiedSlug === store.slug ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>

                            {/* D3d: Alerta para superadmin si MP está conectado pero la comisión es 0% */}
                            {store.mp_connected && Number(store.comision_portalmaker || 0) === 0 && (
                              <div className="mt-1">
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                  title="Mercado Pago activo sin comisión configurada (0%)"
                                >
                                  <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                  MP Conectado (0% comisión)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Maker / Contacto */}
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <div className="space-y-0.5">
                          <a
                            href={`mailto:${store.admin_email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] opacity-80 hover:opacity-100 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                          >
                            <Mail className="w-3 h-3 opacity-50 shrink-0" />
                            <span>{store.admin_email}</span>
                          </a>
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                            >
                              <WhatsAppIcon className="w-3 h-3 shrink-0" />
                              <span>{store.whatsapp_numero}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Plan & Precio */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${planMeta.color}`}>
                            {planMeta.label}
                          </span>
                          <span className="text-[11px] font-semibold opacity-75 block">
                            {formatMoney(Number(store.precio_mensual) || 0)} / mes
                          </span>
                        </div>
                      </td>

                      {/* Estado & Vencimiento */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${subInfo.badgeColor}`}>
                            {subInfo.statusLabel}
                          </span>
                          <div className="text-[11px] opacity-70 flex items-center gap-1">
                            <Clock className="w-3 h-3 opacity-50 shrink-0" />
                            <span>{store.fecha_proximo_vencimiento || 'Sin fecha'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Cupo de Productos */}
                      <td className="py-3.5 px-4 hidden lg:table-cell">
                        <div className="space-y-1 w-32">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold">{store.product_count || 0} / {store.limite_productos || 50}</span>
                            <span className="opacity-60">{usagePercent}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${usagePercent >= 100
                                  ? 'bg-red-500'
                                  : usagePercent >= 80
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Acciones Rápidas */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {/* Configurar Tienda en Página Completa */}
                          <button
                            type="button"
                            onClick={() => handleSelectStore(store)}
                            title="Configurar Tienda en Página Completa"
                            className="min-h-[34px] px-2.5 py-1 rounded-xl bg-[#FF5500]/15 hover:bg-[#FF5500]/25 text-[#FF5500] font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5 text-[#FF5500]" />
                            <span className="hidden sm:inline">Configurar</span>
                          </button>

                          {/* Admin de Tienda */}
                          <Link
                            href={`/tienda/admin/productos?tenant=${store.slug}`}
                            title="Ingresar al Panel de Tienda"
                            className="min-h-[34px] p-2 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100 flex items-center justify-center transition-all"
                          >
                            <Package className="w-3.5 h-3.5 text-[#FF5500]" />
                          </Link>

                          {/* Visitar Tienda */}
                          <a
                            href={
                              store.custom_domain && store.custom_domain_verified
                                ? `https://${store.custom_domain}`
                                : `https://${store.slug}.portalmaker.ar`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Visitar Tienda Pública"
                            className="min-h-[34px] p-2 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100 flex items-center justify-center transition-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          {/* Pausar / Activar */}
                          <button
                            type="button"
                            disabled={loadingId === store.id}
                            onClick={() => toggleSuscripcion(store.id, store.suscripcion_activa)}
                            title={store.suscripcion_activa ? 'Pausar tienda' : 'Activar tienda'}
                            className={`min-h-[34px] p-2 rounded-xl border transition-all cursor-pointer ${store.suscripcion_activa
                                ? 'border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                                : 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                              }`}
                          >
                            {loadingId === store.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Power className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISTA 2: TARJETAS EXPANDIDAS */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStores.map((store) => {
            const subInfo = getSubscriptionInfo(store)
            const cleanPhone = store.whatsapp_numero ? store.whatsapp_numero.replace(/[^0-9]/g, '') : null
            const planMeta = PLAN_LABELS[store.plan || 'maker_pro'] || {
              label: store.plan || 'Maker Pro',
              color: 'bg-slate-100 text-slate-700',
            }

            return (
              <div
                key={store.id}
                onClick={() => handleSelectStore(store)}
                className="p-5 rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] hover:border-[#FF5500]/50 transition-all space-y-4 shadow-2xs cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border border-[var(--color-borde)] bg-white dark:bg-slate-900 flex items-center justify-center shrink-0">
                      {store.logo_url ? (
                        <img src={store.logo_url} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="font-bold text-base text-[#FF5500]">
                          {store.nombre.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-base group-hover:text-[#FF5500] transition-colors">
                        {store.nombre}
                      </h3>
                      <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 group-hover:text-[#FF5500]">
                        {store.slug}.portalmaker.ar
                      </p>
                      {/* D3d: Alerta para superadmin si MP está conectado con 0% de comisión */}
                      {store.mp_connected && Number(store.comision_portalmaker || 0) === 0 && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 mt-1"
                          title="Mercado Pago activo sin comisión configurada (0%)"
                        >
                          <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                          MP Conectado (0% comisión)
                        </span>
                      )}
                    </div>
                  </div>

                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${subInfo.badgeColor}`}>
                    {subInfo.statusLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[var(--color-borde)] opacity-80">
                  <div>
                    <span className="opacity-60 block text-[10px]">Plan:</span>
                    <span className="font-semibold">{planMeta.label} ({formatMoney(Number(store.precio_mensual) || 0)})</span>
                  </div>
                  <div>
                    <span className="opacity-60 block text-[10px]">Vencimiento:</span>
                    <span className="font-semibold">{store.fecha_proximo_vencimiento || 'Sin fecha'}</span>
                  </div>
                  <div>
                    <span className="opacity-60 block text-[10px]">Maker:</span>
                    <span className="truncate block">{store.admin_email}</span>
                  </div>
                  <div>
                    <span className="opacity-60 block text-[10px]">Catálogo:</span>
                    <span className="font-semibold">{store.product_count || 0} / {store.limite_productos || 50} piezas</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-borde)]" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleSelectStore(store)}
                    className="text-xs font-semibold text-[#FF5500] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Configurar Tienda</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#FF5500]" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/tienda/admin/productos?tenant=${store.slug}`}
                      className="min-h-[34px] px-2.5 py-1 rounded-xl border border-[var(--color-borde)] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1"
                    >
                      <Package className="w-3.5 h-3.5 text-[#FF5500]" />
                      <span>Admin</span>
                    </Link>
                    <a
                      href={
                        store.custom_domain && store.custom_domain_verified
                          ? `https://${store.custom_domain}`
                          : `https://${store.slug}.portalmaker.ar`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[34px] px-2.5 py-1 rounded-xl border border-[var(--color-borde)] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Visitar</span>
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* =========================================================================
          GESTIÓN INTEGRAL DE TIENDA (PÁGINA COMPLETA CON PESTAÑAS)
          ========================================================================= */}
      {selectedStore && (
        <SuperadminTiendaDetailFullpage
          store={selectedStore}
          totalStoresCount={stores.length}
          onBack={handleBackToList}
          onStoreUpdated={handleStoreUpdated}
          onToggleSubscription={toggleSuscripcion}
          loadingId={loadingId}
          showToast={showToast}
        />
      )}
    </div>
  )
}
