// =============================================================================
// PORTALMAKER — Tests del cálculo de horarios libres para turnos
// Ejecutar con: npm test
// =============================================================================

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calcularHorariosDisponibles,
  esHorarioDisponible,
  localAUtc,
  horaLocal,
  fechaLocal,
  diaSemana,
  sumarDias,
  type DisponibilidadSemanal,
  type ReglasReserva,
} from './availability'

const BA = 'America/Argentina/Buenos_Aires'

// 2026-11-12 es jueves
const JUEVES = '2026-11-12'

const reglas: ReglasReserva = {
  zonaHoraria: BA,
  intervaloMinutos: 30,
  anticipacionMinMinutos: 0,
  anticipacionMaxDias: 60,
}

// "ahora" = una semana antes, para que la anticipación no interfiera
const AHORA = new Date('2026-11-05T12:00:00Z')

const soloManana: DisponibilidadSemanal = {
  jueves: {
    activo: true,
    turno1: { desde: '09:00', hasta: '12:00' },
    dobleTurno: false,
    turno2: { desde: '16:00', hasta: '20:00' },
  },
}

const etiquetas = (h: { etiqueta: string }[]) => h.map((x) => x.etiqueta)

describe('Zona horaria y fechas', () => {
  it('convierte 09:00 de Buenos Aires a 12:00 UTC', () => {
    assert.equal(localAUtc(JUEVES, '09:00', BA).toISOString(), '2026-11-12T12:00:00.000Z')
  })

  it('muestra la hora local de un instante UTC', () => {
    assert.equal(horaLocal(new Date('2026-11-12T13:30:00Z'), BA), '10:30')
  })

  it('una medianoche UTC sigue siendo el día anterior en Buenos Aires', () => {
    assert.equal(fechaLocal(new Date('2026-11-13T01:00:00Z'), BA), JUEVES)
  })

  it('identifica el día de la semana', () => {
    assert.equal(diaSemana(JUEVES), 'jueves')
    assert.equal(diaSemana('2026-11-15'), 'domingo')
  })

  it('suma días cruzando de mes', () => {
    assert.equal(sumarDias('2026-11-30', 1), '2026-12-01')
  })
})

describe('Horarios disponibles', () => {
  it('genera la grilla dentro de la franja y deja afuera lo que no entra', () => {
    const horarios = calcularHorariosDisponibles({
      fecha: JUEVES,
      disponibilidad: soloManana,
      duracionMinutos: 60,
      ocupados: [],
      reglas,
      ahora: AHORA,
    })
    // 09:00 a 12:00 con turnos de 1 h cada 30 min: el último inicio posible es 11:00
    assert.deepEqual(etiquetas(horarios), ['09:00', '09:30', '10:00', '10:30', '11:00'])
  })

  it('un día no activo no ofrece horarios', () => {
    const horarios = calcularHorariosDisponibles({
      fecha: '2026-11-13', // viernes, no configurado
      disponibilidad: soloManana,
      duracionMinutos: 30,
      ocupados: [],
      reglas,
      ahora: AHORA,
    })
    assert.equal(horarios.length, 0)
  })

  it('incluye el segundo turno cuando hay doble turno', () => {
    const horarios = calcularHorariosDisponibles({
      fecha: JUEVES,
      disponibilidad: {
        jueves: {
          activo: true,
          turno1: { desde: '09:00', hasta: '10:00' },
          dobleTurno: true,
          turno2: { desde: '16:00', hasta: '17:00' },
        },
      },
      duracionMinutos: 30,
      ocupados: [],
      reglas,
      ahora: AHORA,
    })
    assert.deepEqual(etiquetas(horarios), ['09:00', '09:30', '16:00', '16:30'])
  })

  it('saca los horarios que chocan con un turno ya tomado', () => {
    const horarios = calcularHorariosDisponibles({
      fecha: JUEVES,
      disponibilidad: soloManana,
      duracionMinutos: 60,
      // Ocupado de 10:00 a 11:00 local
      ocupados: [{ inicio: localAUtc(JUEVES, '10:00', BA), fin: localAUtc(JUEVES, '11:00', BA) }],
      reglas,
      ahora: AHORA,
    })
    // 09:30 terminaría 10:30 (choca) y 10:30 empezaría dentro del ocupado
    assert.deepEqual(etiquetas(horarios), ['09:00', '11:00'])
  })

  it('un turno que termina justo cuando empieza otro no choca', () => {
    const horarios = calcularHorariosDisponibles({
      fecha: JUEVES,
      disponibilidad: soloManana,
      duracionMinutos: 60,
      ocupados: [{ inicio: localAUtc(JUEVES, '10:00', BA), fin: localAUtc(JUEVES, '11:00', BA) }],
      reglas,
      ahora: AHORA,
    })
    assert.ok(etiquetas(horarios).includes('09:00')) // 09:00-10:00 termina justo a las 10:00
    assert.ok(etiquetas(horarios).includes('11:00')) // empieza justo cuando termina el ocupado
  })

  it('respeta el buffer posterior al servicio', () => {
    const horarios = calcularHorariosDisponibles({
      fecha: JUEVES,
      disponibilidad: soloManana,
      duracionMinutos: 60,
      bufferMinutos: 30,
      ocupados: [{ inicio: localAUtc(JUEVES, '10:30', BA), fin: localAUtc(JUEVES, '11:00', BA) }],
      reglas,
      ahora: AHORA,
    })
    // 09:00 + 60 + 30 de buffer = 10:30: no choca. 09:30 llegaría a 11:00 con buffer: choca.
    assert.deepEqual(etiquetas(horarios), ['09:00', '11:00'])
  })

  it('el buffer no impide el último turno del día', () => {
    const horarios = calcularHorariosDisponibles({
      fecha: JUEVES,
      disponibilidad: soloManana,
      duracionMinutos: 60,
      bufferMinutos: 30,
      ocupados: [],
      reglas,
      ahora: AHORA,
    })
    assert.equal(etiquetas(horarios).at(-1), '11:00')
  })

  it('aplica la anticipación mínima', () => {
    // Ahora: jueves 09:10 local; con 2 h de anticipación el primer horario es 11:30
    const horarios = calcularHorariosDisponibles({
      fecha: JUEVES,
      disponibilidad: soloManana,
      duracionMinutos: 30,
      ocupados: [],
      reglas: { ...reglas, anticipacionMinMinutos: 120 },
      ahora: localAUtc(JUEVES, '09:10', BA),
    })
    assert.deepEqual(etiquetas(horarios), ['11:30'])
  })

  it('no ofrece fechas más allá de la anticipación máxima', () => {
    const horarios = calcularHorariosDisponibles({
      fecha: JUEVES,
      disponibilidad: soloManana,
      duracionMinutos: 30,
      ocupados: [],
      reglas: { ...reglas, anticipacionMaxDias: 3 },
      ahora: AHORA, // 7 días antes
    })
    assert.equal(horarios.length, 0)
  })

  it('ignora franjas mal cargadas sin romperse', () => {
    const horarios = calcularHorariosDisponibles({
      fecha: JUEVES,
      disponibilidad: {
        jueves: {
          activo: true,
          turno1: { desde: '13:00', hasta: '09:00' }, // al revés
          dobleTurno: true,
          turno2: { desde: 'abc', hasta: '20:00' },
        },
      },
      duracionMinutos: 30,
      ocupados: [],
      reglas,
      ahora: AHORA,
    })
    assert.equal(horarios.length, 0)
  })

  it('valida un horario concreto al confirmar la reserva', () => {
    const base = {
      disponibilidad: soloManana,
      duracionMinutos: 60,
      ocupados: [{ inicio: localAUtc(JUEVES, '10:00', BA), fin: localAUtc(JUEVES, '11:00', BA) }],
      reglas,
      ahora: AHORA,
    }
    assert.equal(esHorarioDisponible(localAUtc(JUEVES, '09:00', BA), base), true)
    assert.equal(esHorarioDisponible(localAUtc(JUEVES, '10:00', BA), base), false)
    // Un horario fuera de la grilla (09:10) no es válido aunque esté libre
    assert.equal(esHorarioDisponible(localAUtc(JUEVES, '09:10', BA), base), false)
  })
})
