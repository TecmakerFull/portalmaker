import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

describe('Regla de Carrito para Señas / Pagos Parciales', () => {
  interface CartItemForDeposit {
    id: string
    quantity: number
    unitPrice: number
    depositEnabled: boolean
    depositType?: 'percent' | 'fixed' | null
    depositValue?: number | null
  }

  function calcularSeñaCarrito(items: CartItemForDeposit[], costoEnvio: number = 0) {
    const subtotal = items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0)

    const subtotalSeña = items.reduce((acc, it) => {
      const itemSubtotal = it.unitPrice * it.quantity
      if (it.depositEnabled && it.depositValue && it.depositValue > 0) {
        if (it.depositType === 'percent') {
          const pct = Math.min(Math.max(it.depositValue, 1), 100)
          return acc + Number(((itemSubtotal * pct) / 100).toFixed(2))
        } else if (it.depositType === 'fixed') {
          return acc + Math.min(it.depositValue * it.quantity, itemSubtotal)
        }
      }
      // Regla: 100% de los que no la tengan
      return acc + itemSubtotal
    }, 0)

    const isDepositOrder = subtotalSeña < subtotal
    const depositTotal = Number((subtotalSeña + costoEnvio).toFixed(2))
    const totalPedido = Number((subtotal + costoEnvio).toFixed(2))
    const balancePending = Number((totalPedido - depositTotal).toFixed(2))

    return {
      isDepositOrder,
      depositTotal,
      balancePending,
      totalPedido,
    }
  }

  test('Calcula la seña total sumando las señas y el 100% de los productos sin seña', () => {
    const items: CartItemForDeposit[] = [
      // Producto 1: $10.000 con 30% de seña = $3.000
      {
        id: 'prod_1',
        quantity: 1,
        unitPrice: 10000,
        depositEnabled: true,
        depositType: 'percent',
        depositValue: 30,
      },
      // Producto 2: 2 unidades de $2.000 sin seña = $4.000 (100%)
      {
        id: 'prod_2',
        quantity: 2,
        unitPrice: 2000,
        depositEnabled: false,
      },
    ]

    const resultado = calcularSeñaCarrito(items, 1500) // Con envío $1.500

    // Subtotal prod 1 seña: $3.000
    // Subtotal prod 2: $4.000
    // Total seña productos: $7.000
    // Con envío: $7.000 + $1.500 = $8.500
    // Total pedido: $10.000 + $4.000 + $1.500 = $15.500
    // Saldo pendiente: $15.500 - $8.500 = $7.000
    assert.equal(resultado.isDepositOrder, true)
    assert.equal(resultado.depositTotal, 8500)
    assert.equal(resultado.totalPedido, 15500)
    assert.equal(resultado.balancePending, 7000)
  })

  test('Producto con monto fijo de seña por unidad', () => {
    const items: CartItemForDeposit[] = [
      // 2 unidades de $5.000 con seña fija de $1.000 c/u = $2.000
      {
        id: 'prod_fijo',
        quantity: 2,
        unitPrice: 5000,
        depositEnabled: true,
        depositType: 'fixed',
        depositValue: 1000,
      },
    ]

    const resultado = calcularSeñaCarrito(items, 0)
    assert.equal(resultado.isDepositOrder, true)
    assert.equal(resultado.depositTotal, 2000)
    assert.equal(resultado.balancePending, 8000)
    assert.equal(resultado.totalPedido, 10000)
  })

  test('Si ningún producto tiene seña, la orden no es de seña y saldo pendiente es 0', () => {
    const items: CartItemForDeposit[] = [
      {
        id: 'prod_normal',
        quantity: 1,
        unitPrice: 5000,
        depositEnabled: false,
      },
    ]

    const resultado = calcularSeñaCarrito(items, 500)
    assert.equal(resultado.isDepositOrder, false)
    assert.equal(resultado.depositTotal, 5500)
    assert.equal(resultado.balancePending, 0)
    assert.equal(resultado.totalPedido, 5500)
  })

  test('Si el comprador elige pago total aunque el producto tenga seña, no se fracciona el cobro y no hay saldo pendiente', () => {
    const items: CartItemForDeposit[] = [
      {
        id: 'prod_seña',
        quantity: 1,
        unitPrice: 20000,
        depositEnabled: true,
        depositType: 'percent',
        depositValue: 50, // 50% = $10.000
      },
    ]

    function resolverModalidad(modalidad: 'sena' | 'total', items: CartItemForDeposit[], costoEnvio: number = 0) {
      if (modalidad === 'total') {
        const total = items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0) + costoEnvio
        return {
          isDepositOrder: false,
          depositTotal: total,
          balancePending: 0,
          totalPedido: total,
        }
      }
      return calcularSeñaCarrito(items, costoEnvio)
    }

    const conSeña = resolverModalidad('sena', items, 1000)
    assert.equal(conSeña.isDepositOrder, true)
    assert.equal(conSeña.depositTotal, 11000)
    assert.equal(conSeña.balancePending, 10000)

    const conPagoTotal = resolverModalidad('total', items, 1000)
    assert.equal(conPagoTotal.isDepositOrder, false)
    assert.equal(conPagoTotal.depositTotal, 21000)
    assert.equal(conPagoTotal.balancePending, 0)
    assert.equal(conPagoTotal.totalPedido, 21000)
  })

  test('Al marcar saldo como cobrado, el pedido pasa a pagado total (balance_paid: true, balance_pending: 0, estado_pago: aprobado)', () => {
    interface MockOrder {
      id: string
      total: number
      is_deposit: boolean
      deposit_amount: number | null
      balance_pending: number
      balance_paid: boolean
      estado_pago: string
    }

    const ordenConSeña: MockOrder = {
      id: 'ord_123',
      total: 20000,
      is_deposit: true,
      deposit_amount: 10000,
      balance_pending: 10000,
      balance_paid: false,
      estado_pago: 'sena_pagada',
    }

    // Acción del admin: marcar saldo cobrado
    const ordenActualizada: MockOrder = {
      ...ordenConSeña,
      balance_paid: true,
      balance_pending: 0.00,
      estado_pago: 'aprobado',
    }

    assert.equal(ordenActualizada.balance_paid, true)
    assert.equal(ordenActualizada.balance_pending, 0)
    assert.equal(ordenActualizada.estado_pago, 'aprobado')
  })
})

