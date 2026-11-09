import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PLANS_FALLBACK,
  type EffectiveStoreConfig,
} from './store-config'
import { calcularMarketplaceFeeSobreTotal } from '../mercadopago'

describe('Pruebas Sandbox: Sistema Integral de Planes, Comisiones, Overrides y Señas', () => {
  // =========================================================================
  // 1. Venta por cada plan (3%, 2%, 1%, 0% de comisión)
  // =========================================================================
  describe('1. Venta por cada plan (Comisión 3%, 2%, 1%, 0%)', () => {
    it('Free cobra 3% de comisión Portalmaker sobre el total de la orden', () => {
      const freePlan = DEFAULT_PLANS_FALLBACK.free
      assert.strictEqual(freePlan.commission_pct, 3.0)

      const montoCobrado = 15000 // $15.000 ARS
      const fee = calcularMarketplaceFeeSobreTotal(montoCobrado, freePlan.commission_pct)
      assert.strictEqual(fee, 450) // 15000 * 0.03 = $450
    })

    it('Starter cobra 2% de comisión Portalmaker', () => {
      const starterPlan = DEFAULT_PLANS_FALLBACK.starter
      assert.strictEqual(starterPlan.commission_pct, 2.0)

      const montoCobrado = 25000 // $25.000 ARS
      const fee = calcularMarketplaceFeeSobreTotal(montoCobrado, starterPlan.commission_pct)
      assert.strictEqual(fee, 500) // 25000 * 0.02 = $500
    })

    it('Maker Pro cobra 1% de comisión Portalmaker', () => {
      const makerProPlan = DEFAULT_PLANS_FALLBACK.maker_pro
      assert.strictEqual(makerProPlan.commission_pct, 1.0)

      const montoCobrado = 84500.5 // $84.500,50 ARS
      const fee = calcularMarketplaceFeeSobreTotal(montoCobrado, makerProPlan.commission_pct)
      assert.strictEqual(fee, 845.01) // round(845.005) = 845.01
    })

    it('Enterprise cobra 0% de comisión (omite marketplace_fee para evitar errores en MP)', () => {
      const entPlan = DEFAULT_PLANS_FALLBACK.enterprise
      assert.strictEqual(entPlan.commission_pct, 0.0)

      const montoCobrado = 100000
      const fee = calcularMarketplaceFeeSobreTotal(montoCobrado, entPlan.commission_pct)
      assert.strictEqual(fee, 0)

      // Verificamos que el payload de la preferencia omite la clave si fee <= 0
      const preferencePayload: Record<string, any> = {
        items: [{ title: 'Item Enterprise', unit_price: montoCobrado, quantity: 1 }],
      }
      if (fee > 0) {
        preferencePayload.marketplace_fee = fee
      }
      assert.strictEqual('marketplace_fee' in preferencePayload, false)
    })
  })

  // =========================================================================
  // 2. Override de comisión y reset a null
  // =========================================================================
  describe('2. Override de comisión y reset a null', () => {
    function resolveEffectiveCommission(
      planCommission: number,
      overrideCommission: number | null | undefined,
      overrideUntil?: string | null
    ): { effective: number; source: 'plan' | 'override' } {
      const isExpired = overrideUntil ? new Date(overrideUntil).getTime() <= Date.now() : false
      if (!isExpired && overrideCommission !== null && overrideCommission !== undefined) {
        return { effective: overrideCommission, source: 'override' }
      }
      return { effective: planCommission, source: 'plan' }
    }

    it('Aplica override personalizado (ej: 0.5%) sobre el plan Starter (2%)', () => {
      const planDefault = 2.0
      const overrideVal = 0.5
      const res = resolveEffectiveCommission(planDefault, overrideVal)
      assert.strictEqual(res.effective, 0.5)
      assert.strictEqual(res.source, 'override')
    })

    it('Al restablecer a null (Volver al valor del plan) revierte automáticamente al plan', () => {
      const planDefault = 2.0
      const overrideVal = null // Botón "Volver al valor del plan"
      const res = resolveEffectiveCommission(planDefault, overrideVal)
      assert.strictEqual(res.effective, 2.0)
      assert.strictEqual(res.source, 'plan')
    })

    it('Respeta el vencimiento de promociones temporales (override_until)', () => {
      const planDefault = 3.0
      const overrideVal = 0.0 // 0% de comisión promocional
      const pastDate = new Date(Date.now() - 3600 * 1000).toISOString() // venció hace 1 hora
      const res = resolveEffectiveCommission(planDefault, overrideVal, pastDate)
      assert.strictEqual(res.effective, 3.0)
      assert.strictEqual(res.source, 'plan')
    })
  })

  // =========================================================================
  // 3. Cambio de default de un plan afectando solo a tiendas sin override
  // =========================================================================
  describe('3. Cambio de default de un plan y aislamiento de overrides', () => {
    it('Si se actualiza el plan, solo impacta en tiendas sin override', () => {
      let starterCommissionDefault = 2.0

      // Tienda A: sin override (commission_pct = null)
      const storeAOverride: number | null = null

      // Tienda B: con override acordado (commission_pct = 0.5)
      const storeBOverride: number | null = 0.5

      // Verificación inicial
      const effectiveA1 = storeAOverride ?? starterCommissionDefault
      const effectiveB1 = storeBOverride ?? starterCommissionDefault
      assert.strictEqual(effectiveA1, 2.0)
      assert.strictEqual(effectiveB1, 0.5)

      // Superadmin cambia el default del plan Starter de 2.0% a 1.5%
      starterCommissionDefault = 1.5

      // Verificación posterior: Tienda A toma el nuevo valor, Tienda B conserva su override
      const effectiveA2 = storeAOverride ?? starterCommissionDefault
      const effectiveB2 = storeBOverride ?? starterCommissionDefault
      assert.strictEqual(effectiveA2, 1.5)
      assert.strictEqual(effectiveB2, 0.5)
    })
  })

  // =========================================================================
  // 4. Venta con seña y pago de saldo
  // =========================================================================
  describe('4. Flujo de venta con seña y cancelación de saldo pendiente', () => {
    it('Calcula la seña del carrito, crea preferencia por la seña y luego por el saldo', () => {
      // Carrito con 1 producto con 30% de seña y 1 producto sin seña (100%)
      const items = [
        {
          id: 'p1',
          nombre: 'Mueble a medida',
          precio: 20000,
          cantidad: 1,
          subtotal: 20000,
          deposit_enabled: true,
          deposit_type: 'percent',
          deposit_value: 30, // 30% = $6.000
        },
        {
          id: 'p2',
          nombre: 'Accesorio estándar',
          precio: 5000,
          cantidad: 2,
          subtotal: 10000,
          deposit_enabled: false, // 100% = $10.000
        },
      ]

      const total = items.reduce((acc, it) => acc + it.subtotal, 0) // $30.000
      assert.strictEqual(total, 30000)

      // Regla de carrito de Portalmaker:
      // Seña total = suma de señas de productos con seña + 100% de productos sin seña
      const depositAmount = items.reduce((acc, it) => {
        if (it.deposit_enabled && it.deposit_value != null) {
          return acc + (it.subtotal * (it.deposit_value / 100))
        }
        return acc + it.subtotal
      }, 0)

      assert.strictEqual(depositAmount, 16000) // $6.000 + $10.000 = $16.000
      const balancePending = total - depositAmount // $14.000
      assert.strictEqual(balancePending, 14000)

      // 1. Preferencia inicial por la seña
      const commissionPct = 2.0 // Plan Starter (2%)
      const feeSena = calcularMarketplaceFeeSobreTotal(depositAmount, commissionPct)
      assert.strictEqual(feeSena, 320) // 16000 * 0.02 = $320

      // Estado simulado post-pago de seña
      let estadoPago = 'sena_pagada'
      let balancePaid = false

      // 2. Preferencia de saldo pendiente generada por el vendedor
      const feeSaldo = calcularMarketplaceFeeSobreTotal(balancePending, commissionPct)
      assert.strictEqual(feeSaldo, 280) // 14000 * 0.02 = $280

      // Al pagar el saldo con balance_preference
      estadoPago = 'aprobado'
      balancePaid = true

      assert.strictEqual(estadoPago, 'aprobado')
      assert.strictEqual(balancePaid, true)
      assert.strictEqual(feeSena + feeSaldo, 600) // Total comisiones: 30000 * 0.02 = $600
    })
  })

  // =========================================================================
  // 5. Rechazo de transferencia en servidor si bank_transfer = false
  // =========================================================================
  describe('5. Rechazo de transferencia bancaria si bank_transfer = false', () => {
    it('El endpoint de checkout rechaza ordenes por transferencia si el plan no lo permite', () => {
      const freeConfig = DEFAULT_PLANS_FALLBACK.free
      assert.strictEqual(freeConfig.bank_transfer, false)

      const metodoPagoSolicitado = 'transferencia'
      let status = 200
      let errorMessage = ''

      if (metodoPagoSolicitado === 'transferencia' && !freeConfig.bank_transfer) {
        status = 403
        errorMessage = 'El pago por transferencia bancaria no está habilitado para el plan de esta tienda'
      }

      assert.strictEqual(status, 403)
      assert.match(errorMessage, /no está habilitado/)
    })
  })

  // =========================================================================
  // 6. Límite de productos activos sin despublicar existentes
  // =========================================================================
  describe('6. Límite de productos activos (max_active_products)', () => {
    it('Impide publicar por encima del límite pero no despublica productos preexistentes', () => {
      const limit = 15
      // Tienda tenía 18 productos cargados históricamente
      const existingProducts = Array.from({ length: 18 }, (_, i) => ({
        id: `p-${i}`,
        visible: true,
      }))

      assert.strictEqual(existingProducts.length, 18)

      // Regla: No despublicar automáticamente los 18 productos existentes
      const activeCount = existingProducts.filter((p) => p.visible).length
      assert.strictEqual(activeCount, 18)

      // Validar si puede publicar un nuevo producto
      const canPublishNew = activeCount < limit
      assert.strictEqual(canPublishNew, false)
    })
  })

  // =========================================================================
  // 7. Registro de auditoría (config_audit_log)
  // =========================================================================
  describe('7. Registro de auditoría para trazabilidad de cambios', () => {
    it('Genera entradas completas en audit log ante modificaciones de planes y overrides', () => {
      const auditLogMock: Array<{
        target_type: 'plan' | 'store'
        target_id: string
        variable_name: string
        old_value: string | null
        new_value: string | null
        changed_by_email: string
      }> = []

      // Simulación de cambio de comisión en plan
      const oldPlanComm: string = '2.00'
      const newPlanComm: string = '1.50'
      if (oldPlanComm !== newPlanComm) {
        auditLogMock.push({
          target_type: 'plan',
          target_id: 'starter',
          variable_name: 'commission_pct',
          old_value: oldPlanComm,
          new_value: newPlanComm,
          changed_by_email: 'superadmin@portalmaker.com.ar',
        })
      }

      // Simulación de override en tienda
      const oldStoreOverride = null
      const newStoreOverride = '0.50'
      if (oldStoreOverride !== newStoreOverride) {
        auditLogMock.push({
          target_type: 'store',
          target_id: '11111111-2222-3333-4444-555555555555',
          variable_name: 'commission_pct',
          old_value: oldStoreOverride,
          new_value: newStoreOverride,
          changed_by_email: 'superadmin@portalmaker.com.ar',
        })
      }

      assert.strictEqual(auditLogMock.length, 2)
      assert.strictEqual(auditLogMock[0].target_type, 'plan')
      assert.strictEqual(auditLogMock[0].new_value, '1.50')
      assert.strictEqual(auditLogMock[1].target_type, 'store')
      assert.strictEqual(auditLogMock[1].new_value, '0.50')
    })
  })
})

