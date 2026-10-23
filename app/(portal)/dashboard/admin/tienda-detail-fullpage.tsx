// =============================================================================
// PORTALMAKER — Gestión Integral de Tienda en Página Completa (Superadmin)
// Reemplaza la ficha lateral angosta por una vista espaciosa con navegación por
// pestañas, métricas en vivo, cobros, configuración comercial y notas internas.
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { getPlanConfig } from '@/lib/plans'
import type { SubscriptionPayment } from '@/types/database'
import type { SuperadminStoreItem } from './tiendas-list'
import {
  ArrowLeft,
  Store,
  ExternalLink,
  Package,
  Power,
  Loader2,
  Calendar,
  Clock,
  Edit,
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
  Sliders,
  CheckCircle2,
  X,
  Truck,
  Globe,
  Settings,
} from 'lucide-react'
import WhatsAppIcon from '@/app/tienda/sections/whatsapp-icon'

interface StoreLiveMetrics {
  totalOrders: number
  totalSales: number
  totalCustomers: number
  totalCollaborators: number
  totalReviews: number
}

interface SuperadminTiendaDetailFullpageProps {
  store: SuperadminStoreItem
  totalStoresCount: number
  onBack: () => void
  onStoreUpdated: (updatedStore: SuperadminStoreItem) => void
  onToggleSubscription: (storeId: string, currentState: boolean) => Promise<void>
  loadingId: string | null
  showToast: (msg: string) => void
}

const PLAN_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  free: {
    label: 'Free / Vitrina (Nivel 1)',
    color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
    desc: 'Nivel 1: Catálogo vitrina hasta 20 productos con consultas y ventas por WhatsApp (0% comisión)',
  },
  starter: {
    label: 'Starter (Nivel 2)',
    color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50',
    desc: 'Nivel 2: Hasta 50 productos, checkout Mercado Pago + transferencias, tarifas fijas de envío, 1 colaborador (5% comisión)',
  },
  maker_pro: {
    label: 'Maker Pro (Nivel 3)',
    color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50',
    desc: 'Nivel 3: Hasta 200 productos, couriers automatizados en vivo (Zipnova), dominio propio, hasta 3 colaboradores (2.5% comisión)',
  },
  enterprise: {
    label: 'Enterprise (Nivel 4)',
    color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50',
    desc: 'Nivel 4: Productos y colaboradores ilimitados, couriers en vivo + depósitos múltiples, sin comisión de Portalmaker (0%)',
  },
  bonificado: {
    label: 'Bonificado / Especial',
    color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50',
    desc: 'Acceso especial sin cargo acordado para tiendas fundadoras, alianzas o beta testers',
  },
}

export default function SuperadminTiendaDetailFullpage({
  store,
  totalStoresCount,
  onBack,
  onStoreUpdated,
  onToggleSubscription,
  loadingId,
  showToast,
}: SuperadminTiendaDetailFullpageProps) {
  const supabase = createSupabaseBrowserClient()

  // Pestaña activa en la página completa
  const [activeTab, setActiveTab] = useState<'suscripcion' | 'pagos' | 'metricas' | 'contacto' | 'notas'>('suscripcion')

  // Estado del formulario de edición de suscripción y datos de la tienda
  const [subEditForm, setSubEditForm] = useState<Partial<SuperadminStoreItem>>({})
  const [savingSubEdit, setSavingSubEdit] = useState(false)

  // Datos en vivo de pagos
  const [storePayments, setStorePayments] = useState<SubscriptionPayment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)

  // Estado del formulario para registrar nuevo pago
  const [showNewPaymentForm, setShowNewPaymentForm] = useState(false)
  const [paymentMonto, setPaymentMonto] = useState<number>(0)
  const [paymentMetodo, setPaymentMetodo] = useState<string>('transferencia')
  const [paymentFecha, setPaymentFecha] = useState<string>(new Date().toISOString().split('T')[0])
  const [paymentPeriodoDesde, setPaymentPeriodoDesde] = useState<string>(new Date().toISOString().split('T')[0])
  const [paymentPeriodoHasta, setPaymentPeriodoHasta] = useState<string>('')
  const [paymentNotas, setPaymentNotas] = useState<string>('')
  const [savingPayment, setSavingPayment] = useState(false)

  // Métricas en vivo
  const [storeMetrics, setStoreMetrics] = useState<StoreLiveMetrics | null>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(false)

  // Feedback de copiado
  const [copiedSlug, setCopiedSlug] = useState(false)

  // Formato monetario en pesos argentinos
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Cálculo detallado del estado de la suscripción
  const getSubscriptionInfo = () => {
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
        statusLabel = `Al día (${daysRemaining}d restantes)`
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
          statusLabel = `Vencida (${daysOverdue}d de mora)`
          badgeColor = 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
        }
      }
    }

    // Antigüedad en la plataforma
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
        timeElapsed = `${years} año${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` y ${remainingMonths} mes${remainingMonths > 1 ? 'es' : ''}` : ''}`
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

  const subInfo = getSubscriptionInfo()
  const planMeta = PLAN_LABELS[store.plan || 'maker_pro'] || {
    label: store.plan || 'Maker Pro',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    desc: 'Plan general',
  }

  // Sincronizar formulario cuando cambia la tienda
  useEffect(() => {
    setSubEditForm({
      nombre: store.nombre || '',
      slug: store.slug || '',
      admin_email: store.admin_email || '',
      custom_domain: store.custom_domain || '',
      plan: store.plan || 'maker_pro',
      precio_mensual: store.precio_mensual ?? 0,
      comision_portalmaker: store.comision_portalmaker ?? 0,
      limite_productos: store.limite_productos ?? 50,
      estado_pago: store.estado_pago || 'al_dia',
      fecha_proximo_vencimiento: store.fecha_proximo_vencimiento || '',
      dias_gracia: store.dias_gracia ?? 3,
      modo_operacion: store.modo_operacion || 'vitrina',
      checkout_activo: Boolean(store.checkout_activo),
      envios_activo: Boolean(store.envios_activo),
      suscripcion_activa: store.suscripcion_activa,
      notas_admin: store.notas_admin || '',
    })

    const baseDue = store.fecha_proximo_vencimiento
      ? new Date(store.fecha_proximo_vencimiento + 'T00:00:00')
      : new Date()
    const nextDue = new Date(baseDue.getTime() + 30 * 24 * 60 * 60 * 1000)
    setPaymentPeriodoDesde(store.fecha_proximo_vencimiento || new Date().toISOString().split('T')[0])
    setPaymentPeriodoHasta(nextDue.toISOString().split('T')[0])
    setPaymentMonto(Number(store.precio_mensual) || 0)

    // Cargar historial de pagos
    const loadPayments = async () => {
      setLoadingPayments(true)
      try {
        const { data, error } = await supabase
          .from('subscription_payments')
          .select('*')
          .eq('store_id', store.id)
          .order('fecha_pago', { ascending: false })

        if (error) throw error
        setStorePayments((data as SubscriptionPayment[]) || [])
      } catch (e) {
        console.error('Error cargando pagos de suscripción:', e)
      } finally {
        setLoadingPayments(false)
      }
    }

    // Cargar métricas en tiempo real
    const loadMetrics = async () => {
      setLoadingMetrics(true)
      try {
        const { data: ords } = await supabase
          .from('orders')
          .select('id, total')
          .eq('store_id', store.id)

        const totalOrders = ords?.length ?? 0
        const totalSales = ords?.reduce((acc, o) => acc + (Number(o.total) || 0), 0) ?? 0

        const { count: customersCount } = await supabase
          .from('store_customers')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)

        const { count: collabCount } = await supabase
          .from('store_collaborators')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)

        const { count: reviewsCount } = await supabase
          .from('product_reviews')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)

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
  }, [store.id])

  // Copiar enlace de la tienda
  const handleCopyLink = () => {
    const url = `https://${store.slug}.portalmaker.ar`
    navigator.clipboard.writeText(url)
    setCopiedSlug(true)
    setTimeout(() => setCopiedSlug(false), 2000)
    showToast('Enlace de la tienda copiado al portapapeles')
  }

  // Extender vencimiento rápidamente (+30d, +90d, etc.)
  const handleExtendDueDate = async (daysToAdd: number, label: string) => {
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
        ...store,
        fecha_proximo_vencimiento: newDueDateStr,
        suscripcion_activa: true,
        estado_pago: 'al_dia',
      }

      onStoreUpdated(updated)
      setSubEditForm((prev) => ({ ...prev, ...updated }))
      showToast(`Vencimiento extendido ${label} (hasta el ${newDueDateStr})`)
    } catch (err: any) {
      alert('Error al extender vencimiento: ' + err.message)
    }
  }

  // Guardar cambios en el formulario de configuración
  const handleSaveSubEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSubEdit(true)

    try {
      const nuevoNombre = subEditForm.nombre?.trim() || ''
      if (!nuevoNombre) {
        throw new Error('El nombre de la tienda es obligatorio.')
      }

      const rawSlug = subEditForm.slug?.trim().toLowerCase() || ''
      const nuevoSlug = rawSlug.replace(/[^a-z0-9-]/g, '')
      if (!nuevoSlug) {
        throw new Error('El subdominio (slug) es obligatorio y debe contener solo letras minúsculas, números o guiones.')
      }

      const nuevoEmail = subEditForm.admin_email?.trim() || ''
      if (!nuevoEmail || !nuevoEmail.includes('@')) {
        throw new Error('El email del administrador debe tener un formato válido.')
      }

      // Si el slug cambió, validar que no esté ocupado
      if (nuevoSlug !== store.slug) {
        const { data: existing, error: checkErr } = await supabase
          .from('stores')
          .select('id, nombre')
          .eq('slug', nuevoSlug)
          .neq('id', store.id)
          .maybeSingle()

        if (checkErr) throw checkErr
        if (existing) {
          throw new Error(`El subdominio '${nuevoSlug}' ya está asignado a la tienda '${existing.nombre}'. Por favor elige uno diferente.`)
        }
      }

      const rawDomain = subEditForm.custom_domain?.trim().toLowerCase() || null
      const nuevoDominio = rawDomain ? rawDomain.replace(/^https?:\/\//, '').replace(/\/$/, '') : null

      const updateData = {
        nombre: nuevoNombre,
        slug: nuevoSlug,
        admin_email: nuevoEmail,
        custom_domain: nuevoDominio,
        plan: subEditForm.plan,
        precio_mensual: Number(subEditForm.precio_mensual) || 0,
        comision_portalmaker: (() => {
          const raw = Number(subEditForm.comision_portalmaker)
          if (isNaN(raw) || raw < 0 || raw >= 100) {
            throw new Error('La comisión del portal debe ser un valor numérico entre 0% y 99.99%.')
          }
          return Number(raw.toFixed(2))
        })(),
        limite_productos: Number(subEditForm.limite_productos) || 50,
        estado_pago: subEditForm.estado_pago,
        fecha_proximo_vencimiento: subEditForm.fecha_proximo_vencimiento || null,
        dias_gracia: Number(subEditForm.dias_gracia) || 0,
        modo_operacion: subEditForm.modo_operacion || 'vitrina',
        checkout_activo: Boolean(subEditForm.checkout_activo),
        envios_activo: Boolean(subEditForm.envios_activo),
        suscripcion_activa: Boolean(subEditForm.suscripcion_activa),
      }

      const { error } = await supabase
        .from('stores')
        .update(updateData)
        .eq('id', store.id)

      if (error) throw error

      // Guardar notas internas en tabla protegida
      const notasLimpias = subEditForm.notas_admin?.trim() || null
      const { error: notesError } = await supabase
        .from('store_admin_notes')
        .upsert(
          { store_id: store.id, notas: notasLimpias, updated_at: new Date().toISOString() },
          { onConflict: 'store_id' }
        )
      if (notesError) throw notesError

      const updated = { ...store, ...updateData, notas_admin: notasLimpias } as SuperadminStoreItem
      onStoreUpdated(updated)
      showToast('Configuraciones de la tienda actualizadas exitosamente')
    } catch (err: any) {
      alert('Error al guardar datos: ' + err.message)
    } finally {
      setSavingSubEdit(false)
    }
  }

  // Registrar un cobro / pago de suscripción
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPayment(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const paymentPayload = {
        store_id: store.id,
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

      // Actualizar también la fecha de vencimiento de la tienda
      await supabase
        .from('stores')
        .update({
          fecha_proximo_vencimiento: paymentPeriodoHasta,
          suscripcion_activa: true,
          estado_pago: 'al_dia',
        })
        .eq('id', store.id)

      const updatedStore = {
        ...store,
        fecha_proximo_vencimiento: paymentPeriodoHasta,
        suscripcion_activa: true,
        estado_pago: 'al_dia',
      }

      onStoreUpdated(updatedStore)
      setStorePayments((prev) => [insertedPayment as SubscriptionPayment, ...prev])
      setShowNewPaymentForm(false)
      setPaymentNotas('')
      showToast('Pago registrado correctamente. Próximo vencimiento actualizado.')
    } catch (err: any) {
      alert('Error al registrar pago: ' + err.message)
    } finally {
      setSavingPayment(false)
    }
  }

  // Guardar notas internas
  const handleSaveNotes = async () => {
    try {
      const notasLimpias = subEditForm.notas_admin?.trim() || null
      const { error } = await supabase
        .from('store_admin_notes')
        .upsert(
          {
            store_id: store.id,
            notas: notasLimpias,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'store_id' }
        )

      if (error) throw error

      const updated = { ...store, notas_admin: notasLimpias }
      onStoreUpdated(updated)
      showToast('Notas internas guardadas correctamente')
    } catch (err: any) {
      alert('Error al guardar notas: ' + err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-30 bg-[var(--color-fondo)] text-[var(--color-texto)] overflow-y-auto min-h-screen transition-colors duration-200">
      {/* =====================================================================
          BARRA DE NAVEGACIÓN SUPERIOR FIJA
          ===================================================================== */}
      <header className="sticky top-0 z-40 bg-[var(--color-superficie)]/95 backdrop-blur-md border-b border-[var(--color-borde)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          {/* Botón Volver a todas las tiendas + Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] border border-[var(--color-borde)] text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
              <span className="hidden sm:inline">Volver a todas las tiendas</span>
              <span className="sm:hidden">Volver</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs bg-black/10 dark:bg-white/10 font-bold">
                {totalStoresCount}
              </span>
            </button>

            <div className="h-6 w-px bg-[var(--color-borde)] hidden md:block" />

            <div className="hidden md:flex items-center gap-2 text-xs opacity-70 truncate">
              <span>Superadmin</span>
              <span>/</span>
              <span>Tiendas</span>
              <span>/</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {store.nombre}
              </span>
            </div>
          </div>

          {/* Accesos directos y acciones de estado */}
          <div className="flex items-center gap-2">
            <Link
              href={`/tienda/admin/productos?tenant=${store.slug}`}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-400/20 text-[#CA8A04] dark:text-[#FACC15] hover:bg-amber-400/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Package className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Panel Tienda</span>
            </Link>

            <Link
              href={`/tienda?tenant=${store.slug}`}
              target="_blank"
              className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              <span className="hidden sm:inline">Visitar Tienda</span>
            </Link>

            <button
              type="button"
              disabled={loadingId === store.id}
              onClick={() => onToggleSubscription(store.id, store.suscripcion_activa)}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
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
              <span className="hidden sm:inline">
                {store.suscripcion_activa ? 'Pausar Tienda' : 'Activar Tienda'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          HERO DE LA TIENDA: IDENTIDAD Y RESUMEN GENERAL
          ===================================================================== */}
      <div className="bg-[var(--color-superficie)] border-b border-[var(--color-borde)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Foto, Nombre, Slogan y Enlaces */}
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-[var(--color-borde)] bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-xs">
                {store.logo_url ? (
                  <img src={store.logo_url} alt="" className="w-full h-full object-contain p-1.5" />
                ) : (
                  <span className="font-bold text-2xl text-[#CA8A04] dark:text-[#FACC15]">
                    {store.nombre.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-[var(--font-portal-heading)]">
                    {store.nombre}
                  </h1>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${subInfo.badgeColor}`}
                  >
                    {subInfo.statusLabel}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${planMeta.color}`}
                  >
                    {planMeta.label}
                  </span>
                </div>

                {store.slogan && (
                  <p className="text-xs sm:text-sm opacity-70 italic max-w-2xl">
                    &ldquo;{store.slogan}&rdquo;
                  </p>
                )}

                <div className="flex items-center gap-3 flex-wrap text-xs pt-0.5">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="font-mono text-[#CA8A04] dark:text-[#FACC15] hover:underline flex items-center gap-1 cursor-pointer"
                    title="Copiar URL pública"
                  >
                    <span>{store.slug}.portalmaker.ar</span>
                    {copiedSlug ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 opacity-60" />
                    )}
                  </button>

                  {store.custom_domain && (
                    <span className="font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      <span>{store.custom_domain}</span>
                    </span>
                  )}

                  <span className="opacity-40">•</span>

                  <span className="opacity-70 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{store.admin_email}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Resumen Comercial Rápido */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
              <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)]">
                <span className="text-[10px] uppercase font-semibold opacity-60 block">Precio Mensual</span>
                <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {formatMoney(Number(store.precio_mensual) || 0)}
                </span>
                <span className="text-[10px] opacity-60 block">acordado ARS</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)]">
                <span className="text-[10px] uppercase font-semibold opacity-60 block">Vencimiento</span>
                <span className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">
                  {store.fecha_proximo_vencimiento || 'Sin fecha'}
                </span>
                <span className="text-[10px] opacity-60 block">próximo cobro</span>
              </div>

              <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)]">
                <span className="text-[10px] uppercase font-semibold opacity-60 block">Catálogo</span>
                <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {store.product_count || 0} / {store.limite_productos || 50}
                </span>
                <span className="text-[10px] opacity-60 block">piezas activas</span>
              </div>
            </div>
          </div>

          {/* ===================================================================
              BARRA DE PESTAÑAS (TABS BIEN ORGANIZADAS)
              =================================================================== */}
          <div className="flex border-b border-[var(--color-borde)] gap-2 sm:gap-6 overflow-x-auto scrollbar-none pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('suscripcion')}
              className={`min-h-[44px] pb-3 px-2 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'suscripcion'
                  ? 'border-[#CA8A04] text-[#CA8A04] dark:border-[#FACC15] dark:text-[#FACC15]'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Configuración & Plan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pagos')}
              className={`min-h-[44px] pb-3 px-2 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'pagos'
                  ? 'border-[#CA8A04] text-[#CA8A04] dark:border-[#FACC15] dark:text-[#FACC15]'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Pagos & Facturación</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 font-bold">
                {storePayments.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('metricas')}
              className={`min-h-[44px] pb-3 px-2 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'metricas'
                  ? 'border-[#CA8A04] text-[#CA8A04] dark:border-[#FACC15] dark:text-[#FACC15]'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Métricas & Rendimiento</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('contacto')}
              className={`min-h-[44px] pb-3 px-2 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'contacto'
                  ? 'border-[#CA8A04] text-[#CA8A04] dark:border-[#FACC15] dark:text-[#FACC15]'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Maker & Contacto</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('notas')}
              className={`min-h-[44px] pb-3 px-2 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'notas'
                  ? 'border-[#CA8A04] text-[#CA8A04] dark:border-[#FACC15] dark:text-[#FACC15]'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Notas Internas</span>
              {store.notas_admin && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          CONTENIDO PRINCIPAL SEGÚN LA PESTAÑA ACTIVA
          ===================================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* ===================================================================
            PESTAÑA 1: CONFIGURACIÓN, PLAN, LÍMITES Y VENCIMIENTOS
            =================================================================== */}
        {activeTab === 'suscripcion' && (
          <form onSubmit={handleSaveSubEdit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tarjeta 1: Identidad y Acceso */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--color-borde)]">
                  <Store className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
                  <h3 className="font-semibold text-sm sm:text-base">
                    Identidad, Subdominio y Acceso
                  </h3>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-medium mb-1.5 opacity-80">
                      Nombre de la Tienda <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={subEditForm.nombre || ''}
                      onChange={(e) => setSubEditForm({ ...subEditForm, nombre: e.target.value })}
                      placeholder="Ej. Tecmaker 3D"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1.5 opacity-80">
                      Subdominio / Slug <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        value={subEditForm.slug || ''}
                        onChange={(e) =>
                          setSubEditForm({
                            ...subEditForm,
                            slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                          })
                        }
                        placeholder="tecmaker3d"
                        className="w-full h-11 pl-3.5 pr-32 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                      />
                      <span className="absolute right-3 text-xs font-mono text-zinc-500 dark:text-zinc-400 select-none pointer-events-none">
                        .portalmaker.ar
                      </span>
                    </div>
                    <p className="text-[11px] opacity-60 mt-1">
                      Letras minúsculas, números y guiones. Define la URL pública.
                    </p>
                  </div>

                  <div>
                    <label className="block font-medium mb-1.5 opacity-80">
                      Email del Administrador / Titular <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={subEditForm.admin_email || ''}
                      onChange={(e) => setSubEditForm({ ...subEditForm, admin_email: e.target.value })}
                      placeholder="maker@ejemplo.com"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1.5 opacity-80">
                      Dominio Personalizado (Opcional)
                    </label>
                    <input
                      type="text"
                      value={subEditForm.custom_domain || ''}
                      onChange={(e) => setSubEditForm({ ...subEditForm, custom_domain: e.target.value })}
                      placeholder="ej. mitiendapropia.com.ar"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Tarjeta 2: Modalidad y Canales de Venta */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--color-borde)]">
                  <Settings className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
                  <h3 className="font-semibold text-sm sm:text-base">
                    Modalidad Operativa y Canales
                  </h3>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-medium mb-1.5 opacity-80">Modo de Operación</label>
                    <select
                      value={subEditForm.modo_operacion || 'vitrina'}
                      onChange={(e) => setSubEditForm({ ...subEditForm, modo_operacion: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="vitrina">Solo Vitrina (pedidos y consultas por WhatsApp)</option>
                      <option value="tienda">Tienda Completa (con carrito y checkout online)</option>
                    </select>
                    <p className="text-[11px] opacity-60 mt-1">
                      En vitrina los compradores coordinan el pago directamente con el maker.
                    </p>
                  </div>

                  <div>
                    <label className="block font-medium mb-1.5 opacity-80">Checkout y Carrito Online</label>
                    <select
                      value={subEditForm.checkout_activo ? 'true' : 'false'}
                      onChange={(e) => setSubEditForm({ ...subEditForm, checkout_activo: e.target.value === 'true' })}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="true">Habilitado (permite procesar compras en la web)</option>
                      <option value="false">Deshabilitado (solo cotizaciones por WhatsApp)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium mb-1.5 opacity-80">Envíos y Despacho Automatizado</label>
                    <select
                      value={subEditForm.envios_activo ? 'true' : 'false'}
                      onChange={(e) => setSubEditForm({ ...subEditForm, envios_activo: e.target.value === 'true' })}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="true">Habilitado (cotización en tiempo real y etiquetas)</option>
                      <option value="false">Deshabilitado (envíos a coordinar con el comprador)</option>
                    </select>
                  </div>

                  <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)] flex items-center justify-between">
                    <div>
                      <span className="font-semibold block">Mercado Pago</span>
                      <span className="text-[11px] opacity-60">
                        {store.mp_connected ? 'Cuenta vinculada correctamente' : 'Sin vincular por el maker'}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                        store.mp_connected
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {store.mp_connected ? 'Conectado' : 'No conectado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tarjeta 3: Plan, Precios y Comisiones */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--color-borde)]">
                  <CreditCard className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
                  <h3 className="font-semibold text-sm sm:text-base">
                    Plan Comercial, Precios y Límites
                  </h3>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-medium opacity-80">Plan Asignado</label>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        Ajusta sugerencias automáticamente
                      </span>
                    </div>
                    <select
                      value={subEditForm.plan || 'maker_pro'}
                      onChange={(e) => {
                        const newPlan = e.target.value
                        const pConfig = getPlanConfig(newPlan)
                        setSubEditForm((prev) => ({
                          ...prev,
                          plan: newPlan,
                          precio_mensual: pConfig.precioMensualSugerido,
                          comision_portalmaker: pConfig.comisionPortalmakerPct,
                          limite_productos: pConfig.limiteProductos,
                          modo_operacion: pConfig.modoOperacionDefault,
                          checkout_activo: pConfig.checkoutActivo,
                          envios_activo: pConfig.enviosZonasFijas || pConfig.enviosCouriersEnVivo,
                        }))
                      }}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="free">Free / Vitrina (Nivel 1)</option>
                      <option value="starter">Starter (Nivel 2)</option>
                      <option value="maker_pro">Maker Pro (Nivel 3)</option>
                      <option value="enterprise">Enterprise (Nivel 4 — 0% Comisión)</option>
                      <option value="bonificado">Bonificado / Especial</option>
                    </select>
                    <p className="text-[11px] opacity-60 mt-1">
                      {PLAN_LABELS[subEditForm.plan || 'maker_pro']?.desc || planMeta.desc}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-medium mb-1.5 opacity-80">
                        Precio Mensual Acordado ($ ARS)
                      </label>
                      <input
                        type="number"
                        value={subEditForm.precio_mensual ?? 0}
                        onChange={(e) =>
                          setSubEditForm({ ...subEditForm, precio_mensual: Number(e.target.value) })
                        }
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block font-medium mb-1.5 opacity-80">
                        Límite Máximo de Catálogo
                      </label>
                      <input
                        type="number"
                        value={subEditForm.limite_productos ?? 50}
                        onChange={(e) =>
                          setSubEditForm({ ...subEditForm, limite_productos: Number(e.target.value) })
                        }
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <p className="text-[10px] opacity-60 mt-1">
                        Cantidad máxima de productos permitidos.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium mb-1.5 opacity-80">
                      Comisión Portalmaker por Venta (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="99.99"
                      value={subEditForm.comision_portalmaker ?? 0}
                      onChange={(e) =>
                        setSubEditForm({
                          ...subEditForm,
                          comision_portalmaker: Number(e.target.value),
                        })
                      }
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <p className="text-[11px] opacity-60 mt-1">
                      Porcentaje retenido en transacciones vía Mercado Pago hacia la cuenta del portal.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tarjeta 4: Fechas, Vencimiento y Gracia */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--color-borde)]">
                  <Clock className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
                  <h3 className="font-semibold text-sm sm:text-base">
                    Vigencia, Vencimiento y Tolerancia
                  </h3>
                </div>

                {/* Botones de extensión con 1 clic */}
                <div className="p-3.5 rounded-xl bg-amber-400/[0.05] border border-amber-400/30 space-y-2">
                  <span className="text-xs font-semibold block text-zinc-900 dark:text-zinc-100">
                    Extender vencimiento en 1 clic:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleExtendDueDate(30, '+1 Mes')}
                      className="min-h-[40px] px-2 py-1.5 rounded-xl bg-[#CA8A04] hover:bg-[#A16207] text-white text-xs font-bold transition-all shadow-xs cursor-pointer text-center"
                    >
                      +1 Mes (30d)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExtendDueDate(90, '+3 Meses')}
                      className="min-h-[40px] px-2 py-1.5 rounded-xl border border-amber-500/40 hover:bg-amber-500/10 text-xs font-bold text-[#CA8A04] dark:text-[#FACC15] transition-all cursor-pointer text-center"
                    >
                      +3 Meses
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExtendDueDate(180, '+6 Meses')}
                      className="min-h-[40px] px-2 py-1.5 rounded-xl border border-amber-500/40 hover:bg-amber-500/10 text-xs font-bold text-[#CA8A04] dark:text-[#FACC15] transition-all cursor-pointer text-center"
                    >
                      +6 Meses
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExtendDueDate(365, '+1 Año')}
                      className="min-h-[40px] px-2 py-1.5 rounded-xl border border-amber-500/40 hover:bg-amber-500/10 text-xs font-bold text-[#CA8A04] dark:text-[#FACC15] transition-all cursor-pointer text-center"
                    >
                      +1 Año
                    </button>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-medium mb-1.5 opacity-80">
                        Próximo Vencimiento
                      </label>
                      <input
                        type="date"
                        value={subEditForm.fecha_proximo_vencimiento || ''}
                        onChange={(e) =>
                          setSubEditForm({ ...subEditForm, fecha_proximo_vencimiento: e.target.value })
                        }
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block font-medium mb-1.5 opacity-80">
                        Días de Gracia tras Vencer
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={subEditForm.dias_gracia ?? 3}
                          onChange={(e) =>
                            setSubEditForm({ ...subEditForm, dias_gracia: Number(e.target.value) })
                          }
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setSubEditForm((prev) => ({
                              ...prev,
                              dias_gracia: (prev.dias_gracia ?? 3) + 7,
                            }))
                          }
                          className="min-h-[44px] px-3 rounded-xl border border-[var(--color-borde)] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
                        >
                          +7d
                        </button>
                      </div>
                    </div>
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
                </div>
              </div>
            </div>

            {/* Botón flotante/inferior de guardar */}
            <div className="p-4 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] flex items-center justify-between shadow-xs">
              <span className="text-xs opacity-70">
                Los cambios se aplican de manera inmediata en la plataforma y en la tienda del maker.
              </span>
              <button
                type="submit"
                disabled={savingSubEdit}
                className="min-h-[44px] px-6 rounded-xl bg-[#CA8A04] hover:bg-[#A16207] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {savingSubEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Guardar Cambios de la Tienda</span>
              </button>
            </div>
          </form>
        )}

        {/* ===================================================================
            PESTAÑA 2: PAGOS Y HISTORIAL DE COBROS
            =================================================================== */}
        {activeTab === 'pagos' && (
          <div className="space-y-6">
            {/* Resumen Superior */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-2xs">
                <span className="text-xs uppercase font-semibold opacity-60 block">Precio Pactado</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {formatMoney(Number(store.precio_mensual) || 0)}
                </span>
                <span className="text-xs opacity-60 block mt-1">por mes</span>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-2xs">
                <span className="text-xs uppercase font-semibold opacity-60 block">Próximo Vencimiento</span>
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {store.fecha_proximo_vencimiento || 'Sin fecha'}
                </span>
                <span className="text-xs opacity-60 block mt-1">{subInfo.statusLabel}</span>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-2xs">
                <span className="text-xs uppercase font-semibold opacity-60 block">Cobros Registrados</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatMoney(storePayments.reduce((acc, p) => acc + (Number(p.monto) || 0), 0))}
                </span>
                <span className="text-xs opacity-60 block mt-1">
                  en {storePayments.length} pago{storePayments.length !== 1 ? 's' : ''} asentados
                </span>
              </div>
            </div>

            {/* Cabecera de la sección con botón registrar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)]">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#CA8A04] dark:text-[#FACC15]" />
                  <span>Libro de Cobros y Comprobantes de Suscripción</span>
                </h3>
                <p className="text-xs opacity-70 mt-0.5">
                  Registra renovaciones, transferencias bancarias o pagos en mano de este cliente.
                </p>
              </div>

              {!showNewPaymentForm && (
                <button
                  type="button"
                  onClick={() => setShowNewPaymentForm(true)}
                  className="min-h-[44px] px-5 rounded-xl bg-[#CA8A04] hover:bg-[#A16207] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Nuevo Cobro</span>
                </button>
              )}
            </div>

            {/* Formulario para Asentar Nuevo Cobro */}
            {showNewPaymentForm && (
              <form
                onSubmit={handleCreatePayment}
                className="p-6 rounded-2xl border-2 border-amber-400/40 bg-amber-400/[0.03] space-y-5 animate-in fade-in"
              >
                <div className="flex items-center justify-between border-b border-amber-400/20 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      Asentar Pago y Renovar Período
                    </h4>
                    <p className="text-xs opacity-70">
                      El sistema actualizará automáticamente la fecha de vencimiento al período abonado.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewPaymentForm(false)}
                    className="p-2 rounded-xl opacity-60 hover:opacity-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block font-medium mb-1.5 opacity-80">Monto Abonado ($ ARS)</label>
                    <input
                      type="number"
                      required
                      value={paymentMonto}
                      onChange={(e) => setPaymentMonto(Number(e.target.value))}
                      placeholder="0"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1.5 opacity-80">Método de Cobro</label>
                    <select
                      value={paymentMetodo}
                      onChange={(e) => setPaymentMetodo(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="transferencia">Transferencia bancaria</option>
                      <option value="efectivo">Efectivo / En mano</option>
                      <option value="mercadopago">Mercado Pago</option>
                      <option value="debito_automatico">Débito automático</option>
                      <option value="otro">Otro acuerdo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium mb-1.5 opacity-80">Fecha de Cobro Real</label>
                    <input
                      type="date"
                      required
                      value={paymentFecha}
                      onChange={(e) => setPaymentFecha(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1.5 opacity-80">
                      Nuevo Vencimiento (Hasta)
                    </label>
                    <input
                      type="date"
                      required
                      value={paymentPeriodoHasta}
                      onChange={(e) => setPaymentPeriodoHasta(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="block font-medium mb-1.5 opacity-80">
                      Detalle del Comprobante / Referencia
                    </label>
                    <input
                      type="text"
                      value={paymentNotas}
                      onChange={(e) => setPaymentNotas(e.target.value)}
                      placeholder="Ej. Transferencia Banco Santander comprobante #98231"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-amber-400/20">
                  <button
                    type="button"
                    onClick={() => setShowNewPaymentForm(false)}
                    className="min-h-[44px] px-4 rounded-xl border border-[var(--color-borde)] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingPayment}
                    className="min-h-[44px] px-6 rounded-xl bg-[#CA8A04] hover:bg-[#A16207] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {savingPayment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Guardar Cobro y Actualizar Vencimiento</span>
                  </button>
                </div>
              </form>
            )}

            {/* Listado Histórico de Pagos */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] space-y-4 shadow-2xs">
              <h4 className="font-semibold text-sm">Historial de Transacciones Registradas</h4>

              {loadingPayments ? (
                <div className="py-12 text-center text-xs opacity-60 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  <span>Cargando historial de pagos...</span>
                </div>
              ) : storePayments.length === 0 ? (
                <div className="py-12 text-center rounded-xl border border-dashed border-[var(--color-borde)] text-xs opacity-60 space-y-2">
                  <CreditCard className="w-8 h-8 mx-auto opacity-30 text-[#CA8A04]" />
                  <p className="font-semibold text-sm">Sin pagos registrados aún</p>
                  <p>Utiliza el botón &quot;Registrar Nuevo Cobro&quot; para asentar el primer pago de esta tienda.</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-borde)]">
                  {storePayments.map((p) => (
                    <div
                      key={p.id}
                      className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-bold text-base text-emerald-600 dark:text-emerald-400">
                            {formatMoney(Number(p.monto) || 0)}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 font-semibold uppercase">
                            {p.metodo_pago || 'Pago'}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-70">
                          Período cubierto: {p.periodo_desde} al {p.periodo_hasta}
                        </p>
                        {p.notas && (
                          <p className="text-[11px] opacity-80 italic">&ldquo;{p.notas}&rdquo;</p>
                        )}
                      </div>

                      <div className="sm:text-right shrink-0 opacity-70">
                        <span className="text-[11px] block">Cobrado el: {p.fecha_pago}</span>
                        {p.registrado_por && (
                          <span className="text-[10px] opacity-60 block truncate max-w-[200px]">
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

        {/* ===================================================================
            PESTAÑA 3: MÉTRICAS Y RENDIMIENTO EN VIVO
            =================================================================== */}
        {activeTab === 'metricas' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)]">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#CA8A04] dark:text-[#FACC15]" />
                <span>Rendimiento Comercial y Salud del Taller</span>
              </h3>
              <p className="text-xs opacity-70 mt-0.5">
                Datos consolidados en tiempo real para <strong>{store.nombre}</strong>.
              </p>
            </div>

            {loadingMetrics ? (
              <div className="py-16 text-center text-xs opacity-60 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                <span>Calculando métricas de la tienda...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-2xs space-y-1.5">
                  <span className="text-xs uppercase font-semibold opacity-60 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <span>Ventas Brutas de la Tienda</span>
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 block">
                    {formatMoney(storeMetrics?.totalSales || 0)}
                  </span>
                  <span className="text-xs opacity-60 block">facturación acumulada en órdenes</span>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-2xs space-y-1.5">
                  <span className="text-xs uppercase font-semibold opacity-60 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-blue-500" />
                    <span>Pedidos Totales Recibidos</span>
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 block">
                    {storeMetrics?.totalOrders || 0}
                  </span>
                  <span className="text-xs opacity-60 block">órdenes procesadas por el maker</span>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-2xs space-y-1.5">
                  <span className="text-xs uppercase font-semibold opacity-60 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-purple-500" />
                    <span>Clientes Registrados en CRM</span>
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 block">
                    {storeMetrics?.totalCustomers || 0}
                  </span>
                  <span className="text-xs opacity-60 block">compradores habituales</span>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-2xs space-y-2">
                  <span className="text-xs uppercase font-semibold opacity-60 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-500" />
                    <span>Piezas en Catálogo</span>
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 block">
                    {store.product_count || 0} / {store.limite_productos || 50}
                  </span>
                  {/* Barra de progreso de catálogo */}
                  <div className="w-full bg-black/10 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#CA8A04] dark:bg-[#FACC15] h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(((store.product_count || 0) / (store.limite_productos || 50)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] opacity-60 block">
                    {Math.round(((store.product_count || 0) / (store.limite_productos || 50)) * 100)}% del límite utilizado
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-2xs space-y-1.5">
                  <span className="text-xs uppercase font-semibold opacity-60 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Colaboradores del Taller</span>
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 block">
                    {storeMetrics?.totalCollaborators || 0}
                  </span>
                  <span className="text-xs opacity-60 block">cuentas con acceso secundario</span>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-2xs space-y-1.5">
                  <span className="text-xs uppercase font-semibold opacity-60 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-amber-500" />
                    <span>Reseñas Públicas</span>
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 block">
                    {storeMetrics?.totalReviews || 0}
                  </span>
                  <span className="text-xs opacity-60 block">calificaciones de productos</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            PESTAÑA 4: MAKER Y DATOS DE CONTACTO
            =================================================================== */}
        {activeTab === 'contacto' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tarjeta de Contacto Directo */}
              <div className="p-6 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] space-y-5 shadow-2xs">
                <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--color-borde)]">
                  <Users className="w-5 h-5 text-[#CA8A04] dark:text-[#FACC15]" />
                  <h3 className="font-semibold text-base">Contacto Directo con el Titular</h3>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold opacity-60 block">Titular / Empresa</span>
                    <span className="font-semibold text-sm">{store.nombre}</span>
                  </div>

                  <div className="pt-3 border-t border-[var(--color-borde)] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-semibold opacity-60 block">Email Administrativo</span>
                      <span className="font-mono text-xs">{store.admin_email}</span>
                    </div>
                    <a
                      href={`mailto:${store.admin_email}`}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Enviar Correo</span>
                    </a>
                  </div>

                  {store.whatsapp_numero && (
                    <div className="pt-3 border-t border-[var(--color-borde)] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-semibold opacity-60 block">WhatsApp Registrado</span>
                        <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                          {store.whatsapp_numero}
                        </span>
                      </div>
                      <a
                        href={`https://wa.me/${store.whatsapp_numero.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `Hola ${store.nombre}, te contacto desde el equipo de soporte de Portalmaker respecto a tu tienda...`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[40px] px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5" />
                        <span>Abrir WhatsApp</span>
                      </a>
                    </div>
                  )}

                  <div className="pt-3 border-t border-[var(--color-borde)]">
                    <span className="text-[10px] uppercase font-semibold opacity-60 block">Fecha de Alta</span>
                    <span className="text-xs">
                      {store.created_at.split('T')[0]} ({subInfo.timeElapsed} en la red)
                    </span>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Accesos y Enlaces Técnicos */}
              <div className="p-6 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] space-y-5 shadow-2xs">
                <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--color-borde)]">
                  <ShieldCheck className="w-5 h-5 text-[#CA8A04] dark:text-[#FACC15]" />
                  <h3 className="font-semibold text-base">Accesos y Enlaces de Gestión</h3>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold opacity-60 block">URL de la Tienda</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-xs">{store.slug}.portalmaker.ar</span>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="text-xs font-semibold text-[#CA8A04] dark:text-[#FACC15] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--color-borde)]">
                    <span className="text-[10px] uppercase font-semibold opacity-60 block">Panel de Maker</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs opacity-70">Acceso como administrador de productos</span>
                      <Link
                        href={`/tienda/admin/productos?tenant=${store.slug}`}
                        className="text-xs font-semibold text-[#CA8A04] dark:text-[#FACC15] hover:underline flex items-center gap-1"
                      >
                        <span>Abrir Panel</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--color-borde)]">
                    <span className="text-[10px] uppercase font-semibold opacity-60 block">Identificador Único (ID)</span>
                    <span className="font-mono text-[11px] opacity-70 block mt-0.5">{store.id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            PESTAÑA 5: NOTAS INTERNAS DEL SUPERADMIN
            =================================================================== */}
        {activeTab === 'notas' && (
          <div className="p-6 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] space-y-5 shadow-2xs">
            <div>
              <h3 className="font-semibold text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#CA8A04] dark:text-[#FACC15]" />
                <span>Anotaciones Privadas de Plataforma</span>
              </h3>
              <p className="text-xs opacity-70 mt-1">
                Registra acuerdos comerciales, historial de llamadas, acuerdos de pago o requerimientos especiales. Solo visible para platform admins.
              </p>
            </div>

            <textarea
              rows={10}
              value={subEditForm.notas_admin || ''}
              onChange={(e) => setSubEditForm({ ...subEditForm, notas_admin: e.target.value })}
              placeholder="Escribe aquí las notas internas sobre esta tienda o cliente maker..."
              className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 leading-relaxed font-sans"
            />

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveNotes}
                className="min-h-[44px] px-6 rounded-xl bg-[#CA8A04] hover:bg-[#A16207] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Notas Internas</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* =====================================================================
          FOOTER DE NAVEGACIÓN RÁPIDA
          ===================================================================== */}
      <footer className="border-t border-[var(--color-borde)] bg-[var(--color-superficie)] py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs opacity-70">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[40px] px-4 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 font-semibold flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a todas las tiendas</span>
          </button>
          <span>Portalmaker Superadmin — Tienda ID: {store.id}</span>
        </div>
      </footer>
    </div>
  )
}
