// =============================================================================
// PORTALMAKER — Contexto y Hook de Carrito de Compras / Reservas
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

export interface CartItem {
  id: string // `${productId}_${variantId || 'default'}`
  productId: string
  productSlug: string
  productName: string
  imagenUrl: string | null
  variantId?: string | null
  variantName?: string | null
  unitPrice: number
  originalPrice?: number | null
  quantity: number
  gestionaStock: boolean
  stockDisponible: number | null // null si no se gestiona stock
  isReserva: boolean // true si gestionaStock == false o stockDisponible <= 0
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'id' | 'quantity'>, quantityToAdd?: number) => { success: boolean; message?: string }
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, newQuantity: number) => { success: boolean; message?: string }
  clearCart: () => void
  totalItems: number
  totalAmount: number
  hasReservas: boolean // true si al menos un item es bajo pedido / reserva
  isCartOpen: boolean
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({
  storeId,
  children,
}: {
  storeId: string
  children: React.ReactNode
}) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const storageKey = `pm_cart_${storeId}`

  // Cargar carrito desde localStorage al montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setItems(parsed)
        }
      }
    } catch (e) {
      console.error('Error al cargar carrito:', e)
    }
    setMounted(true)
  }, [storageKey])

  // Guardar en localStorage cuando cambian los items
  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(items))
    } catch (e) {
      console.error('Error al guardar carrito:', e)
    }
  }, [items, storageKey, mounted])

  // Agregar item al carrito
  const addItem = useCallback(
    (newItem: Omit<CartItem, 'id' | 'quantity'>, quantityToAdd: number = 1): { success: boolean; message?: string } => {
      const itemId = `${newItem.productId}_${newItem.variantId || 'default'}`

      let result = { success: true, message: 'Producto agregado al carrito' }

      setItems((prevItems) => {
        const existingIndex = prevItems.findIndex((item) => item.id === itemId)

        if (existingIndex > -1) {
          const current = prevItems[existingIndex]
          const desiredQuantity = current.quantity + quantityToAdd

          // Si gestiona stock y hay límite disponible
          if (current.gestionaStock && current.stockDisponible !== null && current.stockDisponible > 0) {
            if (desiredQuantity > current.stockDisponible) {
              result = {
                success: false,
                message: `Solo hay ${current.stockDisponible} unidades disponibles en stock.`,
              }
              const updated = [...prevItems]
              updated[existingIndex] = { ...current, quantity: current.stockDisponible }
              return updated
            }
          }

          const updated = [...prevItems]
          updated[existingIndex] = { ...current, quantity: desiredQuantity }
          return updated
        } else {
          // Validar cantidad inicial contra stock si aplica
          let initialQty = quantityToAdd
          if (newItem.gestionaStock && newItem.stockDisponible !== null && newItem.stockDisponible > 0) {
            if (initialQty > newItem.stockDisponible) {
              initialQty = newItem.stockDisponible
              result = {
                success: false,
                message: `Se ajustó a ${newItem.stockDisponible} unidades (stock máximo disponible).`,
              }
            }
          }

          return [...prevItems, { ...newItem, id: itemId, quantity: initialQty }]
        }
      })

      return result
    },
    []
  )

  // Remover item del carrito
  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId))
  }, [])

  // Modificar cantidad
  const updateQuantity = useCallback(
    (itemId: string, newQuantity: number): { success: boolean; message?: string } => {
      if (newQuantity <= 0) {
        removeItem(itemId)
        return { success: true }
      }

      let result = { success: true, message: '' }

      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item

          // Validar contra stock si gestiona stock
          if (item.gestionaStock && item.stockDisponible !== null && item.stockDisponible > 0) {
            if (newQuantity > item.stockDisponible) {
              result = {
                success: false,
                message: `Stock máximo disponible: ${item.stockDisponible}`,
              }
              return { ...item, quantity: item.stockDisponible }
            }
          }

          return { ...item, quantity: newQuantity }
        })
      )

      return result
    },
    [removeItem]
  )

  // Vaciar carrito
  const clearCart = useCallback(() => {
    setItems([])
    try {
      localStorage.removeItem(storageKey)
    } catch (e) {}
  }, [storageKey])

  // Métricas calculadas
  const totalItems = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items])
  const totalAmount = useMemo(
    () => items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
    [items]
  )
  const hasReservas = useMemo(() => items.some((item) => item.isReserva), [items])

  const openCart = useCallback(() => setIsCartOpen(true), [])
  const closeCart = useCallback(() => setIsCartOpen(false), [])
  const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), [])

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalAmount,
        hasReservas,
        isCartOpen,
        openCart,
        closeCart,
        toggleCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart debe utilizarse dentro de un CartProvider')
  }
  return context
}
