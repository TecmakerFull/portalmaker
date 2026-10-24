// =============================================================================
// PORTALMAKER — Gestor de Clientes & CRM (Client Component)
// Visualiza a los clientes registrados, historial de pedidos, reseñas
// y permite promoverlos a Colaboradores de la tienda.
// =============================================================================

'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Store, StoreCustomer, StoreCollaborator, ProductReview } from '@/types/database'
import {
  Users,
  Search,
  ShoppingBag,
  Star,
  UserCheck,
  UserPlus,
  Eye,
  X,
  Phone,
  Mail,
  Clock,
  Calendar,
  Shield,
  Loader2,
  ExternalLink,
  MessageCircle,
} from 'lucide-react'
import { AdminPageHeader } from '../components/admin-page-header'

interface ClientesManagerProps {
  store: Store
  initialCustomers: StoreCustomer[]
  initialOrders: any[]
  initialReviews: ProductReview[]
  initialCollaborators: StoreCollaborator[]
  tenantQuery: string
}

export default function ClientesManager({
  store,
  initialCustomers,
  initialOrders,
  initialReviews,
  initialCollaborators,
  tenantQuery,
}: ClientesManagerProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [customers, setCustomers] = useState<StoreCustomer[]>(initialCustomers)
  const [collaborators, setCollaborators] = useState<StoreCollaborator[]>(initialCollaborators)
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<StoreCustomer | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  // Pestaña activa seleccionada (por tarjeta o pill)
  type ActiveTab = 'clientes' | 'pedidos' | 'resenas' | 'colaboradores'
  const [activeTab, setActiveTab] = useState<ActiveTab>('clientes')

  // Formateador de moneda en pesos argentinos
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Mapa de colaboradores por email en minúsculas
  const collabMap = useMemo(() => {
    const map = new Map<string, StoreCollaborator>()
    collaborators.forEach((c) => map.set(c.email.toLowerCase(), c))
    return map
  }, [collaborators])

  // Filtrado de clientes
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(
      (c) =>
        c.email.toLowerCase().includes(q) ||
        (c.nombre && c.nombre.toLowerCase().includes(q)) ||
        (c.telefono && c.telefono.includes(q))
    )
  }, [customers, search])

  // Filtrado de pedidos por buscador
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return initialOrders
    return initialOrders.filter(
      (o: any) =>
        (o.id && o.id.toLowerCase().includes(q)) ||
        (o.email_comprador && o.email_comprador.toLowerCase().includes(q)) ||
        (o.nombre_comprador && o.nombre_comprador.toLowerCase().includes(q)) ||
        (o.telefono_comprador && o.telefono_comprador.includes(q))
    )
  }, [initialOrders, search])

  // Filtrado de reseñas por buscador
  const filteredReviews = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return initialReviews
    return initialReviews.filter(
      (r: any) =>
        (r.user_name && r.user_name.toLowerCase().includes(q)) ||
        (r.user_email && r.user_email.toLowerCase().includes(q)) ||
        (r.comentario && r.comentario.toLowerCase().includes(q))
    )
  }, [initialReviews, search])

  // Filtrado de colaboradores por buscador
  const filteredCollaborators = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return collaborators
    return collaborators.filter((c: any) => c.email && c.email.toLowerCase().includes(q))
  }, [collaborators, search])

  // Badges de estados para pedidos
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'nuevo':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
      case 'preparando':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
      case 'enviado':
        return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20'
      case 'entregado':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
      case 'cancelado':
        return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
      default:
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'
    }
  }

  const getPagoBadge = (estado: string) => {
    switch (estado) {
      case 'aprobado':
      case 'pagado':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
      case 'pendiente':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
      case 'rechazado':
        return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
      default:
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'
    }
  }

  // Métricas agregadas por cliente
  const getCustomerMetrics = (email: string) => {
    const clean = email.toLowerCase()
    const orders = initialOrders.filter((o) => o.email_comprador?.toLowerCase() === clean)
    const totalSpent = orders.reduce((acc, o) => acc + (Number(o.total) || 0), 0)
    const reviews = initialReviews.filter((r) => r.user_email?.toLowerCase() === clean)
    return {
      ordersCount: orders.length,
      totalSpent,
      reviewsCount: reviews.length,
      orders,
      reviews,
    }
  }

  // Alternar estado de colaborador (Hacer / Quitar colaborador)
  const handleToggleCollaborator = async (customer: StoreCustomer) => {
    const cleanEmail = customer.email.toLowerCase()
    setLoadingAction(customer.id)

    try {
      const existingCollab = collabMap.get(cleanEmail)

      if (existingCollab) {
        // Quitar de colaboradores
        const { error } = await supabase
          .from('store_collaborators')
          .delete()
          .eq('id', existingCollab.id)

        if (error) throw error
        setCollaborators(collaborators.filter((c) => c.id !== existingCollab.id))
      } else {
        // Promover a colaborador de tienda
        const newCollab = {
          store_id: store.id,
          email: cleanEmail,
          rol: 'colaborador' as const,
          estado: 'activo' as const,
          invitado_por: store.admin_email,
        }

        const { data, error } = await supabase
          .from('store_collaborators')
          .insert([newCollab])
          .select()
          .single()

        if (error) throw error
        setCollaborators([...collaborators, data as StoreCollaborator])
      }
      router.refresh()
    } catch (err: any) {
      console.error('Error al cambiar rol del cliente:', err)
      alert(err.message || 'No se pudo actualizar el rol.')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Cabecera */}
      <AdminPageHeader
        title="Clientes & CRM"
        description="Usuarios registrados en tu tienda, historial de compras, reseñas y permisos de equipo."
        icon={Users}
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === 'pedidos'
                  ? 'Buscar orden, email o cliente...'
                  : activeTab === 'resenas'
                  ? 'Buscar en comentarios...'
                  : 'Buscar email, nombre o teléfono...'
              }
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
            />
          </div>
        }
      />

      {/* Resumen de Métricas (Clickeables como pestañas interactivas) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* 1. Clientes Registrados */}
        <button
          type="button"
          onClick={() => setActiveTab('clientes')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'clientes'
              ? 'border-amber-400 bg-amber-400/10 shadow-xs ring-2 ring-amber-400/30'
              : 'border-[var(--color-borde)] bg-[var(--color-superficie)] hover:border-black/20 dark:hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium opacity-60">Clientes Registrados</p>
            <Users className="w-4 h-4 opacity-40 text-[var(--color-texto)]" />
          </div>
          <p className="text-2xl font-bold mt-1 text-[var(--color-texto)]">{customers.length}</p>
          <span className="text-[10px] opacity-60 block mt-0.5">
            {activeTab === 'clientes' ? 'Mostrando abajo' : 'Clic para ver clientes'}
          </span>
        </button>

        {/* 2. Pedidos Totales */}
        <button
          type="button"
          onClick={() => setActiveTab('pedidos')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'pedidos'
              ? 'border-amber-400 bg-amber-400/10 shadow-xs ring-2 ring-amber-400/30'
              : 'border-[var(--color-borde)] bg-[var(--color-superficie)] hover:border-black/20 dark:hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium opacity-60">Pedidos Totales</p>
            <ShoppingBag className="w-4 h-4 opacity-40 text-[var(--color-texto)]" />
          </div>
          <p className="text-2xl font-bold mt-1 text-[var(--color-texto)]">{initialOrders.length}</p>
          <span className="text-[10px] opacity-60 block mt-0.5">
            {activeTab === 'pedidos' ? 'Mostrando abajo' : 'Clic para ver pedidos'}
          </span>
        </button>

        {/* 3. Reseñas Dejadas */}
        <button
          type="button"
          onClick={() => setActiveTab('resenas')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'resenas'
              ? 'border-amber-400 bg-amber-400/10 shadow-xs ring-2 ring-amber-400/30'
              : 'border-[var(--color-borde)] bg-[var(--color-superficie)] hover:border-black/20 dark:hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium opacity-60">Reseñas Dejadas</p>
            <Star className="w-4 h-4 opacity-40 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-[var(--color-texto)]">{initialReviews.length}</p>
          <span className="text-[10px] opacity-60 block mt-0.5">
            {activeTab === 'resenas' ? 'Mostrando abajo' : 'Clic para ver reseñas'}
          </span>
        </button>

        {/* 4. Equipo / Colaboradores */}
        <button
          type="button"
          onClick={() => setActiveTab('colaboradores')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'colaboradores'
              ? 'border-amber-400 bg-amber-400/10 shadow-xs ring-2 ring-amber-400/30'
              : 'border-[var(--color-borde)] bg-[var(--color-superficie)] hover:border-black/20 dark:hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium opacity-60">Equipo / Colaboradores</p>
            <Shield className="w-4 h-4 text-amber-500 opacity-60" />
          </div>
          <p className="text-2xl font-bold mt-1 text-amber-500">{collaborators.length}</p>
          <span className="text-[10px] opacity-60 block mt-0.5">
            {activeTab === 'colaboradores' ? 'Mostrando abajo' : 'Clic para ver equipo'}
          </span>
        </button>
      </div>

      {/* Selector de pestañas / sección activa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-borde)] pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('clientes')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'clientes'
                ? 'bg-amber-400 text-[#1F2937] shadow-xs font-bold'
                : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100 text-[var(--color-texto)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Clientes ({customers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pedidos')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'pedidos'
                ? 'bg-amber-400 text-[#1F2937] shadow-xs font-bold'
                : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100 text-[var(--color-texto)]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Pedidos ({initialOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resenas')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'resenas'
                ? 'bg-amber-400 text-[#1F2937] shadow-xs font-bold'
                : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100 text-[var(--color-texto)]'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Reseñas ({initialReviews.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('colaboradores')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'colaboradores'
                ? 'bg-amber-400 text-[#1F2937] shadow-xs font-bold'
                : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100 text-[var(--color-texto)]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Equipo ({collaborators.length})</span>
          </button>
        </div>

        {activeTab === 'pedidos' && (
          <Link
            href={`/tienda/admin/ventas${tenantQuery}`}
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Gestionar en Ventas & Pedidos</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Contenido según pestaña activa */}
      {activeTab === 'pedidos' ? (
        /* TAB: PEDIDOS DE LA TIENDA */
        <div className="rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] shadow-xs overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-xs opacity-60 space-y-2">
              <ShoppingBag className="w-8 h-8 mx-auto opacity-30 text-amber-500" />
              <p className="font-semibold text-sm">No se encontraron pedidos</p>
              <p>Los pedidos que realicen tus compradores aparecerán automáticamente aquí.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-[var(--color-borde)] text-[11px] font-semibold uppercase tracking-wider opacity-70">
                  <tr>
                    <th className="py-3 px-4">Pedido / Fecha</th>
                    <th className="py-3 px-4">Comprador</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Estado Pedido</th>
                    <th className="py-3 px-4">Estado Pago</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-borde)]">
                  {filteredOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold font-mono text-[var(--color-texto)]">
                          #{order.id.slice(0, 8)}
                        </div>
                        <div className="text-xs opacity-60 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 opacity-60" />
                          <span>{new Date(order.created_at).toLocaleDateString('es-AR')}</span>
                          <span className="opacity-40">·</span>
                          <span>{new Date(order.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[var(--color-texto)]">
                          {order.nombre_comprador || 'Comprador sin nombre'}
                        </div>
                        {order.email_comprador && (
                          <div className="text-xs opacity-60 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 opacity-60" />
                            <span>{order.email_comprador}</span>
                          </div>
                        )}
                        {order.telefono_comprador && (
                          <div className="text-xs opacity-60 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 opacity-60" />
                            <span>{order.telefono_comprador}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-sm text-[var(--color-primario)]">
                          {formatMoney(Number(order.total) || 0)}
                        </div>
                        {Array.isArray(order.items) && (
                          <div className="text-[10px] opacity-60">
                            {order.items.length} {order.items.length === 1 ? 'producto' : 'productos'}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${getEstadoBadge(order.estado_pedido)}`}>
                          {order.estado_pedido || 'nuevo'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${getPagoBadge(order.estado_pago)}`}>
                          {order.estado_pago || 'pendiente'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="min-h-[44px] px-3 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Detalle</span>
                          </button>
                          {order.telefono_comprador && (
                            <a
                              href={`https://wa.me/${order.telefono_comprador.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Contactar por WhatsApp"
                              className="min-h-[44px] min-w-[44px] rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'resenas' ? (
        /* TAB: RESEÑAS DE PRODUCTOS */
        <div className="rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] shadow-xs overflow-hidden">
          {filteredReviews.length === 0 ? (
            <div className="p-12 text-center text-xs opacity-60 space-y-2">
              <Star className="w-8 h-8 mx-auto opacity-30 text-amber-500" />
              <p className="font-semibold text-sm">No hay opiniones publicadas todavía</p>
              <p>Las reseñas y calificaciones que dejen los compradores en la ficha de producto se listarán aquí.</p>
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-3">
              {filteredReviews.map((r: any) => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl border border-[var(--color-borde)] bg-black/[0.01] dark:bg-white/[0.01] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }`}
                        />
                      ))}
                      <span className="font-bold ml-1 text-xs">{r.rating}/5</span>
                    </div>
                    <span className="text-[11px] opacity-60">
                      {new Date(r.created_at).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--color-texto)] italic">&ldquo;{r.comentario}&rdquo;</p>
                  <div className="text-xs opacity-70 flex items-center gap-2">
                    <span className="font-semibold">{r.user_name || 'Comprador anónimo'}</span>
                    <span>·</span>
                    <span>{r.user_email}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'colaboradores' ? (
        /* TAB: EQUIPO Y COLABORADORES */
        <div className="rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] shadow-xs overflow-hidden">
          {filteredCollaborators.length === 0 ? (
            <div className="p-12 text-center text-xs opacity-60 space-y-2">
              <Shield className="w-8 h-8 mx-auto opacity-30 text-amber-500" />
              <p className="font-semibold text-sm">No hay colaboradores asignados</p>
              <p>Puedes promover a tus clientes registrados a colaboradores tocando &quot;Hacer Colaborador&quot; en la pestaña Clientes.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-[var(--color-borde)] text-[11px] font-semibold uppercase tracking-wider opacity-70">
                  <tr>
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Rol Asignado</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-borde)]">
                  {filteredCollaborators.map((c: any) => (
                    <tr key={c.id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[var(--color-texto)]">{c.email}</div>
                        <div className="text-[11px] opacity-60">
                          Agregado el {new Date(c.created_at).toLocaleDateString('es-AR')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-bold capitalize text-amber-600 dark:text-amber-400">
                          {c.rol || 'Colaborador'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          {c.estado || 'Activo'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-xs opacity-60">Acceso Habilitado</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* TAB: CLIENTES REGISTRADOS */
        <div className="rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] shadow-xs overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-xs opacity-60 space-y-2">
            <Users className="w-8 h-8 mx-auto opacity-30" />
            <p className="font-semibold text-sm">No se encontraron clientes registrados</p>
            <p>Los visitantes que inicien sesión en tu tienda aparecerán automáticamente aquí.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-[var(--color-borde)] text-[11px] font-semibold uppercase tracking-wider opacity-70">
                <tr>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Pedidos & Gasto</th>
                  <th className="py-3 px-4">Reseñas</th>
                  <th className="py-3 px-4">Último Ingreso</th>
                  <th className="py-3 px-4">Rol en Tienda</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-borde)]">
                {filteredCustomers.map((cust) => {
                  const metrics = getCustomerMetrics(cust.email)
                  const isCollab = collabMap.has(cust.email.toLowerCase())
                  const isOwner = cust.email.toLowerCase() === store.admin_email.toLowerCase()

                  return (
                    <tr key={cust.id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[var(--color-texto)]">
                          {cust.nombre || 'Cliente sin nombre'}
                        </div>
                        <div className="text-xs opacity-60 flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3 h-3 opacity-60" />
                          <span>{cust.email}</span>
                        </div>
                        {cust.telefono && (
                          <div className="text-xs opacity-60 flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 opacity-60" />
                            <span>{cust.telefono}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[var(--color-texto)]">
                          {metrics.ordersCount} pedidos
                        </div>
                        <div className="text-xs font-mono text-[var(--color-primario)]">
                          {formatMoney(metrics.totalSpent)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-semibold">{metrics.reviewsCount}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs opacity-75">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 opacity-50" />
                          <span>{new Date(cust.ultimo_login).toLocaleDateString('es-AR')}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isOwner ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--color-primario)]/20 text-[var(--color-primario)]">
                            Propietario
                          </span>
                        ) : isCollab ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            Colaborador
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 opacity-80">
                            Cliente
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Botón Ver Historial */}
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(cust)}
                            title="Ver historial detallado"
                            className="min-h-[44px] px-3 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Historial</span>
                          </button>

                          {/* Botón Promover / Quitar de Colaborador */}
                          {!isOwner && (
                            <button
                              type="button"
                              onClick={() => handleToggleCollaborator(cust)}
                              disabled={loadingAction === cust.id}
                              title={isCollab ? 'Quitar permisos de colaborador' : 'Hacer colaborador de esta tienda'}
                              className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                isCollab
                                  ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20'
                                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
                              }`}
                            >
                              {loadingAction === cust.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : isCollab ? (
                                <>
                                  <X className="w-3.5 h-3.5" />
                                  <span>Quitar Acceso</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Hacer Colaborador</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Modal / Drawer de Historial Detallado del Cliente */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Cabecera del modal */}
            <div className="p-4 sm:p-5 border-b border-[var(--color-borde)] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base sm:text-lg text-[var(--color-texto)]">
                  Historial de {selectedCustomer.nombre || selectedCustomer.email}
                </h3>
                <p className="text-xs opacity-60">{selectedCustomer.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido con scroll */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
              {(() => {
                const metrics = getCustomerMetrics(selectedCustomer.email)

                return (
                  <>
                    {/* Resumen rápido */}
                    <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)]">
                      <div>
                        <span className="text-[11px] opacity-60 block">Compras</span>
                        <span className="text-base font-bold text-[var(--color-texto)]">{metrics.ordersCount}</span>
                      </div>
                      <div>
                        <span className="text-[11px] opacity-60 block">Gasto Total</span>
                        <span className="text-base font-bold text-[var(--color-primario)]">{formatMoney(metrics.totalSpent)}</span>
                      </div>
                      <div>
                        <span className="text-[11px] opacity-60 block">Reseñas</span>
                        <span className="text-base font-bold text-[var(--color-texto)]">{metrics.reviewsCount}</span>
                      </div>
                    </div>

                    {/* Pedidos del Cliente */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--color-texto)]">
                        <ShoppingBag className="w-4 h-4 text-[var(--color-primario)]" />
                        <span>Pedidos Realizados ({metrics.orders.length})</span>
                      </h4>

                      {metrics.orders.length === 0 ? (
                        <p className="text-xs opacity-60 italic p-3 bg-black/[0.01] rounded-lg">
                          No ha realizado compras aún.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {metrics.orders.map((o: any) => (
                            <div
                              key={o.id}
                              className="p-3.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div>
                                <span className="font-semibold text-sm">Pedido #{o.id.slice(0, 8)}</span>
                                <span className="text-[11px] opacity-60 ml-2">
                                  {new Date(o.created_at).toLocaleDateString('es-AR')}
                                </span>
                                <div className="text-[11px] opacity-75 mt-1">
                                  Estado: <span className="font-medium capitalize">{o.estado_pedido}</span> · Pago: <span className="font-medium capitalize">{o.estado_pago}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-sm text-[var(--color-primario)]">
                                  {formatMoney(Number(o.total) || 0)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Reseñas dejadas */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--color-texto)]">
                        <Star className="w-4 h-4 text-amber-500" />
                        <span>Opiniones y Reseñas ({metrics.reviews.length})</span>
                      </h4>

                      {metrics.reviews.length === 0 ? (
                        <p className="text-xs opacity-60 italic p-3 bg-black/[0.01] rounded-lg">
                          No ha publicado reseñas en ningún producto todavía.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {metrics.reviews.map((r) => (
                            <div
                              key={r.id}
                              className="p-3.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-3.5 h-3.5 ${
                                        star <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                                      }`}
                                    />
                                  ))}
                                  <span className="font-bold ml-1">{r.rating}/5</span>
                                </div>
                                <span className="text-[10px] opacity-50">
                                  {new Date(r.created_at).toLocaleDateString('es-AR')}
                                </span>
                              </div>
                              <p className="text-xs text-[var(--color-texto)] italic">&ldquo;{r.comentario}&rdquo;</p>
                              <div className="text-[10px] opacity-60">
                                Estado: {r.visible ? 'Visible en tienda' : 'Oculta por administrador'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}
      {/* Modal de Detalle de Pedido al hacer clic en 'Ver Detalle' */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[var(--color-borde)] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base sm:text-lg text-[var(--color-texto)]">
                  Detalle del Pedido #{selectedOrder.id?.slice(0, 8)}
                </h3>
                <p className="text-xs opacity-60">
                  {new Date(selectedOrder.created_at).toLocaleString('es-AR')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              {/* Datos del Comprador */}
              <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)] space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-60 block">
                  Datos del Comprador
                </span>
                <div className="text-sm font-semibold text-[var(--color-texto)]">
                  {selectedOrder.nombre_comprador || 'Comprador sin nombre'}
                </div>
                {selectedOrder.email_comprador && (
                  <div className="text-xs opacity-75 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 opacity-60" />
                    <span>{selectedOrder.email_comprador}</span>
                  </div>
                )}
                {selectedOrder.telefono_comprador && (
                  <div className="text-xs opacity-75 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 opacity-60" />
                    <span>{selectedOrder.telefono_comprador}</span>
                    <a
                      href={`https://wa.me/${selectedOrder.telefono_comprador.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Estados y Totales */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-[var(--color-borde)] bg-black/[0.01]">
                  <span className="text-[10px] uppercase font-bold opacity-60 block">Estado Pedido</span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${getEstadoBadge(selectedOrder.estado_pedido)}`}>
                    {selectedOrder.estado_pedido || 'nuevo'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-[var(--color-borde)] bg-black/[0.01]">
                  <span className="text-[10px] uppercase font-bold opacity-60 block">Estado Pago</span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${getPagoBadge(selectedOrder.estado_pago)}`}>
                    {selectedOrder.estado_pago || 'pendiente'}
                  </span>
                </div>
              </div>

              {/* Items del Pedido */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2">
                  Productos ({Array.isArray(selectedOrder.items) ? selectedOrder.items.length : 0})
                </h4>
                {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                  <div className="divide-y divide-[var(--color-borde)] border border-[var(--color-borde)] rounded-xl overflow-hidden">
                    {selectedOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 flex items-center justify-between text-xs bg-[var(--color-superficie)]">
                        <div>
                          <div className="font-semibold text-[var(--color-texto)]">{item.nombre || item.titulo || 'Producto'}</div>
                          {item.variante && (
                            <div className="text-[11px] opacity-60">Variante: {item.variante}</div>
                          )}
                          <div className="text-[11px] opacity-60">Cantidad: {item.cantidad || 1}</div>
                        </div>
                        <div className="font-mono font-bold text-sm text-[var(--color-primario)]">
                          {formatMoney((Number(item.precio) || 0) * (Number(item.cantidad) || 1))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs opacity-60 italic">Sin desglose de items disponible.</p>
                )}
              </div>

              {/* Total Final */}
              <div className="p-4 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--color-texto)]">Total del Pedido</span>
                <span className="text-lg font-bold font-mono text-amber-700 dark:text-amber-400">
                  {formatMoney(Number(selectedOrder.total) || 0)}
                </span>
              </div>

              {/* Botón a Ventas */}
              <div className="pt-2 flex justify-end gap-2">
                <Link
                  href={`/tienda/admin/ventas${tenantQuery}`}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-[#1F2937] text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <span>Gestionar en Ventas & Pedidos</span>
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
