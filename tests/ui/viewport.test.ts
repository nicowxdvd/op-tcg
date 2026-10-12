import { describe, expect, it } from 'vitest'
import { fitScale, logicalSize, needsRotation, pixelRatio } from '../../src/ui/viewport'

describe('viewport', () => {

  it('limita la densidad de píxeles entre 1 y 2', () => {
    expect(pixelRatio(0)).toBe(1)
    expect(pixelRatio(1.5)).toBe(1.5)
    expect(pixelRatio(3)).toBe(2)

  })


  it('mantiene el tamaño de la ventana cuando supera el mínimo soportado', () => {
    expect(fitScale(1920, 1080)).toBe(1)
    expect(logicalSize(1920, 1080)).toEqual({ w: 1920, h: 1080 })

  })


  it('reduce la escala bajo el mínimo y conserva la proporción de la ventana', () => {
    expect(fitScale(512, 600)).toBe(0.5)
    expect(logicalSize(512, 300)).toEqual({ w: 1024, h: 600 })

    const phone = logicalSize(852, 393)

    expect(fitScale(852, 393)).toBeCloseTo(393 / 600)
    expect(phone.h).toBeCloseTo(600)
    expect(phone.w / phone.h).toBeCloseTo(852 / 393)

  })


  it('pide girar el teléfono solo en vertical y angosto', () => {
    expect(needsRotation(393, 852)).toBe(true)
    expect(needsRotation(852, 393)).toBe(false)
    expect(needsRotation(768, 1024)).toBe(false)

  })

})
