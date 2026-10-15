// =============================================================================
// PORTALMAKER — Gestor de Clientes & CRM (Client Component)
// Visualiza a los clientes registrados, historial de pedidos, reseñas
// y permite promoverlos a Colaboradores de la tienda.
// =============================================================================

'use client'

import { useState, useMemo } from 'react'
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
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

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
    <div className="space-y-8 max-w-6xl">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-primario)] mb-1">
            <Users className="w-5 h-5" />
            <span className="eyebrow text-[var(--color-primario)]">GESTIÓN DE CLIENTES</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold font-[var(--font-heading)] text-[var(--color-texto)]">
            Clientes & Historial CRM
          </h1>
          <p className="mt-1 text-xs sm:text-sm opacity-70 text-[var(--color-texto)]">
            Usuarios registrados en tu tienda, historial de compras, reseñas dejadas y permisos de equipo.
          </p>
        </div>

        {/* Buscador */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email o nombre..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
          />
        </div>
      </div>

      {/* Resumen de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs">
          <p className="text-[11px] font-medium opacity-60">Clientes Registrados</p>
          <p className="text-2xl font-bold mt-1 text-[var(--color-texto)]">{customers.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs">
          <p className="text-[11px] font-medium opacity-60">Pedidos Totales</p>
          <p className="text-2xl font-bold mt-1 text-[var(--color-texto)]">{initialOrders.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs">
          <p className="text-[11px] font-medium opacity-60">Reseñas Dejadas</p>
          <p className="text-2xl font-bold mt-1 text-[var(--color-texto)]">{initialReviews.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs">
          <p className="text-[11px] font-medium opacity-60">Equipo / Colaboradores</p>
          <p className="text-2xl font-bold mt-1 text-amber-500">{collaborators.length}</p>
        </div>
      </div>

      {/* Tabla de Clientes */}
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
    </div>
  )
}
