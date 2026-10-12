import { describe, expect, it } from 'vitest'
import { flow } from '../../src/ui/logLayout'

const measure = (text: string) => text.length * 10

describe('flow', () => {

  it('pone las palabras en una fila separadas por un espacio', () => {
    const { placed, rows } = flow([{ text: 'uno dos', chip: false }], measure, 500)

    expect(rows).toBe(1)
    expect(placed.map(piece => piece.x)).toEqual([0, 40])

  })


  it('salta de fila cuando la palabra no entra', () => {
    const { placed, rows } = flow([{ text: 'aaaa bbbb cccc', chip: false }], measure, 100)

    expect(rows).toBe(2)
    expect(placed.map(piece => piece.row)).toEqual([0, 0, 1])
    expect(placed[2].x).toBe(0)

  })


  it('un chip no se parte y suma su relleno', () => {
    const { placed } = flow([{ text: 'juega', chip: false }, { text: 'OP14-023 Kikunojo', chip: true }], measure, 500, 10)

    expect(placed).toHaveLength(2)
    expect(placed[1].text).toBe('OP14-023 Kikunojo')
    expect(placed[1].w).toBe(180)

  })


  it('mide en negrita las piezas marcadas como bold', () => {
    const wide = (text: string, bold: boolean) => text.length * (bold ? 12 : 10)
    const { placed } = flow([{ text: 'ab', chip: false, bold: true }, { text: 'cd', chip: false }], wide, 500)

    expect(placed[1].x).toBe(24 + 10)

  })


  it('un chip más ancho que la fila va solo en la suya', () => {
    const { placed, rows } = flow([{ text: 'ab', chip: false }, { text: 'chip largo', chip: true }], measure, 60)

    expect(rows).toBe(2)
    expect(placed[1]).toMatchObject({ row: 1, x: 0 })

  })

})
