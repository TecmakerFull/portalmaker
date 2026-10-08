// =============================================================================
// PORTALMAKER — Gestión de Cuentas, Clientes y Suscripciones (Superadmin)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
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
  plan?: string | null
  precio_mensual?: number | null
  estado_pago?: string | null
  notas_admin?: string | null
  suscripcion_activa: boolean
  fecha_inicio_suscripcion: string | null
  fecha_proximo_vencimiento: string | null
  dias_gracia: number | null
  created_at: string
  product_count?: number
}

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  starter: { label: 'Starter', color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50' },
  maker_pro: { label: 'Maker Pro', color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50' },
  enterprise: { label: 'Enterprise', color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50' },
  bonificado: { label: 'Bonificado', color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50' },
}

const ESTADO_PAGO_LABELS: Record<string, { label: string; color: string }> = {
  al_dia: { label: 'Al Día', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50' },
  pendiente: { label: 'Pendiente', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50' },
  bonificado: { label: 'Bonificado', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50' },
  gracia: { label: 'En Gracia', color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/50' },
  vencido: { label: 'Vencido', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50' },
}

export default function SuperadminTiendasList({ initialStores }: { initialStores: SuperadminStoreItem[] }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [stores, setStores] = useState<SuperadminStoreItem[]>(initialStores)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'activa' | 'por_vencer' | 'en_gracia' | 'vencida' | 'pausada'>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Estado del Modal de Edición de Cuenta
  const [editingStore, setEditingStore] = useState<SuperadminStoreItem | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState<Partial<SuperadminStoreItem>>({})

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
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
        statusLabel = `Al día (${daysRemaining}d rest.)`
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
          statusLabel = `Vencida (${daysOverdue}d atraso)`
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

  // Alternar suscripción activa / pausada
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
      showToast(nextState ? 'Tienda activada exitosamente' : 'Tienda pausada')
    } catch (err) {
      alert('Error al actualizar la suscripción: ' + (err as Error)?.message)
    } finally {
      setLoadingId(null)
    }
  }

  // Extender suscripción (+30 días)
  const extendSubscriptionMonth = async (store: SuperadminStoreItem) => {
    setLoadingId(store.id)
    try {
      const currentDueDate = store.fecha_proximo_vencimiento
        ? new Date(store.fecha_proximo_vencimiento + 'T00:00:00')
        : new Date()

      // Si ya estaba vencida, partimos de hoy
      const baseDate = currentDueDate < new Date() ? new Date() : currentDueDate
      const newDueDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
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

      setStores((prev) =>
        prev.map((s) =>
          s.id === store.id
            ? {
                ...s,
                fecha_proximo_vencimiento: newDueDateStr,
                suscripcion_activa: true,
                estado_pago: 'al_dia',
              }
            : s
        )
      )
      showToast(`Suscripción extendida 30 días (hasta ${newDueDateStr})`)
    } catch (err) {
      alert('Error al extender suscripción: ' + (err as Error)?.message)
    } finally {
      setLoadingId(null)
    }
  }

  // Extender días de gracia (+7 días)
  const addGraceDays = async (store: SuperadminStoreItem) => {
    setLoadingId(store.id)
    try {
      const newGrace = (store.dias_gracia ?? 3) + 7
      const { error } = await supabase
        .from('stores')
        .update({ dias_gracia: newGrace })
        .eq('id', store.id)

      if (error) throw error

      setStores((prev) =>
        prev.map((s) => (s.id === store.id ? { ...s, dias_gracia: newGrace } : s))
      )
      showToast(`Días de gracia aumentados a ${newGrace} días`)
    } catch (err) {
      alert('Error al actualizar días de gracia: ' + (err as Error)?.message)
    } finally {
      setLoadingId(null)
    }
  }

  // Abrir Modal de Edición
  const handleOpenEdit = (store: SuperadminStoreItem) => {
    setEditingStore(store)
    setEditForm({
      nombre: store.nombre,
      slug: store.slug,
      admin_email: store.admin_email,
      whatsapp_numero: store.whatsapp_numero || '',
      plan: store.plan || 'maker_pro',
      precio_mensual: store.precio_mensual ?? 0,
      estado_pago: store.estado_pago || 'al_dia',
      fecha_inicio_suscripcion: store.fecha_inicio_suscripcion || store.created_at.split('T')[0],
      fecha_proximo_vencimiento: store.fecha_proximo_vencimiento || '',
      dias_gracia: store.dias_gracia ?? 3,
      suscripcion_activa: store.suscripcion_activa,
      notas_admin: store.notas_admin || '',
    })
  }

  // Guardar Edición de Cuenta
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStore) return
    setSavingEdit(true)

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          nombre: editForm.nombre?.trim(),
          slug: editForm.slug?.trim().toLowerCase(),
          admin_email: editForm.admin_email?.trim().toLowerCase(),
          whatsapp_numero: editForm.whatsapp_numero?.trim() || null,
          plan: editForm.plan,
          precio_mensual: Number(editForm.precio_mensual) || 0,
          estado_pago: editForm.estado_pago,
          fecha_inicio_suscripcion: editForm.fecha_inicio_suscripcion || null,
          fecha_proximo_vencimiento: editForm.fecha_proximo_vencimiento || null,
          dias_gracia: Number(editForm.dias_gracia) || 0,
          suscripcion_activa: Boolean(editForm.suscripcion_activa),
          notas_admin: editForm.notas_admin?.trim() || null,
        })
        .eq('id', editingStore.id)

      if (error) throw error

      setStores((prev) =>
        prev.map((s) => (s.id === editingStore.id ? ({ ...s, ...editForm } as SuperadminStoreItem) : s))
      )
      setEditingStore(null)
      showToast('Cuenta de cliente actualizada correctamente')
      router.refresh()
    } catch (err) {
      alert('Error al guardar datos: ' + (err as Error)?.message)
    } finally {
      setSavingEdit(false)
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
      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-[var(--color-superficie)] p-4 rounded-2xl border border-[var(--color-borde)] shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Buscador */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, subdominio, email del maker o notas..."
              className="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por Estado de Suscripción */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="all">Todos los estados ({stores.length})</option>
              <option value="activa">Al día / Activas</option>
              <option value="por_vencer">Por vencer (≤7 días)</option>
              <option value="en_gracia">En período de gracia</option>
              <option value="vencida">Vencidas / En mora</option>
              <option value="pausada">Pausadas</option>
            </select>
          </div>

          {/* Filtro por Plan */}
          <div className="sm:col-span-3">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="all">Todos los planes</option>
              <option value="maker_pro">Maker Pro</option>
              <option value="starter">Starter</option>
              <option value="enterprise">Enterprise</option>
              <option value="bonificado">Bonificado / Beta</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Cuentas */}
      {filteredStores.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[var(--color-borde)] rounded-2xl p-6">
          <Store className="w-10 h-10 mx-auto opacity-40 mb-3" />
          <h3 className="text-base font-bold">No se encontraron cuentas</h3>
          <p className="text-xs opacity-70 mt-1">
            Prueba ajustando los términos de búsqueda o los filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredStores.map((store) => {
            const subInfo = getSubscriptionInfo(store)
            const cleanPhone = store.whatsapp_numero ? store.whatsapp_numero.replace(/[^0-9]/g, '') : null
            const planMeta = PLAN_LABELS[store.plan || 'maker_pro'] || { label: store.plan || 'Maker Pro', color: 'bg-slate-100 text-slate-700' }
            const pagoMeta = ESTADO_PAGO_LABELS[store.estado_pago || 'al_dia'] || { label: store.estado_pago || 'Al Día', color: 'text-slate-600' }

            return (
              <div
                key={store.id}
                className="p-5 rounded-2xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 hover:bg-[var(--color-fondo)]/80 transition-all space-y-4"
              >
                {/* Cabecera de la Tarjeta: Identidad + Badges + Acciones Principales */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Identidad de la Tienda y Maker */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Logo o Avatar */}
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border border-[var(--color-borde)] bg-[var(--color-superficie)] flex items-center justify-center shrink-0 shadow-2xs">
                      {store.logo_url ? (
                        <img src={store.logo_url} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="font-bold text-lg text-[#CA8A04] dark:text-[#FACC15]">
                          {store.nombre.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-zinc-900 dark:text-zinc-100 truncate">
                          {store.nombre}
                        </span>

                        {/* Badge de Suscripción */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${subInfo.badgeColor}`}>
                          <span>{subInfo.statusLabel}</span>
                        </span>

                        {/* Badge de Plan */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${planMeta.color}`}>
                          <span>{planMeta.label}</span>
                        </span>

                        {/* Badge de Pago */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${pagoMeta.color}`}>
                          <span>{pagoMeta.label}</span>
                        </span>
                      </div>

                      {/* Subdominio y Contacto */}
                      <div className="flex items-center gap-2.5 text-xs opacity-75 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(store.slug)}
                          title="Copiar URL"
                          className="font-mono text-[#CA8A04] dark:text-[#FACC15] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>{store.slug}.portalmaker.ar</span>
                          {copiedSlug === store.slug ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-60" />
                          )}
                        </button>
                        <span>•</span>
                        <a
                          href={`mailto:${store.admin_email}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          <Mail className="w-3 h-3 opacity-60" />
                          <span>{store.admin_email}</span>
                        </a>
                        {cleanPhone && (
                          <>
                            <span>•</span>
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                            >
                              <WhatsAppIcon className="w-3 h-3" />
                              <span>{store.whatsapp_numero}</span>
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones Rápidas de la Cabecera */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* Botón Editar Cuenta */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(store)}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-xs font-semibold flex items-center gap-1.5 hover:bg-amber-400/10 hover:text-amber-700 dark:hover:text-amber-300 transition-all cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Gestionar Cuenta</span>
                    </button>

                    {/* Botón Pausar / Activar */}
                    <button
                      type="button"
                      disabled={loadingId === store.id}
                      onClick={() => toggleSuscripcion(store.id, store.suscripcion_activa)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
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
                      <span>{store.suscripcion_activa ? 'Pausar' : 'Activar'}</span>
                    </button>

                    {/* Acceso a Admin de Tienda */}
                    <Link
                      href={`/tienda/admin/productos?tenant=${store.slug}`}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-xs font-semibold flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                    >
                      <Package className="w-3.5 h-3.5 text-[#CA8A04] dark:text-[#FACC15]" />
                      <span>Admin Tienda</span>
                    </Link>

                    {/* Ver Tienda Pública */}
                    <Link
                      href={`/tienda?tenant=${store.slug}`}
                      target="_blank"
                      className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-xs font-semibold flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                      <span>Visitar</span>
                    </Link>
                  </div>
                </div>

                {/* Fila de Datos Clave: Tiempos, Vencimiento, Días de Gracia y Notas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-[var(--color-borde)] text-xs">
                  {/* 1. Antigüedad y Fecha de Inicio */}
                  <div className="bg-[var(--color-superficie)] p-3 rounded-xl border border-[var(--color-borde)]/80 space-y-1">
                    <span className="text-[10px] uppercase font-semibold opacity-60 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Inicio & Antigüedad</span>
                    </span>
                    <div className="font-bold">
                      {store.fecha_inicio_suscripcion || store.created_at.split('T')[0]}
                    </div>
                    <p className="text-[11px] opacity-70">
                      Hace {subInfo.timeElapsed} en la plataforma
                    </p>
                  </div>

                  {/* 2. Próximo Vencimiento */}
                  <div className="bg-[var(--color-superficie)] p-3 rounded-xl border border-[var(--color-borde)]/80 space-y-1">
                    <span className="text-[10px] uppercase font-semibold opacity-60 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Próximo Vencimiento</span>
                    </span>
                    <div className="font-bold flex items-center justify-between">
                      <span>{store.fecha_proximo_vencimiento || 'Sin fecha fijada'}</span>
                      <button
                        type="button"
                        onClick={() => extendSubscriptionMonth(store)}
                        title="Sumar +30 días"
                        className="text-[10px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-800 dark:text-amber-300 font-bold hover:bg-amber-400/40 transition-colors"
                      >
                        +1 Mes
                      </button>
                    </div>
                    <p className="text-[11px] opacity-70">
                      {subInfo.daysRemaining !== null ? (
                        subInfo.daysRemaining > 0 ? (
                          `${subInfo.daysRemaining} días restantes`
                        ) : subInfo.daysRemaining === 0 ? (
                          'Vence hoy'
                        ) : (
                          `Venció hace ${Math.abs(subInfo.daysRemaining)} días`
                        )
                      ) : (
                        'Renovación manual'
                      )}
                    </p>
                  </div>

                  {/* 3. Días de Gracia */}
                  <div className="bg-[var(--color-superficie)] p-3 rounded-xl border border-[var(--color-borde)]/80 space-y-1">
                    <span className="text-[10px] uppercase font-semibold opacity-60 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Tolerancia / Días Gracia</span>
                    </span>
                    <div className="font-bold flex items-center justify-between">
                      <span>{store.dias_gracia ?? 3} días de gracia</span>
                      <button
                        type="button"
                        onClick={() => addGraceDays(store)}
                        title="Sumar +7 días de gracia"
                        className="text-[10px] px-2 py-0.5 rounded bg-orange-400/20 text-orange-800 dark:text-orange-300 font-bold hover:bg-orange-400/40 transition-colors"
                      >
                        +7 Días
                      </button>
                    </div>
                    <p className="text-[11px] opacity-70">
                      Días antes de pausar tras vencimiento
                    </p>
                  </div>

                  {/* 4. Precio Pactado & Productos */}
                  <div className="bg-[var(--color-superficie)] p-3 rounded-xl border border-[var(--color-borde)]/80 space-y-1">
                    <span className="text-[10px] uppercase font-semibold opacity-60 flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      <span>Precio Mensual & Catálogo</span>
                    </span>
                    <div className="font-bold text-[#CA8A04] dark:text-[#FACC15]">
                      ${(store.precio_mensual ?? 0).toLocaleString('es-AR')} / mes
                    </div>
                    <p className="text-[11px] opacity-70">
                      {store.product_count !== undefined
                        ? `${store.product_count} productos cargados`
                        : 'Catálogo activo'}
                    </p>
                  </div>
                </div>

                {/* Notas Internas del Admin (si existen) */}
                {store.notas_admin && (
                  <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-xs flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-900 dark:text-amber-300 mr-1">Notas internas:</span>
                      <span className="opacity-85">{store.notas_admin}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL DE EDICIÓN COMPLETA DE CUENTA */}
      {editingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-2xl space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-[var(--color-borde)] pb-4">
              <div>
                <h3 className="text-lg font-bold font-[var(--font-portal-heading)]">
                  Gestionar Cuenta: {editingStore.nombre}
                </h3>
                <p className="text-xs opacity-70 mt-0.5">
                  Modifica plan, fechas de cobro, tolerancia y notas de este cliente
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStore(null)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 opacity-60 hover:opacity-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Datos Básicos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold block mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    required
                    value={editForm.nombre || ''}
                    onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">Subdominio (Slug)</label>
                  <input
                    type="text"
                    required
                    value={editForm.slug || ''}
                    onChange={(e) => setEditForm({ ...editForm, slug: e.target.value.toLowerCase().trim() })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">Email del Maker (Dueño)</label>
                  <input
                    type="email"
                    required
                    value={editForm.admin_email || ''}
                    onChange={(e) => setEditForm({ ...editForm, admin_email: e.target.value })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">WhatsApp de Contacto</label>
                  <input
                    type="text"
                    placeholder="Ej: 5491123456789"
                    value={editForm.whatsapp_numero || ''}
                    onChange={(e) => setEditForm({ ...editForm, whatsapp_numero: e.target.value })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Plan y Cobro */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-[var(--color-borde)]">
                <div>
                  <label className="text-xs font-semibold block mb-1">Plan Contratado</label>
                  <select
                    value={editForm.plan || 'maker_pro'}
                    onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium cursor-pointer"
                  >
                    <option value="maker_pro">Maker Pro</option>
                    <option value="starter">Starter</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="bonificado">Bonificado / Beta</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">Precio Mensual ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editForm.precio_mensual ?? 0}
                    onChange={(e) => setEditForm({ ...editForm, precio_mensual: parseFloat(e.target.value) || 0 })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">Estado del Cobro</label>
                  <select
                    value={editForm.estado_pago || 'al_dia'}
                    onChange={(e) => setEditForm({ ...editForm, estado_pago: e.target.value })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium cursor-pointer"
                  >
                    <option value="al_dia">Al Día</option>
                    <option value="pendiente">Pendiente de Pago</option>
                    <option value="bonificado">Bonificado</option>
                    <option value="gracia">En Período de Gracia</option>
                    <option value="vencido">Vencido</option>
                  </select>
                </div>
              </div>

              {/* Fechas de Suscripción */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-[var(--color-borde)]">
                <div>
                  <label className="text-xs font-semibold block mb-1">Fecha de Inicio</label>
                  <input
                    type="date"
                    value={editForm.fecha_inicio_suscripcion || ''}
                    onChange={(e) => setEditForm({ ...editForm, fecha_inicio_suscripcion: e.target.value })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">Próximo Vencimiento</label>
                  <input
                    type="date"
                    value={editForm.fecha_proximo_vencimiento || ''}
                    onChange={(e) => setEditForm({ ...editForm, fecha_proximo_vencimiento: e.target.value })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">Días de Gracia (Tolerancia)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={editForm.dias_gracia ?? 3}
                    onChange={(e) => setEditForm({ ...editForm, dias_gracia: parseInt(e.target.value) || 0 })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Notas Internas del Superadmin */}
              <div className="pt-2 border-t border-[var(--color-borde)]">
                <label className="text-xs font-semibold block mb-1">
                  Notas Internas del Superadmin (Solo visible para ti)
                </label>
                <textarea
                  rows={3}
                  placeholder="Anotaciones sobre acuerdos de pago, comprobantes transferidos, pedidos del cliente..."
                  value={editForm.notas_admin || ''}
                  onChange={(e) => setEditForm({ ...editForm, notas_admin: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs resize-none"
                />
              </div>

              {/* Toggle de Suscripción Activa */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
                <div>
                  <span className="text-xs font-bold block">Tienda Habilitada en la Red</span>
                  <span className="text-[11px] opacity-70">
                    Si se desactiva, la tienda pública y el panel mostrarán aviso de mantenimiento / pausa
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(editForm.suscripcion_activa)}
                  onChange={(e) => setEditForm({ ...editForm, suscripcion_activa: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded border-slate-300 cursor-pointer"
                />
              </div>

              {/* Botones del Modal */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-borde)]">
                <button
                  type="button"
                  onClick={() => setEditingStore(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{ color: '#1F2937' }}
                  className="min-h-[44px] px-6 py-2 rounded-xl bg-[#FACC15] text-[#1F2937] text-xs font-bold hover:bg-[#eab308] flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {savingEdit ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
                  ) : (
                    <Save className="w-4 h-4 text-[#1F2937]" />
                  )}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Flotante de Confirmación */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#1F2937] text-white text-xs sm:text-sm font-medium shadow-2xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
