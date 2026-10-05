import { describe, expect, it, vi } from 'vitest'
import { createMockController } from '../../src/dev/mockGame'
import { buildPrompt } from '../../src/ui/prompts'
import type { PlayerId } from '../../src/engine'

function decider(controller: ReturnType<typeof createMockController>): PlayerId {
  return controller.getLegal('p1').length > 0 ? 'p1' : 'p2'

}


describe('GameController', () => {

  it('dispatch actualiza el estado', () => {
    const controller = createMockController(7)
    const player     = decider(controller)
    const before     = controller.getState()

    controller.dispatch({ type: 'Mulligan', player, redraw: false })

    expect(controller.getState()).not.toBe(before)
    expect(controller.getState().players[player].mulliganDone).toBe(true)

  })


  it('un error del motor lo propaga y no cambia el estado', () => {
    const controller = createMockController(7)
    const before     = controller.getState()
    const handler    = vi.fn()

    controller.on(handler)

    expect(() => controller.dispatch({ type: 'PassPhase', player: 'p1' })).toThrow()
    expect(controller.getState()).toBe(before)
    expect(handler).not.toHaveBeenCalled()

  })


  it('los eventos llegan a los suscriptores hasta que se desuscriben', () => {
    const controller = createMockController(7)
    const handler    = vi.fn()
    const off        = controller.on(handler)
    const player     = decider(controller)

    controller.dispatch({ type: 'Mulligan', player, redraw: false })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0]).toEqual([{ type: 'MulliganDecided', player, redraw: false }])

    off()
    controller.dispatch({ type: 'Mulligan', player: decider(controller), redraw: false })

    expect(handler).toHaveBeenCalledTimes(1)

  })


  it('getLegal sale del motor y actor devuelve quien puede jugar', () => {
    const controller = createMockController(7)
    const player     = decider(controller)

    expect(controller.actor()).toBe(player)
    expect(controller.getLegal(player).map(action => action.type)).toEqual(['Mulligan', 'Mulligan'])

    controller.dispatch({ type: 'Mulligan', player, redraw: false })
    controller.dispatch({ type: 'Mulligan', player: controller.actor(), redraw: false })

    const state = controller.getState()

    expect(state.phase).toBe('main')
    expect(controller.actor()).toBe(state.active)
    expect(controller.getLegal(state.active).some(action => action.type === 'PassPhase')).toBe(true)

  })


  it('pasar de turno cambia el jugador que actua', () => {
    const controller = createMockController(7)

    controller.dispatch({ type: 'Mulligan', player: controller.actor(), redraw: false })
    controller.dispatch({ type: 'Mulligan', player: controller.actor(), redraw: false })

    const first = controller.actor()

    controller.dispatch({ type: 'PassPhase', player: first })

    expect(controller.actor()).not.toBe(first)

  })


  it('buildPrompt ofrece el mulligan y no ofrece nada en el turno normal', () => {
    const controller = createMockController(7)
    const player     = controller.actor()
    const prompt     = buildPrompt(controller.getState(), controller.getLegal(player), player)

    expect(prompt?.options.map(option => option.label)).toEqual(['Keep hand', 'Redraw hand'])

    controller.dispatch({ type: 'Mulligan', player, redraw: false })
    controller.dispatch({ type: 'Mulligan', player: controller.actor(), redraw: false })

    const actor = controller.actor()

    expect(buildPrompt(controller.getState(), controller.getLegal(actor), actor)).toBeNull()

  })

})
