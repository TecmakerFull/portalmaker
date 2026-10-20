// =============================================================================
// PORTALMAKER — Gestor de Ventas, Pedidos, Stock y Clientes
// =============================================================================

'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
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
  Plus,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  Mail,
  Trash2,
  ArrowUpDown,
  Check,
} from 'lucide-react'

export interface ProductSummaryForSale {
  id: string
  nombre: string
  precio_base: number
  precio_oferta: number | null
  oferta_activa: boolean
  stock: number | null
  gestiona_stock: boolean
  variants?: Array<{
    id: string
    nombre: string
    precio_adicional: number
    stock: number | null
    activo: boolean
  }> | null
}

export interface CustomerSummaryForSale {
  id: string
  nombre: string
  email: string | null
  telefono: string | null
}

interface VentasManagerProps {
  store: Store
  initialOrders: Order[]
  initialProducts?: ProductSummaryForSale[]
  initialCustomers?: CustomerSummaryForSale[]
  tenantQuery: string
}

type DateRangeFilter = 'todos' | 'hoy' | '7dias' | '30dias' | 'este_mes'
type SortOrder = 'desc' | 'asc'

// Helper determinista para formatear fechas sin desfasajes de hidratación entre SSR y Browser
function formatOrderDate(dateStr: string) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}`
  } catch {
    return dateStr
  }
}

export default function VentasManager({
  store,
  initialOrders = [],
  initialProducts = [],
  initialCustomers = [],
  tenantQuery,
}: VentasManagerProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [cardFilter, setCardFilter] = useState<'todos' | 'facturado' | 'pendientes' | 'clientes'>('todos')
  const [selectedClientFilter, setSelectedClientFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Filtro temporal y Ordenación
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('todos')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Paginación / "Ver más" (mostrar de a 20)
  const [visibleCount, setVisibleCount] = useState<number>(20)

  // Acordeón de filas expandidas para vista compacta
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set())

  // Modal de Detalle completo de orden
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Estados de acción dentro del modal de detalle
  const [updatingOrder, setUpdatingOrder] = useState(false)
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedShipment, setSelectedShipment] = useState<any | null>(null)
  const [loadingShipment, setLoadingShipment] = useState(false)
  const [shippingActionLoading, setShippingActionLoading] = useState(false)

  // Modal de Nueva Venta Manual
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false)
  const [creatingSale, setCreatingSale] = useState(false)
  const [saleError, setSaleError] = useState<string | null>(null)

  // Formulario de Nueva Venta Manual
  const [clienteTipo, setClienteTipo] = useState<'consumidor_final' | 'existente' | 'nuevo'>('consumidor_final')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [manualNombre, setManualNombre] = useState('')
  const [manualTelefono, setManualTelefono] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const [manualMetodoPago, setManualMetodoPago] = useState<string>('efectivo')
  const [manualTipoEntrega, setManualTipoEntrega] = useState<'acordar' | 'retiro' | 'envio'>('retiro')
  const [manualNotas, setManualNotas] = useState('')
  const [manualDescontarStock, setManualDescontarStock] = useState(true)

  // Búsqueda interactiva y Combobox desplegable de productos en modal de nueva venta
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const comboboxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setComboboxOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Items en la nueva venta manual
  interface ManualItemRow {
    productId: string
    variantId: string
    nombre: string
    variante: string
    cantidad: number
    precio_unitario: number
    gestiona_stock: boolean
  }
  const [manualItems, setManualItems] = useState<ManualItemRow[]>([])

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  // Lista aplanada de opciones de producto y variantes para selección rápida y búsqueda
  const flatProductOptions = useMemo(() => {
    const list: Array<{
      key: string
      productId: string
      variantId: string
      productName: string
      variantName: string
      displayName: string
      price: number
      stock: number | null
      gestionaStock: boolean
    }> = []

    initialProducts.forEach((p) => {
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach((v) => {
          const pr = (p.oferta_activa && p.precio_oferta != null ? p.precio_oferta : p.precio_base) + (v.precio_adicional || 0)
          list.push({
            key: `${p.id}__${v.id}`,
            productId: p.id,
            variantId: v.id,
            productName: p.nombre,
            variantName: v.nombre,
            displayName: `${p.nombre} — ${v.nombre}`,
            price: pr,
            stock: v.stock,
            gestionaStock: p.gestiona_stock,
          })
        })
      } else {
        const pr = p.oferta_activa && p.precio_oferta != null ? p.precio_oferta : p.precio_base
        list.push({
          key: `${p.id}__`,
          productId: p.id,
          variantId: '',
          productName: p.nombre,
          variantName: '',
          displayName: p.nombre,
          price: pr,
          stock: p.stock,
          gestionaStock: p.gestiona_stock,
        })
      }
    })

    return list
  }, [initialProducts])

  // Opciones de productos filtradas por búsqueda en el modal (soporta buscar por producto padre y variante simultáneamente)
  const filteredProductOptions = useMemo(() => {
    if (!productSearchQuery.trim()) return flatProductOptions
    const terms = productSearchQuery.toLowerCase().trim().split(/\s+/)
    return flatProductOptions.filter((opt) => {
      const searchTarget = `${opt.productName} ${opt.variantName}`.toLowerCase()
      return terms.every((term) => searchTarget.includes(term))
    })
  }, [flatProductOptions, productSearchQuery])

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

  // Desglose de compradores únicos para la vista de clientes
  const uniqueClientsList = useMemo(() => {
    const map = new Map<string, {
      key: string
      nombre: string
      telefono?: string | null
      email?: string | null
      totalOrders: number
      totalSpent: number
      lastOrderDate: string
    }>()

    orders.forEach((o) => {
      const key = (o.telefono_comprador || (o as any).email_comprador || o.nombre_comprador || o.id).toLowerCase().trim()
      const existing = map.get(key)
      const orderTotal = Number(o.total) || 0

      if (existing) {
        existing.totalOrders += 1
        existing.totalSpent += orderTotal
        if (new Date(o.created_at) > new Date(existing.lastOrderDate)) {
          existing.lastOrderDate = o.created_at
        }
      } else {
        map.set(key, {
          key,
          nombre: o.nombre_comprador || 'Comprador sin nombre',
          telefono: o.telefono_comprador,
          email: (o as any).email_comprador,
          totalOrders: 1,
          totalSpent: orderTotal,
          lastOrderDate: o.created_at,
        })
      }
    })

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent)
  }, [orders])

  // Pedidos filtrados y ordenados
  const filteredOrders = useMemo(() => {
    const now = new Date()

    const result = orders.filter((order) => {
      // 1. Filtro especial por tarjeta superior
      if (cardFilter === 'facturado') {
        if (order.estado_pago !== 'aprobado') return false
      } else if (cardFilter === 'pendientes') {
        const isPending = order.estado_pedido === 'nuevo' || order.estado_pago === 'pendiente'
        if (!isPending) return false
      }

      // 2. Filtro si se seleccionó un cliente específico
      if (selectedClientFilter) {
        const key = (order.telefono_comprador || (order as any).email_comprador || order.nombre_comprador || order.id).toLowerCase().trim()
        if (key !== selectedClientFilter) return false
      }

      // 3. Filtro por estado
      if (filterStatus !== 'todos' && order.estado_pedido !== filterStatus) {
        return false
      }

      // 4. Filtro temporal
      if (dateFilter !== 'todos') {
        const orderDate = new Date(order.created_at)
        if (dateFilter === 'hoy') {
          const isToday =
            orderDate.getDate() === now.getDate() &&
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear()
          if (!isToday) return false
        } else if (dateFilter === '7dias') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (orderDate < sevenDaysAgo) return false
        } else if (dateFilter === '30dias') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          if (orderDate < thirtyDaysAgo) return false
        } else if (dateFilter === 'este_mes') {
          const isThisMonth =
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear()
          if (!isThisMonth) return false
        }
      }

      // 5. Filtro por búsqueda de texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = order.nombre_comprador?.toLowerCase().includes(q)
        const matchPhone = order.telefono_comprador?.toLowerCase().includes(q)
        const matchEmail = (order as any).email_comprador?.toLowerCase().includes(q)
        const matchNotes = order.notas?.toLowerCase().includes(q)
        const matchId = order.id.toLowerCase().includes(q)
        const matchItems = (order.items || []).some((it: OrderItem) =>
          it.nombre.toLowerCase().includes(q)
        )
        if (!matchName && !matchPhone && !matchEmail && !matchNotes && !matchItems && !matchId) {
          return false
        }
      }

      return true
    })

    // Ordenar (por defecto: última arriba / desc)
    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })

    return result
  }, [orders, cardFilter, selectedClientFilter, filterStatus, dateFilter, searchQuery, sortOrder])

  // Pedidos visibles según paginación (bloques de 20)
  const visibleOrders = useMemo(() => {
    return filteredOrders.slice(0, visibleCount)
  }, [filteredOrders, visibleCount])

  // Abrir modal de detalle y cargar datos logísticos
  const handleOpenDetail = async (order: Order) => {
    setSelectedOrder(order)
    setIsDetailOpen(true)
    setModalFeedback(null)
    setSelectedShipment(null)

    // Cargar información del envío si aplica
    if (Number(order.costo_envio) > 0 || order.envio_tipo || order.envio_proveedor) {
      setLoadingShipment(true)
      try {
        const { data } = await supabase
          .from('shipments')
          .select('*')
          .eq('order_id', order.id)
          .neq('estado', 'cancelado')
          .maybeSingle()
        setSelectedShipment(data || null)
      } catch {
        // Ignorar
      } finally {
        setLoadingShipment(false)
      }
    }
  }

  // Reintentar envío fallido (Fase 6)
  const handleRetryShipment = async (shipmentId: string) => {
    setShippingActionLoading(true)
    setModalFeedback(null)
    try {
      const res = await fetch(`/api/tienda/admin/envios/${shipmentId}/retry`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al reintentar el envío')
      setModalFeedback({ type: 'success', text: 'Envío generado exitosamente.' })
      if (selectedOrder) {
        const { data: updatedShip } = await supabase
          .from('shipments')
          .select('*')
          .eq('id', shipmentId)
          .maybeSingle()
        setSelectedShipment(updatedShip || null)
      }
    } catch (err: any) {
      setModalFeedback({ type: 'error', text: err?.message || 'Error al reintentar envío.' })
    } finally {
      setShippingActionLoading(false)
    }
  }

  // Cancelar envío antes de despacho (Fase 6)
  const handleCancelShipment = async (shipmentId: string) => {
    if (!confirm('¿Estás seguro de cancelar este envío? Podrás volver a generarlo luego si es necesario.')) return
    setShippingActionLoading(true)
    setModalFeedback(null)
    try {
      const res = await fetch(`/api/tienda/admin/envios/${shipmentId}/cancel`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cancelar el envío')
      setModalFeedback({ type: 'success', text: 'Envío cancelado correctamente.' })
      setSelectedShipment(null)
    } catch (err: any) {
      setModalFeedback({ type: 'error', text: err?.message || 'Error al cancelar envío.' })
    } finally {
      setShippingActionLoading(false)
    }
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

      // Auditoría en order_events (Fase 5)
      const eventsToInsert: any[] = []
      if (newEstadoPedido && newEstadoPedido !== selectedOrder.estado_pedido) {
        eventsToInsert.push({
          order_id: selectedOrder.id,
          store_id: store.id,
          tipo: 'estado_pedido',
          de: selectedOrder.estado_pedido,
          a: newEstadoPedido,
          actor: 'admin',
        })
      }
      if (newEstadoPago && newEstadoPago !== selectedOrder.estado_pago) {
        eventsToInsert.push({
          order_id: selectedOrder.id,
          store_id: store.id,
          tipo: 'estado_pago',
          de: selectedOrder.estado_pago,
          a: newEstadoPago,
          actor: 'admin',
        })
      }
      if (eventsToInsert.length > 0) {
        await supabase.from('order_events').insert(eventsToInsert)
      }

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

      const orderUpdates: Partial<Order> = {
        estado_pedido: 'en_produccion',
        estado_pago: 'aprobado',
        stock_descontado: true,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('orders')
        .update(orderUpdates)
        .eq('id', selectedOrder.id)

      if (error) throw error

      await supabase.from('order_events').insert([
        {
          order_id: selectedOrder.id,
          store_id: store.id,
          tipo: 'estado_pedido',
          de: selectedOrder.estado_pedido,
          a: 'en_produccion',
          actor: 'admin',
        },
        {
          order_id: selectedOrder.id,
          store_id: store.id,
          tipo: 'estado_pago',
          de: selectedOrder.estado_pago,
          a: 'aprobado',
          actor: 'admin',
        },
      ])

      const updated = { ...selectedOrder, ...orderUpdates }
      setSelectedOrder(updated)
      setOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? updated : o)))
      setModalFeedback({
        type: 'success',
        text: 'Venta confirmada: stock descontado y estado pasado a En Producción.',
      })
      router.refresh()
    } catch (err: any) {
      setModalFeedback({ type: 'error', text: err?.message || 'Error al descontar stock.' })
    } finally {
      setUpdatingOrder(false)
    }
  }

  // Cancelar Pedido y Restaurar Stock
  const handleCancelOrderAndRestoreStock = async () => {
    if (!selectedOrder) return
    if (!confirm('¿Estás seguro de cancelar este pedido? Si el stock fue descontado, se restaurará automáticamente.')) {
      return
    }

    setUpdatingOrder(true)
    setModalFeedback(null)

    try {
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

      await supabase.from('order_events').insert([
        {
          order_id: selectedOrder.id,
          store_id: store.id,
          tipo: 'estado_pedido',
          de: selectedOrder.estado_pedido,
          a: 'cancelado',
          actor: 'admin',
        },
        {
          order_id: selectedOrder.id,
          store_id: store.id,
          tipo: 'estado_pago',
          de: selectedOrder.estado_pago,
          a: 'rechazado',
          actor: 'admin',
        },
      ])

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

  // Agregar ítem al formulario de venta manual
  const handleAddManualItem = (productId: string, variantId: string = '') => {
    const prod = initialProducts.find((p) => p.id === productId)
    if (!prod) return

    let price = prod.oferta_activa && prod.precio_oferta != null ? prod.precio_oferta : prod.precio_base
    let variantName = ''

    if (variantId && prod.variants) {
      const v = prod.variants.find((vr) => vr.id === variantId)
      if (v) {
        price += v.precio_adicional || 0
        variantName = v.nombre
      }
    }

    setManualItems((prev) => {
      const existingIdx = prev.findIndex(
        (it) => it.productId === prod.id && it.variantId === (variantId || '')
      )
      if (existingIdx >= 0) {
        const next = [...prev]
        next[existingIdx] = {
          ...next[existingIdx],
          cantidad: next[existingIdx].cantidad + 1,
        }
        return next
      }
      return [
        ...prev,
        {
          productId: prod.id,
          variantId: variantId || '',
          nombre: prod.nombre,
          variante: variantName,
          cantidad: 1,
          precio_unitario: price,
          gestiona_stock: prod.gestiona_stock,
        },
      ]
    })
  }

  const handleUpdateManualItemQty = (index: number, newQty: number) => {
    if (newQty < 1) return
    setManualItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, cantidad: newQty } : it))
    )
  }

  const handleUpdateManualItemPrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return
    setManualItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, precio_unitario: newPrice } : it))
    )
  }

  const handleRemoveManualItem = (index: number) => {
    setManualItems((prev) => prev.filter((_, idx) => idx !== index))
  }

  const manualTotal = useMemo(() => {
    return manualItems.reduce((acc, it) => acc + it.precio_unitario * it.cantidad, 0)
  }, [manualItems])

  // Crear la Venta Manual a través de la API segura
  const handleCreateManualSale = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaleError(null)

    if (manualItems.length === 0) {
      setSaleError('Debes agregar al menos un producto a la venta.')
      return
    }

    let finalNombre = 'Consumidor Final'
    let finalTelefono: string | null = null
    let finalEmail: string | null = null

    if (clienteTipo === 'existente') {
      const cust = initialCustomers.find((c) => c.id === selectedCustomerId)
      if (!cust) {
        setSaleError('Selecciona un cliente de la lista.')
        return
      }
      finalNombre = cust.nombre
      finalTelefono = cust.telefono
      finalEmail = cust.email
    } else if (clienteTipo === 'nuevo') {
      if (!manualNombre.trim()) {
        setSaleError('Indica el nombre del cliente.')
        return
      }
      finalNombre = manualNombre.trim()
      finalTelefono = manualTelefono.trim() || null
      finalEmail = manualEmail.trim() || null
    }

    setCreatingSale(true)

    try {
      const res = await fetch('/api/store/manual-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          nombreComprador: finalNombre,
          telefonoComprador: finalTelefono,
          emailComprador: finalEmail,
          tipoEntrega: manualTipoEntrega,
          metodoPago: manualMetodoPago,
          notas: manualNotas,
          descontarStock: manualDescontarStock,
          items: manualItems,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar la venta manual.')
      }

      if (data.order) {
        setOrders((prev) => [data.order, ...prev])
      }

      setIsNewSaleOpen(false)
      // Reset del formulario
      setManualItems([])
      setManualNombre('')
      setManualTelefono('')
      setManualEmail('')
      setManualNotas('')
      setProductSearchQuery('')
      setClienteTipo('consumidor_final')

      router.refresh()
    } catch (err: any) {
      console.error('Error al registrar venta manual:', err)
      setSaleError(err?.message || 'Error al guardar la venta manual.')
    } finally {
      setCreatingSale(false)
    }
  }

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Encabezado con Botón de Nueva Venta (sin doble '+') */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-texto)] font-[var(--font-heading)] flex items-center gap-2.5">
            <ShoppingBag className="w-7 h-7 text-[#CA8A04] dark:text-[#FACC15]" />
            <span>Ventas & Pedidos</span>
          </h1>
          <p className="text-xs sm:text-sm opacity-70 mt-1">
            Gestiona las compras online y ventas de mostrador de tu tienda en un solo lugar.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsNewSaleOpen(true)
            setSaleError(null)
          }}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] font-bold text-xs sm:text-sm hover:bg-[#eab308] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nueva Venta</span>
        </button>
      </div>

      {/* 1. Métricas de Ventas y Clientes (Tarjetas interactivas de filtro) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Facturado */}
        <button
          type="button"
          onClick={() => {
            setSelectedClientFilter(null)
            if (cardFilter === 'facturado') {
              setCardFilter('todos')
            } else {
              setCardFilter('facturado')
              setFilterStatus('todos')
            }
          }}
          className={`p-4 sm:p-5 rounded-3xl bg-[var(--color-superficie)] border text-left transition-all flex flex-col justify-between cursor-pointer min-h-[44px] ${
            cardFilter === 'facturado'
              ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-sm'
              : 'border-[var(--color-borde)] hover:border-[var(--color-texto-muted)] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between opacity-70 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Facturado</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <span suppressHydrationWarning className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              ${metrics.totalFacturado.toLocaleString('es-AR')}
            </span>
            <span className="block text-[11px] opacity-60 mt-1 font-medium">
              {cardFilter === 'facturado' ? 'Filtrando pedidos cobrados' : 'Clic para filtrar cobrados'}
            </span>
          </div>
        </button>

        {/* Total Pedidos */}
        <button
          type="button"
          onClick={() => {
            setCardFilter('todos')
            setSelectedClientFilter(null)
            setFilterStatus('todos')
          }}
          className={`p-4 sm:p-5 rounded-3xl bg-[var(--color-superficie)] border text-left transition-all flex flex-col justify-between cursor-pointer min-h-[44px] ${
            cardFilter === 'todos' && !selectedClientFilter
              ? 'border-[#FACC15] ring-2 ring-[#FACC15]/40 shadow-sm'
              : 'border-[var(--color-borde)] hover:border-[var(--color-texto-muted)] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between opacity-70 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pedidos & Reservas</span>
            <ShoppingBag className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-[var(--color-texto)]">
              {metrics.totalOrdersCount}
            </span>
            <span className="block text-[11px] opacity-60 mt-1 font-medium">
              {cardFilter === 'todos' && !selectedClientFilter ? 'Mostrando todos' : 'Clic para ver todos'}
            </span>
          </div>
        </button>

        {/* Pedidos Pendientes */}
        <button
          type="button"
          onClick={() => {
            setSelectedClientFilter(null)
            if (cardFilter === 'pendientes') {
              setCardFilter('todos')
            } else {
              setCardFilter('pendientes')
              setFilterStatus('todos')
            }
          }}
          className={`p-4 sm:p-5 rounded-3xl bg-[var(--color-superficie)] border text-left transition-all flex flex-col justify-between cursor-pointer min-h-[44px] ${
            cardFilter === 'pendientes'
              ? 'border-amber-500 ring-2 ring-amber-500/40 shadow-sm'
              : 'border-[var(--color-borde)] hover:border-[var(--color-texto-muted)] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between opacity-70 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pendientes</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
              {metrics.pendingCount}
            </span>
            <span className="block text-[11px] opacity-60 mt-1 font-medium">
              {cardFilter === 'pendientes' ? 'Filtrando pendientes' : 'Clic para filtrar pendientes'}
            </span>
          </div>
        </button>

        {/* Clientes Únicos */}
        <button
          type="button"
          onClick={() => {
            if (cardFilter === 'clientes') {
              setCardFilter('todos')
              setSelectedClientFilter(null)
            } else {
              setCardFilter('clientes')
            }
          }}
          className={`p-4 sm:p-5 rounded-3xl bg-[var(--color-superficie)] border text-left transition-all flex flex-col justify-between cursor-pointer min-h-[44px] ${
            cardFilter === 'clientes'
              ? 'border-sky-500 ring-2 ring-sky-500/40 shadow-sm'
              : 'border-[var(--color-borde)] hover:border-[var(--color-texto-muted)] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between opacity-70 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Clientes Únicos</span>
            <Users className="w-4 h-4 text-sky-500" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-[var(--color-texto)]">
              {metrics.uniqueClients}
            </span>
            <span className="block text-[11px] opacity-60 mt-1 font-medium">
              {cardFilter === 'clientes' ? 'Vista por clientes activa' : 'Clic para ver por cliente'}
            </span>
          </div>
        </button>
      </div>

      {/* Vista de Compradores Únicos cuando cardFilter === 'clientes' */}
      {cardFilter === 'clientes' && (
        <div className="p-4 sm:p-6 rounded-3xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-borde)] pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--color-texto)] flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-500" />
                <span>Compradores de la Tienda ({uniqueClientsList.length})</span>
              </h3>
              <p className="text-xs opacity-60 mt-0.5">
                Toca cualquier comprador para filtrar sus pedidos específicos abajo, o contactalo por WhatsApp.
              </p>
            </div>
            <Link
              href={`/tienda/admin/clientes${tenantQuery}`}
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Ver Historial CRM Completo</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {uniqueClientsList.map((client) => {
              const isSelected = selectedClientFilter === client.key
              return (
                <div
                  key={client.key}
                  onClick={() => setSelectedClientFilter(isSelected ? null : client.key)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? 'border-[#FACC15] ring-2 ring-[#FACC15]/40 bg-[#FACC15]/5'
                      : 'border-[var(--color-borde)] hover:border-[var(--color-texto-muted)] bg-black/[0.01] dark:bg-white/[0.01]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-xs sm:text-sm text-[var(--color-texto)]">{client.nombre}</div>
                      {client.email && (
                        <div className="text-[11px] opacity-60">{client.email}</div>
                      )}
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FACC15] text-[#1F2937]">
                        Filtrando
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--color-borde)]">
                    <span className="opacity-70 font-medium">
                      {client.totalOrders} {client.totalOrders === 1 ? 'pedido' : 'pedidos'} · <strong suppressHydrationWarning className="font-mono text-emerald-600 dark:text-emerald-400">${client.totalSpent.toLocaleString('es-AR')}</strong>
                    </span>
                    {client.telefono && (
                      <a
                        href={`https://wa.me/${client.telefono.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                        title="Escribir por WhatsApp"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Chat</span>
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 2. Barra de Filtros, Estado, Rango de Fecha y Búsqueda */}
      <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-4 sm:p-5 shadow-xs space-y-3">
        {/* Fila 1: Filtro de Estado + Filtro Temporal + Orden + Búsqueda */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Pills de Estado de Pedido */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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

          {/* Controles secundarios: Temporal, Orden y Búsqueda */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Temporal */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 opacity-50 shrink-0" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateRangeFilter)}
                className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
              >
                <option value="todos">Cualquier fecha</option>
                <option value="hoy">Hoy</option>
                <option value="7dias">Últimos 7 días</option>
                <option value="30dias">Últimos 30 días</option>
                <option value="este_mes">Este mes</option>
              </select>
            </div>

            {/* Orden Asc / Desc */}
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              title={sortOrder === 'desc' ? 'Orden: Más recientes primero' : 'Orden: Más antiguos primero'}
              className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
              <span className="text-[11px]">{sortOrder === 'desc' ? 'Recientes' : 'Antiguos'}</span>
            </button>

            {/* Campo de Búsqueda */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente o ítem..."
                className="w-full min-h-[38px] pl-8 pr-7 py-1.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 text-xs focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Indicador de Filtro Activo por Tarjeta o Fecha */}
        {(cardFilter !== 'todos' || selectedClientFilter || dateFilter !== 'todos' || filterStatus !== 'todos') && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--color-borde)] text-xs">
            <span className="opacity-60 text-[11px] font-semibold uppercase tracking-wider">Filtro activo:</span>
            {cardFilter === 'facturado' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                <span>Cobrados / Pagados</span>
                <button
                  type="button"
                  onClick={() => setCardFilter('todos')}
                  className="hover:opacity-100 opacity-60 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {cardFilter === 'pendientes' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-semibold">
                <span>Pendientes</span>
                <button
                  type="button"
                  onClick={() => setCardFilter('todos')}
                  className="hover:opacity-100 opacity-60 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {dateFilter !== 'todos' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 font-semibold">
                <span>Fecha: {dateFilter}</span>
                <button
                  type="button"
                  onClick={() => setDateFilter('todos')}
                  className="hover:opacity-100 opacity-60 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedClientFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 font-semibold">
                <span>Cliente: {uniqueClientsList.find((c) => c.key === selectedClientFilter)?.nombre || selectedClientFilter}</span>
                <button
                  type="button"
                  onClick={() => setSelectedClientFilter(null)}
                  className="hover:opacity-100 opacity-60 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setCardFilter('todos')
                setSelectedClientFilter(null)
                setFilterStatus('todos')
                setDateFilter('todos')
                setSearchQuery('')
              }}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline cursor-pointer ml-auto font-semibold"
            >
              Restablecer filtros
            </button>
          </div>
        )}
      </div>

      {/* 3. Lista Limpia y Compacta de Pedidos con Desplegable */}
      <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] overflow-hidden shadow-xs">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3 opacity-60">
            <ShoppingBag className="w-12 h-12 mx-auto stroke-[1.5]" />
            <p className="font-bold text-sm">No hay ventas registradas con los filtros seleccionados</p>
            <p className="text-xs opacity-70">
              {searchQuery || filterStatus !== 'todos' || dateFilter !== 'todos'
                ? 'Prueba cambiando los filtros de fecha o búsqueda.'
                : 'Las ventas realizadas online o manuales aparecerán aquí.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-borde)]">
            {visibleOrders.map((order) => {
              const cleanPhone = order.telefono_comprador
                ? order.telefono_comprador.replace(/[^0-9]/g, '')
                : null
              const waChatUrl = cleanPhone
                ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                    `Hola ${order.nombre_comprador || ''}! Te escribo de ${store.nombre} respecto a tu compra #${order.id.slice(0, 8)}.`
                  )}`
                : null

              const createdDate = new Date(order.created_at)
              const isExpanded = expandedOrderIds.has(order.id)
              const itemsCount = (order.items || []).reduce((acc: number, it: any) => acc + (it.cantidad || 1), 0)

              return (
                <div key={order.id} className="transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                  {/* Fila Principal Resumida y Limpia */}
                  <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Lado Izquierdo: ID, Estado, Cliente y Fecha */}
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      {/* Botón desplegable */}
                      <button
                        type="button"
                        onClick={() => toggleExpandOrder(order.id)}
                        className="min-h-[36px] min-w-[36px] rounded-xl hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center cursor-pointer opacity-70 hover:opacity-100 transition-colors shrink-0"
                        title={isExpanded ? 'Ocultar detalle rápido' : 'Ver detalle rápido'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      <div className="space-y-1 min-w-0 flex-1">
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

                          {/* Badge Venta Manual si corresponde */}
                          {order.notas?.includes('[Venta Manual]') && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                              Manual
                            </span>
                          )}
                        </div>

                        {/* Nombre del Comprador y cantidad resumida de items */}
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs">
                          <span className="font-bold text-sm text-[var(--color-texto)] truncate max-w-xs">
                            {order.nombre_comprador || 'Consumidor Final'}
                          </span>
                          <span className="opacity-50">·</span>
                          <span className="opacity-70 text-[11px]">
                            {itemsCount} {itemsCount === 1 ? 'producto' : 'productos'}
                          </span>
                          <span className="opacity-50">·</span>
                          <span suppressHydrationWarning className="opacity-50 text-[11px]">
                            {formatOrderDate(order.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Lado Derecho: Monto y Botones Compactos */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--color-borde)]/40">
                      <span suppressHydrationWarning className="text-base sm:text-lg font-bold text-[#CA8A04] dark:text-[#FACC15] font-mono">
                        ${Number(order.total).toLocaleString('es-AR')}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* Botón WhatsApp compacto */}
                        {waChatUrl && (
                          <a
                            href={waChatUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[34px] min-w-[34px] p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-all shadow-xs"
                            title="Chat de WhatsApp con el cliente"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* Botón Ver Detalle Completo */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(order)}
                          className="min-h-[34px] px-3 py-1 rounded-xl border border-[var(--color-borde)] hover:border-[#FACC15] text-xs font-semibold flex items-center gap-1.5 hover:bg-[#FACC15]/10 text-[var(--color-texto)] transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 opacity-70" />
                          <span>Detalle</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Panel Desplegable con Todos los Datos Rápidos */}
                  {isExpanded && (
                    <div className="px-4 py-3 sm:px-6 bg-black/[0.02] dark:bg-white/[0.02] border-t border-[var(--color-borde)]/60 space-y-3 animate-in fade-in duration-150 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Datos de contacto y entrega */}
                        <div className="space-y-1">
                          <span className="font-bold text-[11px] uppercase tracking-wider opacity-60 block">
                            Contacto & Entrega
                          </span>
                          <p>
                            <strong className="opacity-70">Teléfono:</strong>{' '}
                            {order.telefono_comprador || 'No registrado'}
                          </p>
                          <p>
                            <strong className="opacity-70">Email:</strong>{' '}
                            {order.email_comprador || 'No registrado'}
                          </p>
                          <p>
                            <strong className="opacity-70">Forma de Entrega:</strong>{' '}
                            <span className="capitalize">{order.tipo_entrega || 'A convenir'}</span>
                            {order.direccion_entrega ? ` (${order.direccion_entrega})` : ''}
                          </p>
                        </div>

                        {/* Datos de pago y stock */}
                        <div className="space-y-1">
                          <span className="font-bold text-[11px] uppercase tracking-wider opacity-60 block">
                            Pago & Stock
                          </span>
                          <p>
                            <strong className="opacity-70">Método de Pago:</strong>{' '}
                            <span className="capitalize">{order.metodo_pago || 'A convenir'}</span>
                          </p>
                          <p>
                            <strong className="opacity-70">Control de Stock:</strong>{' '}
                            {order.stock_descontado ? (
                              <span className="text-purple-600 dark:text-purple-400 font-semibold">Descontado del inventario</span>
                            ) : (
                              <span className="opacity-60">Pendiente de descuento</span>
                            )}
                          </p>
                          {order.mp_payment_id && (
                            <p className="font-mono text-[11px] opacity-70">
                              MP ID: {order.mp_payment_id}
                            </p>
                          )}
                        </div>

                        {/* Notas */}
                        <div className="space-y-1">
                          <span className="font-bold text-[11px] uppercase tracking-wider opacity-60 block">
                            Notas & Aclaraciones
                          </span>
                          <p className="opacity-80 italic">
                            {order.notas || 'Sin notas adicionales.'}
                          </p>
                        </div>
                      </div>

                      {/* Lista de productos desglosados */}
                      <div className="pt-2 border-t border-[var(--color-borde)]/40">
                        <span className="font-bold text-[11px] uppercase tracking-wider opacity-60 block mb-1.5">
                          Ítems de la Venta:
                        </span>
                        <div className="space-y-1 divide-y divide-[var(--color-borde)]/30">
                          {(order.items || []).map((it: OrderItem, idx: number) => (
                            <div key={idx} className="pt-1 first:pt-0 flex items-center justify-between text-xs">
                              <span className="opacity-90">
                                {it.cantidad}x <strong>{it.nombre}</strong> {it.variante ? `(${it.variante})` : ''}
                              </span>
                              <span className="font-mono opacity-80">
                                ${((it.precio_unitario || 0) * (it.cantidad || 1)).toLocaleString('es-AR')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Botón Ver Más (Paginación de a 20) */}
        {filteredOrders.length > visibleCount && (
          <div className="p-4 text-center border-t border-[var(--color-borde)] bg-black/[0.01] dark:bg-white/[0.01]">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 20)}
              className="min-h-[40px] px-6 py-2 rounded-xl border border-[var(--color-borde)] hover:border-[#FACC15] text-xs font-bold hover:bg-[#FACC15]/10 text-[#CA8A04] dark:text-[#FACC15] transition-all cursor-pointer"
            >
              Ver más ventas ({filteredOrders.length - visibleCount} restantes)
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          4. MODAL DETALLE Y GESTIÓN COMPLETA DEL PEDIDO
      ========================================================================== */}
      {isDetailOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--color-superficie)] text-[var(--color-texto)] rounded-3xl border border-[var(--color-borde)] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
            {/* Header Modal Fijo */}
            <div className="p-4 sm:p-6 border-b border-[var(--color-borde)] flex items-start justify-between shrink-0 bg-[var(--color-superficie)]">
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
                className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center cursor-pointer opacity-70 hover:opacity-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido Scrollable */}
            <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">

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

            {/* Sección de Logística y Envío (Fase 6) */}
            <div className="bg-[var(--color-fondo)]/40 p-4 rounded-2xl border border-[var(--color-borde)] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Logística & Envío</span>
                </h3>

                {selectedShipment && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      selectedShipment.estado === 'entregado'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : selectedShipment.estado === 'error'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          : ['en_camino', 'despachado'].includes(selectedShipment.estado)
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {selectedShipment.estado}
                  </span>
                )}
              </div>

              {loadingShipment ? (
                <div className="py-4 flex items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Consultando datos del envío...</span>
                </div>
              ) : selectedShipment ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="opacity-60 block">Transportista:</span>
                      <span className="font-bold uppercase">{selectedShipment.provider}</span>
                    </div>
                    <div>
                      <span className="opacity-60 block">Modalidad:</span>
                      <span className="font-semibold capitalize">{selectedShipment.modalidad || 'Domicilio'}</span>
                    </div>

                    {selectedShipment.tracking_number && (
                      <div className="sm:col-span-2 bg-black/[0.03] dark:bg-white/[0.03] p-2.5 rounded-xl border border-[var(--color-borde)]/60">
                        <span className="opacity-60 text-[11px] block">Número de Guía / Tracking:</span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-mono font-bold text-sm">{selectedShipment.tracking_number}</span>
                          {selectedShipment.tracking_url && (
                            <a
                              href={selectedShipment.tracking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                            >
                              <span>Seguir en carrier</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedShipment.error_message && (
                      <div className="sm:col-span-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400">
                        <span className="font-bold block">Error registrado:</span>
                        <p className="mt-0.5">{selectedShipment.error_message}</p>
                      </div>
                    )}
                  </div>

                  {/* Botones de acción logística */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--color-borde)]/40">
                    {/* Botón Imprimir Etiqueta */}
                    {['creado', 'etiquetado', 'despachado', 'en_camino'].includes(selectedShipment.estado) && (
                      <a
                        href={`/api/tienda/admin/envios/${selectedShipment.id}/label`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Imprimir Etiqueta PDF</span>
                      </a>
                    )}

                    {/* Botón Reintentar Envío */}
                    {['error', 'pendiente'].includes(selectedShipment.estado) && (
                      <button
                        type="button"
                        disabled={shippingActionLoading}
                        onClick={() => handleRetryShipment(selectedShipment.id)}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-xs disabled:opacity-50"
                      >
                        {shippingActionLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span>Reintentar Emisión</span>
                      </button>
                    )}

                    {/* Botón Cancelar Envío */}
                    {!['despachado', 'en_camino', 'entregado', 'cancelado'].includes(selectedShipment.estado) && (
                      <button
                        type="button"
                        disabled={shippingActionLoading}
                        onClick={() => handleCancelShipment(selectedShipment.id)}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-xs disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancelar Envío</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : selectedOrder.envio_tipo === 'retiro_local' ? (
                <div className="text-xs">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Retiro en local del vendedor
                  </p>
                  <p className="text-slate-500 mt-0.5">
                    {store.retiro_local_direccion || 'Dirección de retiro a coordinar'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  {Number(selectedOrder.costo_envio) > 0
                    ? `Envío acordado ($${Number(selectedOrder.costo_envio).toLocaleString('es-AR')})`
                    : 'Sin servicio de paquetería registrado para este pedido.'}
                </p>
              )}
            </div>

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
      </div>
    )}

      {/* =========================================================================
          5. MODAL NUEVA VENTA MANUAL (Control Total del Negocio)
      ========================================================================== */}
      {isNewSaleOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--color-superficie)] text-[var(--color-texto)] rounded-3xl border border-[var(--color-borde)] w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden">
            {/* Header Modal Fijo */}
            <div className="p-4 sm:p-6 border-b border-[var(--color-borde)] flex items-start justify-between shrink-0 bg-[var(--color-superficie)]">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Control de Negocio
                </span>
                <h2 className="text-xl font-bold font-[var(--font-heading)] mt-0.5 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#CA8A04] dark:text-[#FACC15]" />
                  <span>Registrar Nueva Venta Manual</span>
                </h2>
                <p className="text-xs opacity-70 mt-1">
                  Ingresa ventas de mostrador, pedidos telefónicos o directas seleccionando tus productos oficiales.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSaleOpen(false)}
                className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center cursor-pointer opacity-70 hover:opacity-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateManualSale}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                  e.preventDefault()
                }
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              {/* Cuerpo Scrollable */}
              <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
                {saleError && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{saleError}</span>
                  </div>
                )}

                {/* Sección A: Selección de Cliente */}
                <div className="space-y-3 bg-[var(--color-fondo)]/40 p-4 rounded-2xl border border-[var(--color-borde)]">
                  <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                    1. Cliente
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'consumidor_final', label: 'Consumidor Final' },
                      { key: 'existente', label: 'De la Lista' },
                      { key: 'nuevo', label: '+ Cliente Nuevo' },
                    ].map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setClienteTipo(t.key as any)}
                        className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          clienteTipo === t.key
                            ? 'bg-[#FACC15] text-[#1F2937] shadow-xs'
                            : 'border border-[var(--color-borde)] opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {clienteTipo === 'existente' && (
                    <div className="pt-2 space-y-1.5">
                      <label className="text-[11px] font-semibold opacity-70 block">Seleccionar cliente registrado:</label>
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                      >
                        <option value="">-- Elige un cliente --</option>
                        {initialCustomers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre} {c.telefono ? `(${c.telefono})` : ''} {c.email ? `· ${c.email}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {clienteTipo === 'nuevo' && (
                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="space-y-1">
                        <span className="font-semibold opacity-70 block">Nombre y Apellido *</span>
                        <input
                          type="text"
                          required
                          value={manualNombre}
                          onChange={(e) => setManualNombre(e.target.value)}
                          placeholder="Ej: Laura Gómez"
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="font-semibold opacity-70 block">WhatsApp / Teléfono</span>
                        <input
                          type="text"
                          value={manualTelefono}
                          onChange={(e) => setManualTelefono(e.target.value)}
                          placeholder="Ej: 3415866464"
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="font-semibold opacity-70 block">Email (Opcional)</span>
                        <input
                          type="email"
                          value={manualEmail}
                          onChange={(e) => setManualEmail(e.target.value)}
                          placeholder="cliente@gmail.com"
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Sección B: Selección de Productos con Buscador Desplegable Interactivo */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                      2. Productos de la Venta
                    </label>
                    <span className="text-[11px] opacity-60">
                      {manualItems.length} {manualItems.length === 1 ? 'producto cargado' : 'productos cargados'}
                    </span>
                  </div>

                  {/* Combobox desplegable con filtro interactivo en tiempo real */}
                  <div ref={comboboxRef} className="relative space-y-1.5">
                    <span className="text-[11px] font-semibold opacity-70 block">
                      Escribe en la lista para filtrar cualquier producto o variante:
                    </span>

                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                      <input
                        type="text"
                        value={productSearchQuery}
                        onFocus={() => setComboboxOpen(true)}
                        onChange={(e) => {
                          setProductSearchQuery(e.target.value)
                          setComboboxOpen(true)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            if (filteredProductOptions.length > 0) {
                              const first = filteredProductOptions[0]
                              handleAddManualItem(first.productId, first.variantId)
                              setProductSearchQuery('')
                              setComboboxOpen(false)
                            }
                          } else if (e.key === 'Escape') {
                            setComboboxOpen(false)
                          }
                        }}
                        placeholder="Escribe producto o variante (ej: PLA, Rojo, Filar, Soporte)..."
                        className="w-full min-h-[46px] pl-10 pr-20 py-2.5 rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15] shadow-xs"
                      />

                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {productSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setProductSearchQuery('')
                              setComboboxOpen(true)
                            }}
                            className="min-h-[32px] min-w-[32px] rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center opacity-50 hover:opacity-100 cursor-pointer"
                            title="Limpiar búsqueda"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setComboboxOpen((prev) => !prev)}
                          className="min-h-[36px] min-w-[36px] rounded-xl hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center opacity-70 hover:opacity-100 cursor-pointer"
                          title="Desplegar catálogo"
                        >
                          {comboboxOpen ? (
                            <ChevronUp className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Menú Flotante Desplegable */}
                    {comboboxOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-64 overflow-y-auto rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] shadow-2xl divide-y divide-[var(--color-borde)]/40 animate-in fade-in zoom-in-95 duration-100">
                        {filteredProductOptions.length === 0 ? (
                          <div className="p-4 text-center text-xs opacity-60">
                            No se encontraron productos ni variantes con &quot;{productSearchQuery}&quot;
                          </div>
                        ) : (
                          filteredProductOptions.map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                handleAddManualItem(opt.productId, opt.variantId)
                                setProductSearchQuery('')
                                setComboboxOpen(false)
                              }}
                              className="w-full text-left p-3 sm:p-3.5 hover:bg-[#FACC15]/10 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-xs sm:text-sm text-[var(--color-texto)] truncate group-hover:text-[#CA8A04] dark:group-hover:text-[#FACC15]">
                                  {opt.productName}
                                </div>
                                {opt.variantName && (
                                  <span className="inline-block text-[11px] font-semibold text-[#CA8A04] dark:text-[#FACC15]">
                                    Variante: {opt.variantName}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {opt.gestionaStock && opt.stock !== null ? (
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                      opt.stock > 0
                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                                    }`}
                                  >
                                    Stock: {opt.stock}
                                  </span>
                                ) : (
                                  <span className="text-[10px] opacity-50">Stock libre</span>
                                )}

                                <span className="font-mono font-bold text-xs sm:text-sm">
                                  ${opt.price.toLocaleString('es-AR')}
                                </span>

                                <div className="min-h-[30px] min-w-[30px] rounded-lg bg-[#FACC15]/20 text-[#1F2937] dark:text-[#FACC15] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Lista de productos agregados a la venta */}
                  {manualItems.length > 0 ? (
                    <div className="divide-y divide-[var(--color-borde)] border border-[var(--color-borde)] rounded-2xl overflow-hidden bg-[var(--color-fondo)]/20 text-xs">
                      {manualItems.map((it, idx) => (
                        <div key={idx} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm text-[var(--color-texto)] truncate">
                              {it.nombre}
                            </div>
                            {it.variante && (
                              <span className="text-[11px] text-[#CA8A04] dark:text-[#FACC15] block">
                                Variante: {it.variante}
                              </span>
                            )}
                          </div>

                          {/* Cantidad y Precio unitario editable */}
                          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] opacity-60">Cant:</span>
                              <input
                                type="number"
                                min="1"
                                max="999"
                                value={it.cantidad}
                                onChange={(e) => handleUpdateManualItemQty(idx, parseInt(e.target.value) || 1)}
                                className="w-14 min-h-[36px] text-center px-1 py-1 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] font-bold text-xs"
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-[10px] opacity-60">$ Unit:</span>
                              <input
                                type="number"
                                min="0"
                                step="10"
                                value={it.precio_unitario}
                                onChange={(e) => handleUpdateManualItemPrice(idx, parseFloat(e.target.value) || 0)}
                                className="w-24 min-h-[36px] text-right px-1.5 py-1 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] font-bold text-xs"
                              />
                            </div>

                            <span className="font-mono font-bold text-xs w-20 text-right">
                              ${(it.precio_unitario * it.cantidad).toLocaleString('es-AR')}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleRemoveManualItem(idx)}
                              className="min-h-[36px] min-w-[36px] text-rose-500 hover:bg-rose-500/10 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                              title="Quitar este producto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="p-3 bg-[var(--color-fondo)]/40 flex justify-between items-center font-bold text-sm">
                        <span>Total de la Venta:</span>
                        <span className="text-base text-[#CA8A04] dark:text-[#FACC15] font-mono font-black">
                          ${manualTotal.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-[var(--color-borde)] text-center text-xs opacity-60">
                      Aún no agregaste productos. Haz clic en el buscador superior para seleccionar el primer producto o variante.
                    </div>
                  )}
                </div>

                {/* Sección C: Parámetros de Cobro y Entrega */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-[var(--color-fondo)]/40 p-4 rounded-2xl border border-[var(--color-borde)]">
                  <div className="space-y-1.5">
                    <label className="font-bold uppercase tracking-wider opacity-70 block">
                      Forma de Cobro
                    </label>
                    <select
                      value={manualMetodoPago}
                      onChange={(e) => setManualMetodoPago(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                    >
                      <option value="efectivo">Efectivo (Mostrador)</option>
                      <option value="transferencia">Transferencia Bancaria</option>
                      <option value="mercadopago">Mercado Pago / Débito</option>
                      <option value="acordar">A convenir / Cuenta Corriente</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold uppercase tracking-wider opacity-70 block">
                      Entrega
                    </label>
                    <select
                      value={manualTipoEntrega}
                      onChange={(e) => setManualTipoEntrega(e.target.value as any)}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                    >
                      <option value="retiro">Entregado en local / Retiro</option>
                      <option value="envio">Envío a domicilio</option>
                      <option value="acordar">A coordinar</option>
                    </select>
                  </div>

                  {/* Checkbox Descontar Stock */}
                  <div className="sm:col-span-2 pt-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="descontarStock"
                      checked={manualDescontarStock}
                      onChange={(e) => setManualDescontarStock(e.target.checked)}
                      className="w-4 h-4 rounded text-[#FACC15] focus:ring-[#FACC15] cursor-pointer"
                    />
                    <label htmlFor="descontarStock" className="cursor-pointer font-semibold select-none">
                      Descontar automáticamente las cantidades del stock disponible de la tienda
                    </label>
                  </div>

                  {/* Notas adicionales */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-semibold opacity-70 block">Notas de la Venta (Opcional)</label>
                    <input
                      type="text"
                      value={manualNotas}
                      onChange={(e) => setManualNotas(e.target.value)}
                      placeholder="Ej: Descuento aplicado por cliente habitual / Seña previa"
                      className="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Fijo con Botones */}
              <div className="p-4 sm:p-6 border-t border-[var(--color-borde)] bg-[var(--color-superficie)] flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewSaleOpen(false)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[var(--color-borde)] text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={creatingSale || manualItems.length === 0}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] font-bold text-xs sm:text-sm hover:bg-[#eab308] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {creatingSale ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
                      <span>Registrando venta...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#1F2937]" />
                      <span>Guardar Venta (${manualTotal.toLocaleString('es-AR')})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
