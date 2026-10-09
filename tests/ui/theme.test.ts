import { describe, expect, it } from 'vitest'
import { COLORS, CARD_FACES, mix, panelTint } from '../../src/ui/theme'

describe('theme', () => {

  it('mix devuelve los extremos y el punto medio', () => {
    expect(mix(0x000000, 0xffffff, 0)).toBe(0x000000)
    expect(mix(0x000000, 0xffffff, 1)).toBe(0xffffff)
    expect(mix(0x000000, 0xfefefe, 0.5)).toBe(0x7f7f7f)

  })


  it('panelTint oscurece el color del Líder y el borde es más claro que el relleno', () => {
    for (const color of Object.values(CARD_FACES)) {
      const { fill, frame } = panelTint(color)

      expect(fill).not.toBe(COLORS.background)
      expect(frame).not.toBe(fill)
      expect(((fill >> 16) & 0xff) + ((fill >> 8) & 0xff) + (fill & 0xff)).toBeLessThan(((frame >> 16) & 0xff) + ((frame >> 8) & 0xff) + (frame & 0xff))

    }

  })

})
