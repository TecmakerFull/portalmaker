import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  addMonthAnchored, addDays, diffDays, computeNextDue, classifyCycle, resolveInvoiceAmount,
  resolveListPrice, canChooseTargetPlan, checkPaymentAmount, todayArgentina, buildPlanStorePatch, isBillablePlan,
} from './billing'

test('addMonthAnchored: sin ancla deriva, con ancla vuelve al día original', () => {
  assert.equal(addMonthAnchored('2026-01-31'), '2026-02-28')
  assert.equal(addMonthAnchored('2026-02-28'), '2026-03-28')
  assert.equal(addMonthAnchored('2026-02-28', 31), '2026-03-31')
  assert.equal(addMonthAnchored('2026-12-15'), '2027-01-15')
  assert.equal(addMonthAnchored('2028-01-31', 31), '2028-02-29') // bisiesto
})

test('addDays / diffDays', () => {
  assert.equal(addDays('2026-11-28', 5), '2026-12-03')
  assert.equal(diffDays('2026-11-10', '2026-11-17'), 7)
  assert.equal(diffDays('2026-11-10', '2026-11-09'), -1)
})

test('todayArgentina usa horario local (UTC-3), no UTC', () => {
  // 02:00 UTC del 11/11 son las 23:00 del 10/11 en Argentina
  assert.equal(todayArgentina(new Date('2026-11-11T02:00:00Z')), '2026-11-10')
})

test('computeNextDue: pago antes de vencer encadena sobre el vencimiento', () => {
  const r = computeNextDue(
    { plan: 'starter', fecha_proximo_vencimiento: '2026-11-20', estado_pago: 'pendiente', suscripcion_activa: true },
    '2026-11-13'
  )
  assert.deepEqual(r, { periodFrom: '2026-11-20', newDue: '2026-12-20', extended: true })
})

test('computeNextDue: en gracia (aun activa) tambien encadena', () => {
  const r = computeNextDue(
    { plan: 'starter', fecha_proximo_vencimiento: '2026-11-08', estado_pago: 'gracia', suscripcion_activa: true },
    '2026-11-10'
  )
  assert.equal(r.newDue, '2026-12-08')
})

test('computeNextDue: tienda pausada o venida de Free corre desde hoy', () => {
  const paused = computeNextDue(
    { plan: 'starter', fecha_proximo_vencimiento: '2026-10-01', estado_pago: 'vencido', suscripcion_activa: false },
    '2026-11-10'
  )
  assert.deepEqual(paused, { periodFrom: '2026-11-10', newDue: '2026-12-10', extended: false })
  const free = computeNextDue(
    { plan: 'free', fecha_proximo_vencimiento: null, estado_pago: 'al_dia', suscripcion_activa: true },
    '2026-01-31'
  )
  assert.equal(free.newDue, '2026-02-28')
})

test('computeNextDue: el ancla evita perder dias en fin de mes', () => {
  const r = computeNextDue(
    { plan: 'maker_pro', fecha_proximo_vencimiento: '2026-02-28', estado_pago: 'al_dia', suscripcion_activa: true },
    '2026-02-20',
    31
  )
  assert.equal(r.newDue, '2026-03-31')
})

test('classifyCycle: fases segun dias al vencimiento y gracia', () => {
  const base = { plan: 'starter', estado_pago: 'al_dia', dias_gracia: 5, fecha_proximo_vencimiento: '2026-11-20' }
  assert.equal(classifyCycle(base, '2026-11-13').phase, 'reminder_7d')
  assert.equal(classifyCycle(base, '2026-11-19').phase, 'reminder_1d')
  assert.equal(classifyCycle(base, '2026-11-15').phase, 'ok')
  assert.equal(classifyCycle(base, '2026-11-20').phase, 'ok') // el dia del vencimiento aun no es gracia
  assert.equal(classifyCycle(base, '2026-11-21').phase, 'in_grace')
  assert.equal(classifyCycle(base, '2026-11-25').phase, 'in_grace') // ultimo dia de gracia
  assert.equal(classifyCycle(base, '2026-11-26').phase, 'paused')
  assert.equal(classifyCycle(base, '2026-11-26').graceEnds, '2026-11-25')
})

test('classifyCycle: bonificado y sin vencimiento quedan fuera del ciclo', () => {
  assert.equal(classifyCycle({ plan: 'bonificado', estado_pago: 'al_dia', dias_gracia: 3, fecha_proximo_vencimiento: '2020-01-01' }, '2026-11-10').phase, 'exempt')
  assert.equal(classifyCycle({ plan: 'free', estado_pago: 'al_dia', dias_gracia: 3, fecha_proximo_vencimiento: null }, '2026-11-10').phase, 'exempt')
  assert.equal(classifyCycle({ plan: 'starter', estado_pago: 'bonificado', dias_gracia: 3, fecha_proximo_vencimiento: '2020-01-01' }, '2026-11-10').phase, 'exempt')
})

test('resolveInvoiceAmount: acuerdo en mismo plan, lista en upgrade', () => {
  assert.equal(resolveInvoiceAmount({ plan: 'starter', precio_mensual: 9000 }, 'starter', 12000), 9000)
  assert.equal(resolveInvoiceAmount({ plan: 'starter', precio_mensual: 9000 }, 'maker_pro', 25000), 25000)
  assert.equal(resolveInvoiceAmount({ plan: 'starter', precio_mensual: 0 }, 'starter', 12000), 12000)
  assert.equal(resolveInvoiceAmount({ plan: 'free', precio_mensual: 5000 }, 'starter', 12000), 12000)
})

test('resolveListPrice: tabla plans manda; si falta usa lib/plans', () => {
  assert.equal(resolveListPrice(15000, 'starter'), 15000)
  assert.equal(resolveListPrice(null, 'starter'), 12000)
  assert.equal(resolveListPrice(0, 'maker_pro'), 25000)
})

test('canChooseTargetPlan: bloquea free, bonificado, planes inexistentes y downgrade', () => {
  assert.equal(canChooseTargetPlan('free', 'starter'), true)
  assert.equal(canChooseTargetPlan('starter', 'starter'), true)
  assert.equal(canChooseTargetPlan('starter', 'enterprise'), true)
  assert.equal(canChooseTargetPlan('enterprise', 'starter'), false)
  assert.equal(canChooseTargetPlan('free', 'free'), false)
  assert.equal(canChooseTargetPlan('free', 'bonificado'), false)
  assert.equal(canChooseTargetPlan('bonificado', 'enterprise'), false)
  assert.equal(canChooseTargetPlan('free', 'cualquiera'), false)
  assert.equal(isBillablePlan('free'), false)
})

test('checkPaymentAmount: exacto, mayor y menor (sin errores de coma flotante)', () => {
  assert.equal(checkPaymentAmount(12000, 12000), 'exact')
  assert.equal(checkPaymentAmount(0.1 + 0.2, 0.3), 'exact')
  assert.equal(checkPaymentAmount(12000, 12000.5), 'over')
  assert.equal(checkPaymentAmount(12000, 11999.99), 'under')
})

test('buildPlanStorePatch: refleja la configuracion oficial del plan', () => {
  const p = buildPlanStorePatch('starter')
  assert.equal(p.limite_productos, 50)
  assert.equal(p.comision_portalmaker, 2)
  assert.equal(typeof p.features_override.max_colaboradores, 'number')
})

test('computeNextDue: ultimo dia de gracia encadena, un dia despues corre desde hoy (aunque siga activa)', () => {
  const base = { plan: 'starter', fecha_proximo_vencimiento: '2026-12-02', estado_pago: 'gracia', suscripcion_activa: true, dias_gracia: 3 }
  // paga el 5 (ultimo dia de gracia): el ciclo sigue del 2 al 2
  assert.deepEqual(computeNextDue(base, '2026-12-05'), { periodFrom: '2026-12-02', newDue: '2027-01-02', extended: true })
  // paga el 6 con la tienda todavia marcada activa (el cron no corrio): no se regala el hueco
  assert.deepEqual(computeNextDue(base, '2026-12-06'), { periodFrom: '2026-12-06', newDue: '2027-01-06', extended: false })
})

test('computeNextDue: respeta dias_gracia propios de la tienda', () => {
  const base = { plan: 'enterprise', fecha_proximo_vencimiento: '2026-12-02', estado_pago: 'gracia', suscripcion_activa: true, dias_gracia: 15 }
  assert.equal(computeNextDue(base, '2026-12-17').extended, true)
  assert.equal(computeNextDue(base, '2026-12-18').extended, false)
})
