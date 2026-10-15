// =============================================================================
// PORTALMAKER — Gestión Integral de Cuentas, Tiendas y Suscripciones (Superadmin)
// Vista en lista compacta con buscador y filtros + Ficha Integral de Detalle
// con control de pagos, vencimientos, días de gracia, límites y métricas.
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { SubscriptionPayment } from '@/types/database'
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
  plan?: string | null
  precio_mensual?: number | null
  estado_pago?: string | null
  notas_admin?: string | null
  limite_productos?: number | null
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

  // Tienda seleccionada para la Ficha Integral (Drawer lateral)
  const [selectedStore, setSelectedStore] = useState<SuperadminStoreItem | null>(null)
  const [activeDrawerTab, setActiveDrawerTab] = useState<'pagos' | 'suscripcion' | 'metricas' | 'contacto' | 'notas'>('pagos')

  // Datos en vivo de la tienda seleccionada
  const [storePayments, setStorePayments] = useState<SubscriptionPayment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [storeMetrics, setStoreMetrics] = useState<StoreLiveMetrics | null>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(false)

  // Estado del formulario para registrar nuevo pago
  const [showNewPaymentForm, setShowNewPaymentForm] = useState(false)
  const [paymentMonto, setPaymentMonto] = useState<number>(0)
  const [paymentMetodo, setPaymentMetodo] = useState<string>('transferencia')
  const [paymentFecha, setPaymentFecha] = useState<string>(new Date().toISOString().split('T')[0])
  const [paymentPeriodoDesde, setPaymentPeriodoDesde] = useState<string>(new Date().toISOString().split('T')[0])
  const [paymentPeriodoHasta, setPaymentPeriodoHasta] = useState<string>('')
  const [paymentNotas, setPaymentNotas] = useState<string>('')
  const [savingPayment, setSavingPayment] = useState(false)

  // Estado de edición rápida de suscripción
  const [subEditForm, setSubEditForm] = useState<Partial<SuperadminStoreItem>>({})
  const [savingSubEdit, setSavingSubEdit] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

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

  // Cargar pagos y métricas en vivo cuando se abre la Ficha Integral
  useEffect(() => {
    if (!selectedStore) {
      setStorePayments([])
      setStoreMetrics(null)
      setShowNewPaymentForm(false)
      return
    }

    // Inicializar formulario de edición de suscripción
    setSubEditForm({
      plan: selectedStore.plan || 'maker_pro',
      precio_mensual: selectedStore.precio_mensual ?? 0,
      limite_productos: selectedStore.limite_productos ?? 50,
      estado_pago: selectedStore.estado_pago || 'al_dia',
      fecha_proximo_vencimiento: selectedStore.fecha_proximo_vencimiento || '',
      dias_gracia: selectedStore.dias_gracia ?? 3,
      modo_operacion: selectedStore.modo_operacion || 'vitrina',
      checkout_activo: Boolean(selectedStore.checkout_activo),
      suscripcion_activa: selectedStore.suscripcion_activa,
      notas_admin: selectedStore.notas_admin || '',
    })

    // Prellenar fecha de nuevo pago (+30 días por defecto)
    const baseDue = selectedStore.fecha_proximo_vencimiento
      ? new Date(selectedStore.fecha_proximo_vencimiento + 'T00:00:00')
      : new Date()
    const nextDue = new Date(baseDue.getTime() + 30 * 24 * 60 * 60 * 1000)
    setPaymentPeriodoDesde(selectedStore.fecha_proximo_vencimiento || new Date().toISOString().split('T')[0])
    setPaymentPeriodoHasta(nextDue.toISOString().split('T')[0])
    setPaymentMonto(Number(selectedStore.precio_mensual) || 0)

    // 1. Cargar pagos registrados
    const loadPayments = async () => {
      setLoadingPayments(true)
      try {
        const { data, error } = await supabase
          .from('subscription_payments')
          .select('*')
          .eq('store_id', selectedStore.id)
          .order('fecha_pago', { ascending: false })

        if (error) throw error
        setStorePayments((data as SubscriptionPayment[]) || [])
      } catch (e) {
        console.error('Error cargando pagos de suscripción:', e)
      } finally {
        setLoadingPayments(false)
      }
    }

    // 2. Cargar métricas en vivo
    const loadMetrics = async () => {
      setLoadingMetrics(true)
      try {
        // Pedidos
        const { data: ords } = await supabase
          .from('orders')
          .select('id, total')
          .eq('store_id', selectedStore.id)

        const totalOrders = ords?.length ?? 0
        const totalSales = ords?.reduce((acc, o) => acc + (Number(o.total) || 0), 0) ?? 0

        // Clientes
        const { count: customersCount } = await supabase
          .from('store_customers')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', selectedStore.id)

        // Colaboradores
        const { count: collabCount } = await supabase
          .from('store_collaborators')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', selectedStore.id)

        // Reseñas
        const { count: reviewsCount } = await supabase
          .from('product_reviews')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', selectedStore.id)

        setStoreMetrics({
          totalOrders,
          totalSales,
          totalCustomers: customersCount ?? 0,
          totalCollaborators: collabCount ?? 0,
          totalReviews: reviewsCount ?? 0,
        })
      } catch (e) {
        console.error('Error cargando métricas de tienda:', e)
      } finally {
        setLoadingMetrics(false)
      }
    }

    loadPayments()
    loadMetrics()
  }, [selectedStore?.id])

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

  // Extender vencimiento con meses calculados
  const extendDueDate = async (store: SuperadminStoreItem, daysToAdd: number, label: string) => {
    setLoadingId(store.id)
    try {
      const currentDueDate = store.fecha_proximo_vencimiento
        ? new Date(store.fecha_proximo_vencimiento + 'T00:00:00')
        : new Date()

      const baseDate = currentDueDate < new Date() ? new Date() : currentDueDate
      const newDueDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
      const newDueDateStr = newDueDate.toISOString().split('T')[0]

      const { error } = await supabase
        .from('stores')
        .update({
          fecha_proximo_vencimiento: newDueDateStr,
          suscripcion_activa: true,
          estado_pago: 'al_dia',
        })
        .eq('id', store.id)

      if (error) throw error

      const updated = {
        fecha_proximo_vencimiento: newDueDateStr,
        suscripcion_activa: true,
        estado_pago: 'al_dia',
      }

      setStores((prev) =>
        prev.map((s) => (s.id === store.id ? { ...s, ...updated } : s))
      )
      if (selectedStore?.id === store.id) {
        setSelectedStore((prev) => (prev ? { ...prev, ...updated } : null))
        setSubEditForm((prev) => ({ ...prev, ...updated }))
      }

      showToast(`Vencimiento extendido ${label} (hasta ${newDueDateStr})`)
    } catch (err: any) {
      alert('Error al extender vencimiento: ' + err.message)
    } finally {
      setLoadingId(null)
    }
  }

  // Registrar un nuevo pago de suscripción
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStore) return
    setSavingPayment(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const paymentPayload = {
        store_id: selectedStore.id,
        monto: Number(paymentMonto) || 0,
        metodo_pago: paymentMetodo,
        periodo_desde: paymentPeriodoDesde,
        periodo_hasta: paymentPeriodoHasta,
        fecha_pago: paymentFecha,
        registrado_por: user?.email || 'superadmin',
        notas: paymentNotas.trim() || null,
      }

      const { data: insertedPayment, error: insertError } = await supabase
        .from('subscription_payments')
        .insert(paymentPayload)
        .select()
        .single()

      if (insertError) throw insertError

      // Actualizar también la tienda explícitamente por si el trigger de Supabase no estuviese activo
      await supabase
        .from('stores')
        .update({
          fecha_proximo_vencimiento: paymentPeriodoHasta,
          suscripcion_activa: true,
          estado_pago: 'al_dia',
        })
        .eq('id', selectedStore.id)

      // Actualizar estado local
      const updatedStore = {
        ...selectedStore,
        fecha_proximo_vencimiento: paymentPeriodoHasta,
        suscripcion_activa: true,
        estado_pago: 'al_dia',
      }

      setStores((prev) => prev.map((s) => (s.id === selectedStore.id ? updatedStore : s)))
      setSelectedStore(updatedStore)
      setStorePayments((prev) => [insertedPayment as SubscriptionPayment, ...prev])
      setShowNewPaymentForm(false)
      setPaymentNotas('')
      showToast('Pago registrado correctamente. Vencimiento actualizado.')
    } catch (err: any) {
      alert('Error al registrar pago: ' + err.message)
    } finally {
      setSavingPayment(false)
    }
  }

  // Guardar cambios en Suscripción y Límites
  const handleSaveSubEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStore) return
    setSavingSubEdit(true)

    try {
      const updateData = {
        plan: subEditForm.plan,
        precio_mensual: Number(subEditForm.precio_mensual) || 0,
        limite_productos: Number(subEditForm.limite_productos) || 50,
        estado_pago: subEditForm.estado_pago,
        fecha_proximo_vencimiento: subEditForm.fecha_proximo_vencimiento || null,
        dias_gracia: Number(subEditForm.dias_gracia) || 0,
        modo_operacion: subEditForm.modo_operacion || 'vitrina',
        checkout_activo: Boolean(subEditForm.checkout_activo),
        suscripcion_activa: Boolean(subEditForm.suscripcion_activa),
        notas_admin: subEditForm.notas_admin?.trim() || null,
      }

      const { error } = await supabase
        .from('stores')
        .update(updateData)
        .eq('id', selectedStore.id)

      if (error) throw error

      const updated = { ...selectedStore, ...updateData } as SuperadminStoreItem
      setStores((prev) => prev.map((s) => (s.id === selectedStore.id ? updated : s)))
      setSelectedStore(updated)
      showToast('Datos de la cuenta y suscripción actualizados.')
    } catch (err: any) {
      alert('Error al guardar datos: ' + err.message)
    } finally {
      setSavingSubEdit(false)
    }
  }

  // Guardar notas rápidas de superadmin
  const handleSaveQuickNotes = async () => {
    if (!selectedStore) return
    try {
      const { error } = await supabase
        .from('stores')
        .update({ notas_admin: subEditForm.notas_admin?.trim() || null })
        .eq('id', selectedStore.id)

      if (error) throw error

      setStores((prev) =>
        prev.map((s) =>
          s.id === selectedStore.id ? { ...s, notas_admin: subEditForm.notas_admin?.trim() || null } : s
        )
      )
      showToast('Notas de superadmin guardadas.')
    } catch (err: any) {
      alert('Error al guardar notas: ' + err.message)
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
              className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 cursor-pointer"
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
              className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 cursor-pointer"
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
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'lista'
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
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'tarjetas'
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
                      onClick={() => setSelectedStore(store)}
                      className="hover:bg-amber-500/[0.04] dark:hover:bg-amber-400/[0.05] transition-colors cursor-pointer group"
                    >
                      {/* Tienda: Logo + Nombre + Subdominio */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden border border-[var(--color-borde)] bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-2xs">
                            {store.logo_url ? (
                              <img src={store.logo_url} alt="" className="w-full h-full object-contain p-0.5" />
                            ) : (
                              <span className="font-bold text-sm text-[#CA8A04] dark:text-[#FACC15]">
                                {store.nombre.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 block truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                              {store.nombre}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-[#CA8A04] dark:text-[#FACC15] truncate">
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
                              className={`h-full rounded-full transition-all ${
                                usagePercent >= 100
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
                          {/* Ver Ficha Integral */}
                          <button
                            type="button"
                            onClick={() => setSelectedStore(store)}
                            title="Ver Ficha y Gestión Integral"
                            className="min-h-[34px] px-2.5 py-1 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-[#CA8A04] dark:text-[#FACC15] font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ver Ficha</span>
                          </button>

                          {/* Admin de Tienda */}
                          <Link
                            href={`/tienda/admin/productos?tenant=${store.slug}`}
                            title="Ingresar al Panel de Tienda"
                            className="min-h-[34px] p-2 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100 flex items-center justify-center transition-all"
                          >
                            <Package className="w-3.5 h-3.5 text-[#CA8A04] dark:text-[#FACC15]" />
                          </Link>

                          {/* Visitar Tienda */}
                          <Link
                            href={`/tienda?tenant=${store.slug}`}
                            target="_blank"
                            title="Visitar Tienda Pública"
                            className="min-h-[34px] p-2 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100 flex items-center justify-center transition-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          {/* Pausar / Activar */}
                          <button
                            type="button"
                            disabled={loadingId === store.id}
                            onClick={() => toggleSuscripcion(store.id, store.suscripcion_activa)}
                            title={store.suscripcion_activa ? 'Pausar tienda' : 'Activar tienda'}
                            className={`min-h-[34px] p-2 rounded-xl border transition-all cursor-pointer ${
                              store.suscripcion_activa
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
                onClick={() => setSelectedStore(store)}
                className="p-5 rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] hover:border-amber-400/50 transition-all space-y-4 shadow-2xs cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border border-[var(--color-borde)] bg-white dark:bg-slate-900 flex items-center justify-center shrink-0">
                      {store.logo_url ? (
                        <img src={store.logo_url} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="font-bold text-base text-[#CA8A04] dark:text-[#FACC15]">
                          {store.nombre.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-base group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {store.nombre}
                      </h3>
                      <p className="font-mono text-xs text-[#CA8A04] dark:text-[#FACC15]">
                        {store.slug}.portalmaker.ar
                      </p>
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
                    onClick={() => setSelectedStore(store)}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <span>Ver Ficha Integral</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/tienda/admin/productos?tenant=${store.slug}`}
                      className="min-h-[34px] px-2.5 py-1 rounded-xl border border-[var(--color-borde)] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1"
                    >
                      <Package className="w-3.5 h-3.5 text-[#CA8A04]" />
                      <span>Admin</span>
                    </Link>
                    <Link
                      href={`/tienda?tenant=${store.slug}`}
                      target="_blank"
                      className="min-h-[34px] px-2.5 py-1 rounded-xl border border-[var(--color-borde)] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Visitar</span>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* =========================================================================
          FICHA INTEGRAL DE TIENDA (DRAWER LATERAL EXPANSIVO)
          ========================================================================= */}
      {selectedStore && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-200">
          {/* Fondo semi-transparente */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedStore(null)}
          />

          {/* Panel Lateral Drawer */}
          <div className="relative w-full max-w-2xl bg-[var(--color-superficie)] border-l border-[var(--color-borde)] h-full overflow-y-auto shadow-2xl z-10 flex flex-col justify-between">
            {/* Cabecera del Drawer */}
            <div>
              <div className="p-5 sm:p-6 border-b border-[var(--color-borde)] bg-black/[0.015] dark:bg-white/[0.02]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border border-[var(--color-borde)] bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-xs">
                      {selectedStore.logo_url ? (
                        <img src={selectedStore.logo_url} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="font-bold text-xl text-[#CA8A04] dark:text-[#FACC15]">
                          {selectedStore.nombre.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {selectedStore.nombre}
                        </h2>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getSubscriptionInfo(selectedStore).badgeColor}`}>
                          {getSubscriptionInfo(selectedStore).statusLabel}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-[#CA8A04] dark:text-[#FACC15] mt-0.5">
                        {selectedStore.slug}.portalmaker.ar
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedStore(null)}
                    aria-label="Cerrar ficha"
                    className="p-2 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Accesos Rápidos Principales de la Tienda */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-3 border-t border-[var(--color-borde)]">
                  <Link
                    href={`/tienda/admin/productos?tenant=${selectedStore.slug}`}
                    className="min-h-[40px] px-3 py-2 rounded-xl bg-amber-400/20 text-[#CA8A04] dark:text-[#FACC15] hover:bg-amber-400/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Package className="w-4 h-4" />
                    <span>Panel Tienda</span>
                  </Link>

                  <Link
                    href={`/tienda?tenant=${selectedStore.slug}`}
                    target="_blank"
                    className="min-h-[40px] px-3 py-2 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ExternalLink className="w-4 h-4 opacity-70" />
                    <span>Visitar Web</span>
                  </Link>

                  <button
                    type="button"
                    disabled={loadingId === selectedStore.id}
                    onClick={() => toggleSuscripcion(selectedStore.id, selectedStore.suscripcion_activa)}
                    className={`col-span-2 sm:col-span-1 min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      selectedStore.suscripcion_activa
                        ? 'border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                        : 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                    }`}
                  >
                    {loadingId === selectedStore.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                    <span>{selectedStore.suscripcion_activa ? 'Pausar Tienda' : 'Activar Tienda'}</span>
                  </button>
                </div>
              </div>

              {/* Pestañas del Drawer */}
              <div className="flex border-b border-[var(--color-borde)] px-4 sm:px-6 gap-2 overflow-x-auto scrollbar-none bg-[var(--color-superficie)]">
                <button
                  type="button"
                  onClick={() => setActiveDrawerTab('pagos')}
                  className={`min-h-[44px] pb-2 pt-3 px-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeDrawerTab === 'pagos'
                      ? 'border-[#CA8A04] text-[#CA8A04] dark:border-[#FACC15] dark:text-[#FACC15]'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Pagos & Cobros</span>
                  <span className="text-[10px] px-1.5 rounded-full bg-black/5 dark:bg-white/10 font-bold">
                    {storePayments.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDrawerTab('suscripcion')}
                  className={`min-h-[44px] pb-2 pt-3 px-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeDrawerTab === 'suscripcion'
                      ? 'border-[#CA8A04] text-[#CA8A04] dark:border-[#FACC15] dark:text-[#FACC15]'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Vencimiento & Límites</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDrawerTab('metricas')}
                  className={`min-h-[44px] pb-2 pt-3 px-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeDrawerTab === 'metricas'
                      ? 'border-[#CA8A04] text-[#CA8A04] dark:border-[#FACC15] dark:text-[#FACC15]'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Métricas & Salud</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDrawerTab('contacto')}
                  className={`min-h-[44px] pb-2 pt-3 px-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeDrawerTab === 'contacto'
                      ? 'border-[#CA8A04] text-[#CA8A04] dark:border-[#FACC15] dark:text-[#FACC15]'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Maker & Contacto</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDrawerTab('notas')}
                  className={`min-h-[44px] pb-2 pt-3 px-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeDrawerTab === 'notas'
                      ? 'border-[#CA8A04] text-[#CA8A04] dark:border-[#FACC15] dark:text-[#FACC15]'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Notas Internas</span>
                </button>
              </div>

              {/* Contenido según la pestaña activa */}
              <div className="p-5 sm:p-6 space-y-6">
                {/* ==============================================================
                    PESTAÑA 1: PAGOS & HISTORIAL DE COBROS
                    ============================================================== */}
                {activeDrawerTab === 'pagos' && (
                  <div className="space-y-5">
                    {/* Tarjeta de Resumen de Facturación */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)]">
                        <span className="text-[10px] uppercase font-semibold opacity-60 block">Precio Pactado</span>
                        <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                          {formatMoney(Number(selectedStore.precio_mensual) || 0)}
                        </span>
                        <span className="text-[10px] opacity-60 block">por mes</span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)]">
                        <span className="text-[10px] uppercase font-semibold opacity-60 block">Próximo Vencimiento</span>
                        <span className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">
                          {selectedStore.fecha_proximo_vencimiento || 'Sin fecha'}
                        </span>
                        <span className="text-[10px] opacity-60 block">
                          {getSubscriptionInfo(selectedStore).statusLabel}
                        </span>
                      </div>

                      <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)]">
                        <span className="text-[10px] uppercase font-semibold opacity-60 block">Cobros Registrados</span>
                        <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(storePayments.reduce((acc, p) => acc + (Number(p.monto) || 0), 0))}
                        </span>
                        <span className="text-[10px] opacity-60 block">total histórico</span>
                      </div>
                    </div>

                    {/* Botón para abrir formulario de pago */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
                        <span>Registro de Pagos y Comprobantes</span>
                      </h3>

                      {!showNewPaymentForm && (
                        <button
                          type="button"
                          onClick={() => setShowNewPaymentForm(true)}
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#CA8A04] hover:bg-[#A16207] text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Registrar Pago</span>
                        </button>
                      )}
                    </div>

                    {/* Formulario para Asentar Nuevo Pago */}
                    {showNewPaymentForm && (
                      <form
                        onSubmit={handleCreatePayment}
                        className="p-4 sm:p-5 rounded-2xl border-2 border-amber-400/40 bg-amber-400/[0.03] space-y-4 animate-in fade-in"
                      >
                        <div className="flex items-center justify-between border-b border-amber-400/20 pb-2">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            Cargar Cobro / Renovación de Suscripción
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowNewPaymentForm(false)}
                            className="p-1 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block font-medium mb-1 opacity-80">Monto Abonado ($ ARS)</label>
                            <input
                              type="number"
                              required
                              value={paymentMonto}
                              onChange={(e) => setPaymentMonto(Number(e.target.value))}
                              placeholder="0"
                              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block font-medium mb-1 opacity-80">Método de Cobro</label>
                            <select
                              value={paymentMetodo}
                              onChange={(e) => setPaymentMetodo(e.target.value)}
                              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            >
                              <option value="transferencia">Transferencia bancaria</option>
                              <option value="efectivo">Efectivo / En mano</option>
                              <option value="mercadopago">Mercado Pago</option>
                              <option value="debito_automatico">Débito automático</option>
                              <option value="otro">Otro acuerdo</option>
                            </select>
                          </div>

                          <div>
                            <label className="block font-medium mb-1 opacity-80">Período Abonado Desde</label>
                            <input
                              type="date"
                              required
                              value={paymentPeriodoDesde}
                              onChange={(e) => setPaymentPeriodoDesde(e.target.value)}
                              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block font-medium mb-1 opacity-80">
                              Período Abonado Hasta (Nuevo Vencimiento)
                            </label>
                            <input
                              type="date"
                              required
                              value={paymentPeriodoHasta}
                              onChange={(e) => setPaymentPeriodoHasta(e.target.value)}
                              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block font-medium mb-1 opacity-80">
                              Detalle / Notas de la Operación
                            </label>
                            <input
                              type="text"
                              value={paymentNotas}
                              onChange={(e) => setPaymentNotas(e.target.value)}
                              placeholder="Ej. Transferencia Banco Galicia comprobante #83921"
                              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-400/20">
                          <button
                            type="button"
                            onClick={() => setShowNewPaymentForm(false)}
                            className="min-h-[36px] px-3 py-1.5 rounded-xl border border-[var(--color-borde)] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={savingPayment}
                            className="min-h-[36px] px-4 py-1.5 rounded-xl bg-[#CA8A04] hover:bg-[#A16207] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            {savingPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            <span>Guardar Cobro y Actualizar Vencimiento</span>
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Historial de Pagos Anteriores */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold opacity-70 block">
                        Historial de transacciones registradas:
                      </span>

                      {loadingPayments ? (
                        <div className="p-8 text-center text-xs opacity-60 flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                          <span>Cargando historial de pagos...</span>
                        </div>
                      ) : storePayments.length === 0 ? (
                        <div className="p-6 text-center rounded-xl border border-dashed border-[var(--color-borde)] text-xs opacity-60 space-y-1">
                          <CreditCard className="w-6 h-6 mx-auto opacity-30" />
                          <p className="font-semibold">Sin pagos registrados aún</p>
                          <p>Usa el botón &quot;Registrar Pago&quot; para asentar el primer cobro de esta tienda.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {storePayments.map((p) => (
                            <div
                              key={p.id}
                              className="p-3.5 rounded-xl border border-[var(--color-borde)] bg-black/[0.015] dark:bg-white/[0.02] flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                    {formatMoney(Number(p.monto) || 0)}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.2 rounded-md bg-black/5 dark:bg-white/10 font-semibold uppercase">
                                    {p.metodo_pago || 'Pago'}
                                  </span>
                                </div>
                                <span className="text-[11px] opacity-70 block">
                                  Período cubierto: {p.periodo_desde} al {p.periodo_hasta}
                                </span>
                                {p.notas && (
                                  <span className="text-[11px] opacity-80 italic block">
                                    &ldquo;{p.notas}&rdquo;
                                  </span>
                                )}
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-[10px] opacity-60 block">Fecha cobro:</span>
                                <span className="font-medium text-[11px]">{p.fecha_pago}</span>
                                {p.registrado_por && (
                                  <span className="text-[10px] opacity-40 block truncate max-w-[120px]">
                                    Por {p.registrado_por}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ==============================================================
                    PESTAÑA 2: VENCIMIENTOS, LÍMITES Y SUSCRIPCIÓN
                    ============================================================== */}
                {activeDrawerTab === 'suscripcion' && (
                  <form onSubmit={handleSaveSubEdit} className="space-y-5">
                    {/* Acciones Rápidas de Extensión con 1 clic */}
                    <div className="p-4 rounded-2xl bg-amber-400/[0.04] border border-amber-400/30 space-y-2">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                        Extender vencimiento rápidamente (+1 clic):
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => extendDueDate(selectedStore, 30, '+1 Mes')}
                          className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#CA8A04] hover:bg-[#A16207] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          +1 Mes (30 días)
                        </button>
                        <button
                          type="button"
                          onClick={() => extendDueDate(selectedStore, 90, '+3 Meses')}
                          className="min-h-[36px] px-3 py-1.5 rounded-xl border border-amber-500/40 hover:bg-amber-500/10 text-xs font-bold text-[#CA8A04] dark:text-[#FACC15] transition-all cursor-pointer"
                        >
                          +3 Meses
                        </button>
                        <button
                          type="button"
                          onClick={() => extendDueDate(selectedStore, 180, '+6 Meses')}
                          className="min-h-[36px] px-3 py-1.5 rounded-xl border border-amber-500/40 hover:bg-amber-500/10 text-xs font-bold text-[#CA8A04] dark:text-[#FACC15] transition-all cursor-pointer"
                        >
                          +6 Meses
                        </button>
                        <button
                          type="button"
                          onClick={() => extendDueDate(selectedStore, 365, '+1 Año')}
                          className="min-h-[36px] px-3 py-1.5 rounded-xl border border-amber-500/40 hover:bg-amber-500/10 text-xs font-bold text-[#CA8A04] dark:text-[#FACC15] transition-all cursor-pointer"
                        >
                          +1 Año
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-medium mb-1.5 opacity-80">Plan Asignado</label>
                        <select
                          value={subEditForm.plan || 'maker_pro'}
                          onChange={(e) => setSubEditForm({ ...subEditForm, plan: e.target.value })}
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                        >
                          <option value="maker_pro">Maker Pro</option>
                          <option value="starter">Starter</option>
                          <option value="enterprise">Enterprise</option>
                          <option value="bonificado">Bonificado / Beta tester</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-medium mb-1.5 opacity-80">Precio Mensual Acordado ($ ARS)</label>
                        <input
                          type="number"
                          value={subEditForm.precio_mensual ?? 0}
                          onChange={(e) => setSubEditForm({ ...subEditForm, precio_mensual: Number(e.target.value) })}
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block font-medium mb-1.5 opacity-80">Próximo Vencimiento</label>
                        <input
                          type="date"
                          value={subEditForm.fecha_proximo_vencimiento || ''}
                          onChange={(e) => setSubEditForm({ ...subEditForm, fecha_proximo_vencimiento: e.target.value })}
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block font-medium mb-1.5 opacity-80">Días de Gracia tras Vencimiento</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={subEditForm.dias_gracia ?? 3}
                            onChange={(e) => setSubEditForm({ ...subEditForm, dias_gracia: Number(e.target.value) })}
                            className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => setSubEditForm((prev) => ({ ...prev, dias_gracia: (prev.dias_gracia ?? 3) + 7 }))}
                            className="min-h-[44px] px-3 rounded-xl border border-[var(--color-borde)] text-[11px] font-semibold hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
                          >
                            +7d
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block font-medium mb-1.5 opacity-80">Límite Máximo de Productos</label>
                        <input
                          type="number"
                          value={subEditForm.limite_productos ?? 50}
                          onChange={(e) => setSubEditForm({ ...subEditForm, limite_productos: Number(e.target.value) })}
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block font-medium mb-1.5 opacity-80">Estado de Pago Manual</label>
                        <select
                          value={subEditForm.estado_pago || 'al_dia'}
                          onChange={(e) => setSubEditForm({ ...subEditForm, estado_pago: e.target.value })}
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="al_dia">Al Día</option>
                          <option value="pendiente">Pendiente</option>
                          <option value="bonificado">Bonificado</option>
                          <option value="gracia">En Gracia</option>
                          <option value="vencido">Vencido / En mora</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-medium mb-1.5 opacity-80">Modo de Operación</label>
                        <select
                          value={subEditForm.modo_operacion || 'vitrina'}
                          onChange={(e) => setSubEditForm({ ...subEditForm, modo_operacion: e.target.value })}
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="vitrina">Solo Vitrina (sin carrito)</option>
                          <option value="tienda">Tienda completa (con carrito y checkout)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-medium mb-1.5 opacity-80">Checkout y Carrito Activo</label>
                        <select
                          value={subEditForm.checkout_activo ? 'true' : 'false'}
                          onChange={(e) => setSubEditForm({ ...subEditForm, checkout_activo: e.target.value === 'true' })}
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="true">Habilitado</option>
                          <option value="false">Deshabilitado (solo WhatsApp)</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--color-borde)] flex justify-end">
                      <button
                        type="submit"
                        disabled={savingSubEdit}
                        className="min-h-[44px] px-6 rounded-xl bg-[#CA8A04] hover:bg-[#A16207] text-white text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {savingSubEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>Guardar Cambios de Suscripción</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* ==============================================================
                    PESTAÑA 3: MÉTRICAS Y SALUD DEL NEGOCIO MAKER
                    ============================================================== */}
                {activeDrawerTab === 'metricas' && (
                  <div className="space-y-4">
                    <p className="text-xs opacity-70">
                      Rendimiento comercial y actividad en tiempo real de <strong>{selectedStore.nombre}</strong>:
                    </p>

                    {loadingMetrics ? (
                      <div className="p-8 text-center text-xs opacity-60 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                        <span>Calculando métricas de la tienda...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)] space-y-1">
                          <span className="text-[10px] uppercase font-semibold opacity-60 flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Ventas de la Tienda</span>
                          </span>
                          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 block">
                            {formatMoney(storeMetrics?.totalSales || 0)}
                          </span>
                          <span className="text-[11px] opacity-60 block">en pedidos registrados</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)] space-y-1">
                          <span className="text-[10px] uppercase font-semibold opacity-60 flex items-center gap-1">
                            <Package className="w-3.5 h-3.5 text-blue-500" />
                            <span>Pedidos Recibidos</span>
                          </span>
                          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 block">
                            {storeMetrics?.totalOrders || 0}
                          </span>
                          <span className="text-[11px] opacity-60 block">órdenes procesadas</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)] space-y-1">
                          <span className="text-[10px] uppercase font-semibold opacity-60 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-purple-500" />
                            <span>Clientes en CRM</span>
                          </span>
                          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 block">
                            {storeMetrics?.totalCustomers || 0}
                          </span>
                          <span className="text-[11px] opacity-60 block">usuarios registrados</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)] space-y-1">
                          <span className="text-[10px] uppercase font-semibold opacity-60 flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-amber-500" />
                            <span>Piezas en Catálogo</span>
                          </span>
                          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 block">
                            {selectedStore.product_count || 0}
                          </span>
                          <span className="text-[11px] opacity-60 block">
                            de {selectedStore.limite_productos || 50} permitidos
                          </span>
                        </div>

                        <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)] space-y-1">
                          <span className="text-[10px] uppercase font-semibold opacity-60 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Colaboradores</span>
                          </span>
                          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 block">
                            {storeMetrics?.totalCollaborators || 0}
                          </span>
                          <span className="text-[11px] opacity-60 block">con acceso al taller</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)] space-y-1">
                          <span className="text-[10px] uppercase font-semibold opacity-60 flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                            <span>Reseñas de Clientes</span>
                          </span>
                          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 block">
                            {storeMetrics?.totalReviews || 0}
                          </span>
                          <span className="text-[11px] opacity-60 block">opiniones públicas</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ==============================================================
                    PESTAÑA 4: MAKER & CONTACTO DIRECTO
                    ============================================================== */}
                {activeDrawerTab === 'contacto' && (
                  <div className="space-y-4 text-xs">
                    <div className="p-4 rounded-2xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] space-y-3">
                      <div>
                        <span className="text-[10px] uppercase font-semibold opacity-60 block">Maker / Titular</span>
                        <span className="font-semibold text-sm">{selectedStore.nombre}</span>
                        {selectedStore.slogan && (
                          <p className="opacity-70 text-xs mt-0.5">{selectedStore.slogan}</p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[var(--color-borde)] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-semibold opacity-60 block">Email del Administrador</span>
                          <span className="font-mono text-xs">{selectedStore.admin_email}</span>
                        </div>
                        <a
                          href={`mailto:${selectedStore.admin_email}`}
                          className="min-h-[36px] px-3 py-1.5 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 font-semibold flex items-center gap-1.5"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Enviar Mail</span>
                        </a>
                      </div>

                      {selectedStore.whatsapp_numero && (
                        <div className="pt-2 border-t border-[var(--color-borde)] flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-semibold opacity-60 block">WhatsApp de Soporte</span>
                            <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                              {selectedStore.whatsapp_numero}
                            </span>
                          </div>
                          <a
                            href={`https://wa.me/${selectedStore.whatsapp_numero.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `Hola ${selectedStore.nombre}, te contacto desde el equipo de soporte de Portalmaker respecto a tu tienda...`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5" />
                            <span>Abrir Chat WhatsApp</span>
                          </a>
                        </div>
                      )}

                      <div className="pt-2 border-t border-[var(--color-borde)]">
                        <span className="text-[10px] uppercase font-semibold opacity-60 block">Fecha de Alta en la Red</span>
                        <span>{selectedStore.created_at.split('T')[0]} ({getSubscriptionInfo(selectedStore).timeElapsed} de trayectoria)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ==============================================================
                    PESTAÑA 5: NOTAS INTERNAS DEL SUPERADMIN
                    ============================================================== */}
                {activeDrawerTab === 'notas' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                        Anotaciones privadas de Superadmin
                      </h4>
                      <p className="text-xs opacity-70">
                        Registra acuerdos particulares, descuentos acordados, historial de llamadas o requerimientos específicos de este Maker. Solo visible para platform admins.
                      </p>
                    </div>

                    <textarea
                      rows={8}
                      value={subEditForm.notas_admin || ''}
                      onChange={(e) => setSubEditForm({ ...subEditForm, notas_admin: e.target.value })}
                      placeholder="Escribe aquí notas internas sobre este cliente maker..."
                      className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveQuickNotes}
                        className="min-h-[44px] px-5 rounded-xl bg-[#CA8A04] hover:bg-[#A16207] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>Guardar Notas</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pie del Drawer */}
            <div className="p-4 border-t border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between text-xs">
              <span className="opacity-60 text-[11px]">ID: {selectedStore.id}</span>
              <button
                type="button"
                onClick={() => setSelectedStore(null)}
                className="min-h-[38px] px-4 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 font-semibold cursor-pointer"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
