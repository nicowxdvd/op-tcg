import { describe, expect, it } from 'vitest'
import { LOW_MS, MATCH_MS, MatchClock, formatClock } from '../../src/app/clock'

describe('MatchClock', () => {

  it('empieza con 20:00 para cada jugador', () => {
    const clock = new MatchClock()

    expect(clock.remaining('p1')).toBe(MATCH_MS)
    expect(clock.remaining('p2')).toBe(MATCH_MS)

  })


  it('solo descuenta al jugador que corre', () => {
    const clock = new MatchClock()

    clock.tick('p2', 1000)

    expect(clock.remaining('p1')).toBe(MATCH_MS)
    expect(clock.remaining('p2')).toBe(MATCH_MS - 1000)

  })


  it('sin jugador activo no descuenta a nadie', () => {
    const clock = new MatchClock()

    clock.tick(null, 5000)

    expect(clock.remaining('p1')).toBe(MATCH_MS)

  })


  it('no baja de cero', () => {
    const clock = new MatchClock(1500)

    clock.tick('p1', 1000)
    clock.tick('p1', 1000)

    expect(clock.remaining('p1')).toBe(0)

  })

})


describe('formatClock', () => {

  it('formatea mm:ss', () => {
    expect(formatClock(MATCH_MS)).toBe('20:00')
    expect(formatClock(65_000)).toBe('01:05')
    expect(formatClock(0)).toBe('00:00')

  })


  it('redondea hacia arriba los milisegundos sueltos', () => {
    expect(formatClock(59_001)).toBe('01:00')

  })


  it('LOW_MS es un minuto', () => {
    expect(LOW_MS).toBe(60_000)

  })

})
