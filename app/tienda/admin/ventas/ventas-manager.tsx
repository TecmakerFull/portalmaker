// =============================================================================
// PORTALMAKER — Gestor de Ventas, Pedidos, Stock y Clientes
// =============================================================================

'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Store, Order, OrderItem } from '@/types/database'
import {
  ShoppingBag,
  DollarSign,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  MessageSquare,
  Truck,
  Building2,
  CreditCard,
  Banknote,
  Search,
  Filter,
  Eye,
  Loader2,
  Box,
  RotateCcw,
  Calendar,
  ExternalLink,
} from 'lucide-react'

interface VentasManagerProps {
  store: Store
  initialOrders: Order[]
  tenantQuery: string
}

export default function VentasManager({
  store,
  initialOrders = [],
  tenantQuery,
}: VentasManagerProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Estados de acción dentro del modal
  const [updatingOrder, setUpdatingOrder] = useState(false)
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Métricas de ventas y clientes
  const metrics = useMemo(() => {
    const totalOrdersCount = orders.length

    const totalFacturado = orders
      .filter((o) => o.estado_pedido !== 'cancelado')
      .reduce((acc, o) => acc + (Number(o.total) || 0), 0)

    const pendingCount = orders.filter(
      (o) => o.estado_pedido === 'nuevo' || o.estado_pago === 'pendiente'
    ).length

    const uniqueClients = new Set(
      orders.map((o) => o.telefono_comprador || o.nombre_comprador).filter(Boolean)
    ).size

    return {
      totalFacturado,
      totalOrdersCount,
      pendingCount,
      uniqueClients,
    }
  }, [orders])

  // Pedidos filtrados
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Filtro por estado
      if (filterStatus !== 'todos' && order.estado_pedido !== filterStatus) {
        return false
      }

      // Filtro por búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = order.nombre_comprador?.toLowerCase().includes(q)
        const matchPhone = order.telefono_comprador?.toLowerCase().includes(q)
        const matchNotes = order.notas?.toLowerCase().includes(q)
        const matchItems = (order.items || []).some((it: OrderItem) =>
          it.nombre.toLowerCase().includes(q)
        )
        if (!matchName && !matchPhone && !matchNotes && !matchItems) {
          return false
        }
      }

      return true
    })
  }, [orders, filterStatus, searchQuery])

  // Abrir modal de detalle
  const handleOpenDetail = (order: Order) => {
    setSelectedOrder(order)
    setIsDetailOpen(true)
    setModalFeedback(null)
  }

  // Actualizar estado del pedido o pago
  const handleUpdateOrderStatus = async (
    newEstadoPedido?: Order['estado_pedido'],
    newEstadoPago?: Order['estado_pago']
  ) => {
    if (!selectedOrder) return

    setUpdatingOrder(true)
    setModalFeedback(null)

    const updates: Partial<Order> = {
      updated_at: new Date().toISOString(),
    }

    if (newEstadoPedido) updates.estado_pedido = newEstadoPedido
    if (newEstadoPago) updates.estado_pago = newEstadoPago

    try {
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', selectedOrder.id)

      if (error) throw error

      const updatedOrder = { ...selectedOrder, ...updates }
      setSelectedOrder(updatedOrder)
      setOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? updatedOrder : o)))
      setModalFeedback({ type: 'success', text: '¡Estado del pedido actualizado!' })
      router.refresh()
    } catch (err: any) {
      setModalFeedback({ type: 'error', text: err?.message || 'Error al actualizar el pedido.' })
    } finally {
      setUpdatingOrder(false)
    }
  }

  // Confirmar Venta y Descontar Stock
  const handleConfirmSaleAndDeductStock = async () => {
    if (!selectedOrder) return
    setUpdatingOrder(true)
    setModalFeedback(null)

    try {
      const itemsList = selectedOrder.items || []

      // 1. Descontar stock para cada producto que lo requiera
      for (const item of itemsList) {
        const qty = item.cantidad || 1

        // Si tiene variante con ID
        if (item.variant_id) {
          const { data: vData } = await supabase
            .from('product_variants')
            .select('stock')
            .eq('id', item.variant_id)
            .single()

          if (vData && vData.stock !== null) {
            const newVarStock = Math.max(0, vData.stock - qty)
            await supabase
              .from('product_variants')
              .update({ stock: newVarStock })
              .eq('id', item.variant_id)
          }
        }

        // Si el producto base gestiona stock
        if (item.product_id) {
          const { data: pData } = await supabase
            .from('products')
            .select('stock, gestiona_stock')
            .eq('id', item.product_id)
            .single()

          if (pData && pData.gestiona_stock && pData.stock !== null) {
            const newProdStock = Math.max(0, pData.stock - qty)
            await supabase
              .from('products')
              .update({ stock: newProdStock })
              .eq('id', item.product_id)
          }
        }
      }

      // 2. Marcar pedido como confirmado, pagado y stock_descontado = true
      const orderUpdates: Partial<Order> = {
        stock_descontado: true,
        estado_pedido: 'en_produccion',
        estado_pago: 'aprobado',
        observaciones_admin: `${selectedOrder.observaciones_admin || ''} | Stock descontado el ${new Date().toLocaleDateString('es-AR')}`,
        updated_at: new Date().toISOString(),
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update(orderUpdates)
        .eq('id', selectedOrder.id)

      if (orderError) throw orderError

      const updated = { ...selectedOrder, ...orderUpdates }
      setSelectedOrder(updated)
      setOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? updated : o)))
      setModalFeedback({
        type: 'success',
        text: '¡Venta confirmada y stock descontado exitosamente del inventario!',
      })
      router.refresh()
    } catch (err: any) {
      console.error(err)
      setModalFeedback({
        type: 'error',
        text: err?.message || 'Error al descontar stock.',
      })
    } finally {
      setUpdatingOrder(false)
    }
  }

  // Cancelar Pedido y Restaurar Stock si fue descontado
  const handleCancelOrderAndRestoreStock = async () => {
    if (!selectedOrder) return
    setUpdatingOrder(true)
    setModalFeedback(null)

    try {
      // Si el stock ya había sido descontado, lo restauramos
      if (selectedOrder.stock_descontado) {
        const itemsList = selectedOrder.items || []

        for (const item of itemsList) {
          const qty = item.cantidad || 1

          if (item.variant_id) {
            const { data: vData } = await supabase
              .from('product_variants')
              .select('stock')
              .eq('id', item.variant_id)
              .single()

            if (vData && vData.stock !== null) {
              await supabase
                .from('product_variants')
                .update({ stock: vData.stock + qty })
                .eq('id', item.variant_id)
            }
          }

          if (item.product_id) {
            const { data: pData } = await supabase
              .from('products')
              .select('stock, gestiona_stock')
              .eq('id', item.product_id)
              .single()

            if (pData && pData.gestiona_stock && pData.stock !== null) {
              await supabase
                .from('products')
                .update({ stock: pData.stock + qty })
                .eq('id', item.product_id)
            }
          }
        }
      }

      const orderUpdates: Partial<Order> = {
        estado_pedido: 'cancelado',
        estado_pago: 'rechazado',
        stock_descontado: false,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('orders')
        .update(orderUpdates)
        .eq('id', selectedOrder.id)

      if (error) throw error

      const updated = { ...selectedOrder, ...orderUpdates }
      setSelectedOrder(updated)
      setOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? updated : o)))
      setModalFeedback({
        type: 'success',
        text: 'El pedido fue cancelado y el stock restaurado correctamente.',
      })
      router.refresh()
    } catch (err: any) {
      setModalFeedback({ type: 'error', text: err?.message || 'Error al cancelar el pedido.' })
    } finally {
      setUpdatingOrder(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-texto)] font-[var(--font-heading)] flex items-center gap-2.5">
          <ShoppingBag className="w-7 h-7 text-[#CA8A04] dark:text-[#FACC15]" />
          <span>Ventas & Pedidos</span>
        </h1>
        <p className="text-xs sm:text-sm opacity-70 mt-1">
          Gestiona las compras y reservas recibidas desde tu tienda online, confirma pagos y descuenta stock automáticamente.
        </p>
      </div>

      {/* 1. Métricas de Ventas y Clientes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Facturado */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between opacity-70 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Facturado</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ${metrics.totalFacturado.toLocaleString('es-AR')}
          </span>
        </div>

        {/* Total Pedidos */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between opacity-70 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pedidos & Reservas</span>
            <ShoppingBag className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-[var(--color-texto)]">
            {metrics.totalOrdersCount}
          </span>
        </div>

        {/* Pedidos Pendientes */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between opacity-70 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pendientes</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
            {metrics.pendingCount}
          </span>
        </div>

        {/* Clientes Únicos */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between opacity-70 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Clientes Únicos</span>
            <Users className="w-4 h-4 text-sky-500" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-[var(--color-texto)]">
            {metrics.uniqueClients}
          </span>
        </div>
      </div>

      {/* 2. Filtros y Búsqueda */}
      <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Pills de Estado */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { key: 'todos', label: 'Todos' },
              { key: 'nuevo', label: 'Nuevos' },
              { key: 'en_produccion', label: 'En Producción' },
              { key: 'despachado', label: 'Despachados' },
              { key: 'entregado', label: 'Entregados' },
              { key: 'cancelado', label: 'Cancelados' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterStatus(tab.key)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterStatus === tab.key
                    ? 'bg-[#FACC15] text-[#1F2937] shadow-xs'
                    : 'border border-[var(--color-borde)] opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Campo de Búsqueda */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente o ítem..."
              className="w-full min-h-[40px] pl-9 pr-8 py-2 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 text-xs focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Lista de Pedidos */}
      <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] overflow-hidden shadow-xs">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3 opacity-60">
            <ShoppingBag className="w-12 h-12 mx-auto stroke-[1.5]" />
            <p className="font-bold text-sm">No hay pedidos para mostrar</p>
            <p className="text-xs opacity-70">
              {searchQuery || filterStatus !== 'todos'
                ? 'Prueba cambiando los filtros de búsqueda.'
                : 'Los pedidos que realicen los compradores en tu tienda aparecerán aquí.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-borde)]">
            {filteredOrders.map((order) => {
              const cleanPhone = order.telefono_comprador
                ? order.telefono_comprador.replace(/[^0-9]/g, '')
                : null
              const waChatUrl = cleanPhone
                ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                    `Hola ${order.nombre_comprador}! Te escribo de ${store.nombre} respecto a tu pedido.`
                  )}`
                : null

              const createdDate = new Date(order.created_at)

              return (
                <div
                  key={order.id}
                  className="p-4 sm:p-5 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-md">
                        #{order.id.slice(0, 8)}
                      </span>

                      {/* Badge Estado Pedido */}
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                          order.estado_pedido === 'entregado'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                            : order.estado_pedido === 'cancelado'
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                            : order.estado_pedido === 'en_produccion'
                            ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {order.estado_pedido === 'en_produccion'
                          ? 'En Producción'
                          : order.estado_pedido}
                      </span>

                      {/* Badge Estado Pago */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          order.estado_pago === 'aprobado'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : order.estado_pago === 'rechazado'
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        Pago {order.estado_pago}
                      </span>

                      {/* Badge Stock Descontado */}
                      {order.stock_descontado && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                          <Box className="w-3 h-3" />
                          <span>Stock descontado</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base">
                        {order.nombre_comprador || 'Cliente sin nombre'}
                      </span>
                      {order.telefono_comprador && (
                        <span className="text-xs opacity-60 font-mono">
                          ({order.telefono_comprador})
                        </span>
                      )}
                    </div>

                    {/* Resumen de items */}
                    <p className="text-xs opacity-70 truncate max-w-xl">
                      {(order.items || [])
                        .map((it: OrderItem) => `${it.cantidad}x ${it.nombre}`)
                        .join(', ')}
                    </p>

                    <span className="text-[11px] opacity-50 block">
                      {createdDate.toLocaleDateString('es-AR')} a las{' '}
                      {createdDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Acciones y Precio */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0">
                    <span className="text-lg sm:text-xl font-black text-[#CA8A04] dark:text-[#FACC15]">
                      ${Number(order.total).toLocaleString('es-AR')}
                    </span>

                    <div className="flex items-center gap-2">
                      {waChatUrl && (
                        <a
                          href={waChatUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                          title="Chatear por WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenDetail(order)}
                        className="min-h-[36px] px-3 py-1.5 rounded-xl border border-[var(--color-borde)] hover:border-[#FACC15] text-xs font-bold flex items-center gap-1.5 hover:bg-[#FACC15]/10 text-[#CA8A04] dark:text-[#FACC15] transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Detalle</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 4. Modal de Detalle y Gestión del Pedido */}
      {isDetailOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--color-superficie)] text-[var(--color-texto)] rounded-3xl border border-[var(--color-borde)] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-7 space-y-6 shadow-2xl relative">
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-[var(--color-borde)] pb-4">
              <div>
                <span className="text-xs font-mono font-bold opacity-60">
                  PEDIDO #{selectedOrder.id}
                </span>
                <h2 className="text-xl font-bold font-[var(--font-heading)] mt-0.5">
                  Gestión del Pedido
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="min-h-[36px] min-w-[36px] rounded-xl hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5 opacity-60" />
              </button>
            </div>

            {modalFeedback && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                  modalFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400'
                }`}
              >
                {modalFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{modalFeedback.text}</span>
              </div>
            )}

            {/* Datos del Comprador */}
            <div className="bg-[var(--color-fondo)]/40 p-4 rounded-2xl border border-[var(--color-borde)] space-y-2 text-xs">
              <h3 className="font-bold uppercase tracking-wider opacity-60">Datos del Comprador</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="opacity-60 text-xs block">Nombre:</span>
                  <span className="font-bold">{selectedOrder.nombre_comprador || '—'}</span>
                </div>
                <div>
                  <span className="opacity-60 text-xs block">Teléfono / WhatsApp:</span>
                  <span className="font-bold font-mono">{selectedOrder.telefono_comprador || '—'}</span>
                </div>
                {selectedOrder.email_comprador && (
                  <div>
                    <span className="opacity-60 text-xs block">Email:</span>
                    <span>{selectedOrder.email_comprador}</span>
                  </div>
                )}
                <div>
                  <span className="opacity-60 text-xs block">Entrega:</span>
                  <span className="font-semibold capitalize">
                    {selectedOrder.tipo_entrega || 'A coordinar'}
                    {selectedOrder.direccion_entrega ? ` (${selectedOrder.direccion_entrega})` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Lista de Productos del Pedido */}
            <div className="space-y-2.5">
              <h3 className="font-bold text-xs uppercase tracking-wider opacity-60">
                Productos Comprados / Reservados
              </h3>
              <div className="divide-y divide-[var(--color-borde)] border border-[var(--color-borde)] rounded-2xl overflow-hidden bg-[var(--color-fondo)]/20 text-xs">
                {(selectedOrder.items || []).map((item: OrderItem, idx: number) => (
                  <div key={idx} className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm">{item.nombre}</div>
                      {item.variante && (
                        <span className="text-[11px] opacity-70 text-[#CA8A04] dark:text-[#FACC15]">
                          Opción: {item.variante}
                        </span>
                      )}
                      <div className="opacity-60 text-[11px]">
                        {item.cantidad} x ${item.precio_unitario.toLocaleString('es-AR')}
                      </div>
                    </div>
                    <span className="font-bold text-sm">
                      ${(item.precio_unitario * item.cantidad).toLocaleString('es-AR')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-[var(--color-fondo)]/40 rounded-xl flex justify-between items-baseline font-bold">
                <span>Total del Pedido:</span>
                <span className="text-lg text-[#CA8A04] dark:text-[#FACC15]">
                  ${Number(selectedOrder.total).toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            {/* Notas del Comprador */}
            {selectedOrder.notas && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                <span className="font-bold text-amber-800 dark:text-amber-300 uppercase">
                  Notas del comprador:
                </span>
                <p className="leading-relaxed">{selectedOrder.notas}</p>
              </div>
            )}

            {/* Acciones de Gestión de Estado y Stock */}
            <div className="space-y-3 pt-2 border-t border-[var(--color-borde)]">
              <h3 className="font-bold text-xs uppercase tracking-wider opacity-70">
                Acciones del Vendedor
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Botón Confirmar Venta y Descontar Stock */}
                {!selectedOrder.stock_descontado && selectedOrder.estado_pedido !== 'cancelado' && (
                  <button
                    type="button"
                    disabled={updatingOrder}
                    onClick={handleConfirmSaleAndDeductStock}
                    className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-[#FACC15] text-[#1F2937] text-xs font-bold hover:bg-[#EAB308] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {updatingOrder ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Box className="w-4 h-4" />
                    )}
                    <span>Confirmar Venta y Descontar Stock</span>
                  </button>
                )}

                {/* Botón Marcar como Entregado */}
                {selectedOrder.estado_pedido !== 'entregado' && selectedOrder.estado_pedido !== 'cancelado' && (
                  <button
                    type="button"
                    disabled={updatingOrder}
                    onClick={() => handleUpdateOrderStatus('entregado', 'aprobado')}
                    className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Marcar como Entregado</span>
                  </button>
                )}

                {/* Botón Cancelar Pedido */}
                {selectedOrder.estado_pedido !== 'cancelado' && (
                  <button
                    type="button"
                    disabled={updatingOrder}
                    onClick={handleCancelOrderAndRestoreStock}
                    className="min-h-[48px] px-4 py-2.5 rounded-2xl border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-bold active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Cancelar Pedido {selectedOrder.stock_descontado ? '& Restaurar Stock' : ''}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
