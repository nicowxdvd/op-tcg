import { describe, expect, it } from 'vitest'
import { allRects, computeLayout, contains, donSlots, handSlots, overlaps } from '../../src/ui/layout'

const SIZES = [[1280, 720], [1920, 1080]] as const

describe('layout', () => {

  it.each(SIZES)('las zonas no se superponen a %ix%i', (width, height) => {
    const rects = allRects(computeLayout(width, height))

    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++)
        expect(overlaps(rects[i], rects[j]), `${i} con ${j}`).toBe(false)

  })


  it.each(SIZES)('las zonas quedan dentro del lienzo a %ix%i', (width, height) => {
    for (const rect of allRects(computeLayout(width, height))) {
      expect(rect.x).toBeGreaterThanOrEqual(0)
      expect(rect.y).toBeGreaterThanOrEqual(0)
      expect(rect.x + rect.w).toBeLessThanOrEqual(width)
      expect(rect.y + rect.h).toBeLessThanOrEqual(height)
    }

  })


  it('escala con el tamaño del lienzo', () => {
    const small = computeLayout(1280, 720)
    const large = computeLayout(2560, 1440)

    expect(large.card.w).toBeCloseTo(small.card.w * 2)
    expect(large.self.leader.x).toBeCloseTo(small.self.leader.x * 2)
    expect(large.rival.hand.y).toBeCloseTo(small.rival.hand.y * 2)

  })


  it('el lado rival es el espejo vertical del propio', () => {
    const layout = computeLayout(1280, 720)

    expect(layout.rival.leader.y + layout.rival.leader.h).toBeCloseTo(720 - layout.self.leader.y)
    expect(layout.rival.leader.x).toBe(layout.self.leader.x)

  })


  it('hay cinco espacios de Characters dentro de la zona', () => {
    const { self } = computeLayout(1280, 720)

    expect(self.slots).toHaveLength(5)

    for (const slot of self.slots)
      expect(contains(self.characters, slot.x + slot.w / 2, slot.y + slot.h / 2)).toBe(true)

  })


  it('la mano cabe en su zona con cualquier cantidad de cartas', () => {
    const { self, handCard } = computeLayout(1280, 720)

    for (const count of [0, 1, 5, 10]) {
      const slots = handSlots(self.hand, count, handCard)

      expect(slots).toHaveLength(count)

      for (const slot of slots) {
        expect(slot.x).toBeGreaterThanOrEqual(self.hand.x)
        expect(slot.x + slot.w).toBeLessThanOrEqual(self.hand.x + self.hand.w)
      }
    }

  })


  it('los DON!! caben en su área', () => {
    const { self } = computeLayout(1280, 720)

    for (const point of donSlots(self.don, 10)) {
      expect(contains(self.don, point.x, point.y)).toBe(true)
    }

  })

})
