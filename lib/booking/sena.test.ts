// =============================================================================
// PORTALMAKER — Tests del cálculo de seña de turnos
// =============================================================================

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calcularSena } from './sena'

describe('Seña de turnos', () => {
  it('sin seña devuelve 0', () => {
    assert.equal(calcularSena(15000, 'ninguna', 50), 0)
  })

  it('porcentaje del precio', () => {
    assert.equal(calcularSena(15000, 'porcentaje', 30), 4500)
  })

  it('el porcentaje no supera el 100%', () => {
    assert.equal(calcularSena(10000, 'porcentaje', 150), 10000)
  })

  it('monto fijo nunca mayor al precio', () => {
    assert.equal(calcularSena(5000, 'monto', 8000), 5000)
    assert.equal(calcularSena(20000, 'monto', 8000), 8000)
  })

  it('monto fijo con servicio sin precio cargado', () => {
    assert.equal(calcularSena(0, 'monto', 3000), 3000)
  })

  it('pago total', () => {
    assert.equal(calcularSena(12500.5, 'total', 0), 12500.5)
  })

  it('redondea a centavos', () => {
    assert.equal(calcularSena(9999, 'porcentaje', 33), 3299.67)
  })

  it('ignora valores negativos o inválidos', () => {
    assert.equal(calcularSena(-100, 'total', 0), 0)
    assert.equal(calcularSena(1000, 'porcentaje', Number.NaN), 0)
  })
})
