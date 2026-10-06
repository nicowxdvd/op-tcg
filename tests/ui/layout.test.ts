import { describe, expect, it } from 'vitest'
import { allRects, computeLayout, contains, donSlots, fanSlots, overlaps, splitLearn } from '../../src/ui/layout'

const SIZES = [[1024, 600], [1280, 720], [1920, 1080], [2560, 1440], [2560, 1080]] as const

describe('layout', () => {

  it.each(SIZES)('las zonas no se superponen a %ix%i', (width, height) => {
    const layout = computeLayout(width, height)
    const rects  = allRects(layout).filter(rect => rect !== layout.self.donDeck)

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
    expect(large.banner.h).toBeCloseTo(small.banner.h * 2)

  })


  it('el lado rival es el giro de 180 grados del propio', () => {
    const { self, rival, content } = computeLayout(1280, 720)
    const centerX                  = self.panel.x + self.panel.w / 2

    expect(rival.leader.y + rival.leader.h).toBeCloseTo(720 - self.leader.y)
    expect(rival.leader.x + rival.leader.w / 2).toBeCloseTo(2 * centerX - (self.leader.x + self.leader.w / 2))
    expect(rival.panel.y).toBeLessThan(self.panel.y)
    expect(content.w).toBe(1280)

  })


  it.each(SIZES)('los paneles usan al menos 90%% del alto a %ix%i', (width, height) => {
    const { self, rival } = computeLayout(width, height)

    expect((self.panel.y + self.panel.h - rival.panel.y) / height).toBeGreaterThanOrEqual(0.9)

  })


  it('en pantalla ultraancha centra el contenido sin deformarlo', () => {
    const wide = computeLayout(2560, 1080)
    const base = computeLayout(2160, 1080)

    expect(wide.content.w).toBe(2160)
    expect(wide.content.x).toBe(200)
    expect(wide.card.w).toBeCloseTo(base.card.w)

  })


  it.each(SIZES)('las zonas de cada panel quedan dentro de su panel a %ix%i', (width, height) => {
    const { self, rival } = computeLayout(width, height)

    for (const side of [self, rival])
      for (const rect of [side.life, side.leader, side.stage, side.don, side.donDeck, side.deck, side.trash, side.characters]) {
        expect(rect.x).toBeGreaterThanOrEqual(side.panel.x)
        expect(rect.y).toBeGreaterThanOrEqual(side.panel.y)
        expect(rect.x + rect.w).toBeLessThanOrEqual(side.panel.x + side.panel.w + 0.001)
        expect(rect.y + rect.h).toBeLessThanOrEqual(side.panel.y + side.panel.h + 0.001)
      }

  })


  it.each(SIZES)('la mano propia se superpone al panel sin cubrir las zonas a %ix%i', (width, height) => {
    const { self, handCard } = computeLayout(width, height)
    const protectedRects     = [self.life, self.leader, self.stage, self.deck, self.characters, self.don, self.trash]

    expect(self.hand.x + self.hand.w).toBeGreaterThan(self.panel.x)
    expect(self.hand.x + self.hand.w).toBeLessThanOrEqual(self.panel.x + handCard.w + 0.001)

    for (const rect of protectedRects)
      expect(overlaps(self.hand, rect)).toBe(false)

  })


  it('a 1280x720 la carta de la mano es al menos 1,3 veces la de la spec 11', () => {
    const { handCard } = computeLayout(1280, 720)
    const before       = Math.min(((720 - 2 * 10.8 - 7.2) / 2) * 0.30, (1280 * 0.17 - 2 * 10.8) * 0.5 / 0.72) * 0.92

    expect(handCard.h / before).toBeGreaterThanOrEqual(1.3)

  })


  it('hay cinco espacios de Characters dentro de la zona', () => {
    const { self } = computeLayout(1280, 720)

    expect(self.slots).toHaveLength(5)

    for (const slot of self.slots)
      expect(contains(self.characters, slot.x + slot.w / 2, slot.y + slot.h / 2)).toBe(true)

  })


  it('los DON!! caben en su área', () => {
    const { self } = computeLayout(1280, 720)

    for (const point of donSlots(self.don, 10)) {
      expect(contains(self.don, point.x, point.y)).toBe(true)
    }

  })


  it('el abanico queda centrado y simétrico con cualquier cantidad', () => {
    const { rival, handCard } = computeLayout(1280, 720)

    for (const count of [0, 1, 5, 10]) {
      const slots = fanSlots(rival.hand, count, handCard)

      expect(slots).toHaveLength(count)

      if (count > 1) {
        expect(slots[0].angle).toBeCloseTo(-slots[count - 1].angle)
        expect(slots[0].x + slots[count - 1].x).toBeCloseTo(2 * (rival.hand.x + rival.hand.w / 2))
      }

      for (const slot of slots) {
        expect(slot.x - handCard.w / 2).toBeGreaterThanOrEqual(rival.hand.x - 0.001)
        expect(slot.x + handCard.w / 2).toBeLessThanOrEqual(rival.hand.x + rival.hand.w + 0.001)
      }
    }

  })



  it.each(SIZES)('el panel de aprendizaje y el log caben dentro del log a %ix%i', (width, height) => {
    const { log } = computeLayout(width, height)

    for (const expanded of [true, false]) {
      const parts = splitLearn(log, expanded)
      const rects = [parts.toggle, ...(parts.learn ? [parts.learn] : []), parts.log]

      expect(Boolean(parts.learn)).toBe(expanded)

      for (const rect of rects) {
        expect(rect.h).toBeGreaterThan(0)
        expect(rect.y).toBeGreaterThanOrEqual(log.y)
        expect(rect.y + rect.h).toBeLessThanOrEqual(log.y + log.h + 0.001)
      }

      for (let i = 0; i < rects.length; i++)
        for (let j = i + 1; j < rects.length; j++)
          expect(overlaps(rects[i], rects[j])).toBe(false)
    }

  })

})
