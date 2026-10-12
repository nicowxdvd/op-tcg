import { describe, expect, it } from 'vitest'
import { COLORS, CARD_FACES, LEADER_TINTS, mix, panelTint } from '../../src/ui/theme'

const sum = (color: number) => ((color >> 16) & 0xff) + ((color >> 8) & 0xff) + (color & 0xff)


describe('theme', () => {

  it('mix devuelve los extremos y el punto medio', () => {
    expect(mix(0x000000, 0xffffff, 0)).toBe(0x000000)
    expect(mix(0x000000, 0xffffff, 1)).toBe(0xffffff)
    expect(mix(0x000000, 0xfefefe, 0.5)).toBe(0x7f7f7f)

  })


  it('panelTint oscurece el color del Líder y el borde es más claro que el relleno', () => {
    for (const color of Object.values(LEADER_TINTS)) {
      const { fill, frame } = panelTint(color)

      expect(fill).not.toBe(COLORS.background)
      expect(frame).not.toBe(fill)
      expect(sum(fill)).toBeLessThan(sum(frame))

    }

  })


  it('LEADER_TINTS cubre los mismos colores que CARD_FACES', () => {
    expect(Object.keys(LEADER_TINTS).sort()).toEqual(Object.keys(CARD_FACES).sort())

  })


  it('el relleno del tinte púrpura queda a 4 niveles por canal del medido en OPlayTCG', () => {
    const measured = 0x2c2349
    const fill     = panelTint(LEADER_TINTS.Purple).fill

    for (const shift of [16, 8, 0])
      expect(Math.abs(((fill >> shift) & 0xff) - ((measured >> shift) & 0xff))).toBeLessThanOrEqual(4)

  })

})
