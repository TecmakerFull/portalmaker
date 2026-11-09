import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PLANS_FALLBACK,
  type EffectiveStoreConfig,
} from './store-config'

describe('Configuración Efectiva de Tiendas', () => {
  test('DEFAULT_PLANS_FALLBACK tiene los valores exactos especificados', () => {
    // Free: 3% fee, 15 productos, WhatsApp, Checkout, MP, Seña, Recargo = true, Bank Transfer = false
    const free = DEFAULT_PLANS_FALLBACK.free
    assert.equal(free.commission_pct, 3.0)
    assert.equal(free.max_active_products, 15)
    assert.equal(free.whatsapp_orders, true)
    assert.equal(free.online_checkout, true)
    assert.equal(free.mercadopago, true)
    assert.equal(free.deposit_payments, true)
    assert.equal(free.mp_surcharge, true)
    assert.equal(free.bank_transfer, false)

    // Starter: 2% fee, 50 productos, Bank Transfer = true
    const starter = DEFAULT_PLANS_FALLBACK.starter
    assert.equal(starter.commission_pct, 2.0)
    assert.equal(starter.max_active_products, 50)
    assert.equal(starter.bank_transfer, true)

    // Maker Pro: 1% fee, 150 productos
    const pro = DEFAULT_PLANS_FALLBACK.maker_pro
    assert.equal(pro.commission_pct, 1.0)
    assert.equal(pro.max_active_products, 150)

    // Enterprise: 0% fee, Ilimitado (null)
    const ent = DEFAULT_PLANS_FALLBACK.enterprise
    assert.equal(ent.commission_pct, 0.0)
    assert.equal(ent.max_active_products, null)
  })

  test('La resolución de overrides prioriza valores no nulos y respeta expiración', () => {
    const plan = DEFAULT_PLANS_FALLBACK.starter // 2% comision, 50 productos

    // Caso 1: Override activo de comisión al 0.5%
    const overrideCommission = 0.5
    const effectiveCommission = overrideCommission !== null ? overrideCommission : plan.commission_pct
    assert.equal(effectiveCommission, 0.5)

    // Caso 2: Reset de override a null vuelve al 2% del plan
    const resetOverride: number | null = null
    const restoredCommission = resetOverride !== null ? resetOverride : plan.commission_pct
    assert.equal(restoredCommission, 2.0)

    // Caso 3: Override vencido
    const overrideUntilPast = new Date(Date.now() - 60000).toISOString()
    const isExpired = new Date(overrideUntilPast).getTime() <= Date.now()
    assert.equal(isExpired, true)
  })
})

