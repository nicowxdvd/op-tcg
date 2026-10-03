import { describe, expect, it } from 'vitest'
import { next, nextInt, shuffle } from '../../src/engine/rng'

describe('rng', () => {
  const items = Array.from({ length: 20 }, (_, i) => i)

  it('next devuelve valores en [0, 1) y es determinista', () => {
    const a = next(42)
    const b = next(42)

    expect(a).toEqual(b)
    expect(a.value).toBeGreaterThanOrEqual(0)
    expect(a.value).toBeLessThan(1)
    expect(a.seed).not.toBe(42)

  })


  it('nextInt devuelve enteros en [0, max)', () => {
    let seed = 7

    for (let i = 0; i < 100; i++) {
      const rolled = nextInt(seed, 6)
      seed = rolled.seed
      expect(Number.isInteger(rolled.value)).toBe(true)
      expect(rolled.value).toBeGreaterThanOrEqual(0)
      expect(rolled.value).toBeLessThan(6)
    }

  })


  it('la misma seed da el mismo orden', () => {
    expect(shuffle(items, 123)).toEqual(shuffle(items, 123))

  })


  it('seeds distintas dan órdenes distintos', () => {
    expect(shuffle(items, 1).items).not.toEqual(shuffle(items, 2).items)

  })


  it('shuffle conserva los elementos y no muta la entrada', () => {
    const copy     = [...items]
    const shuffled = shuffle(items, 99)

    expect([...shuffled.items].sort((a, b) => a - b)).toEqual(items)
    expect(items).toEqual(copy)

  })


  it('shuffle avanza la seed', () => {
    expect(shuffle(items, 5).seed).not.toBe(5)

  })

})
