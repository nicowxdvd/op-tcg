import { describe, expect, it } from 'vitest'
import { createMockController } from '../../src/dev/mockGame'
import { instructionFor, phaseLabel } from '../../src/ui/instructions'

describe('instructions', () => {

  it('describe el turno y la fase', () => {
    const state = createMockController().getState()

    expect(phaseLabel(state)).toMatch(/^Turno \d+ · /)

  })


  it('avisa de que juega el rival cuando no hay acciones legales', () => {
    const state = createMockController().getState()

    expect(instructionFor(state, [], 'p1')).toEqual({ title: 'ESPERA', text: 'Juega el rival.' })

  })


  it('pide actuar cuando hay acciones legales', () => {
    const controller = createMockController()
    const state      = controller.getState()
    const actor      = controller.actor()

    expect(instructionFor(state, controller.getLegal(actor), actor)?.title).toBe('ACTÚA TÚ')

  })

})
