import { describe, expect, it } from 'vitest'
import { logicalSize, pixelRatio } from '../../src/ui/viewport'

describe('viewport', () => {

  it('limita la densidad de píxeles entre 1 y 2', () => {
    expect(pixelRatio(0)).toBe(1)
    expect(pixelRatio(1.5)).toBe(1.5)
    expect(pixelRatio(3)).toBe(2)

  })


  it('no baja del tamaño mínimo soportado', () => {
    expect(logicalSize(800, 500)).toEqual({ w: 1024, h: 600 })
    expect(logicalSize(1920, 1080)).toEqual({ w: 1920, h: 1080 })

  })

})
