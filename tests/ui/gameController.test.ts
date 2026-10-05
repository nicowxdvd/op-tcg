import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockController } from '../../src/dev/mockGame'
import { buildPrompt } from '../../src/ui/prompts'
import type { PlayerId } from '../../src/engine'

function decider(controller: ReturnType<typeof createMockController>): PlayerId {
  return controller.getLegal('p1').length > 0 ? 'p1' : 'p2'

}


describe('GameController', () => {

  it('dispatch actualiza el estado', () => {
    const controller = createMockController(7, { cpu: null })
    const player     = decider(controller)
    const before     = controller.getState()

    controller.dispatch({ type: 'Mulligan', player, redraw: false })

    expect(controller.getState()).not.toBe(before)
    expect(controller.getState().players[player].mulliganDone).toBe(true)

  })


  it('un error del motor lo propaga y no cambia el estado', () => {
    const controller = createMockController(7, { cpu: null })
    const before     = controller.getState()
    const handler    = vi.fn()

    controller.on(handler)

    expect(() => controller.dispatch({ type: 'PassPhase', player: 'p1' })).toThrow()
    expect(controller.getState()).toBe(before)
    expect(handler).not.toHaveBeenCalled()

  })


  it('los eventos llegan a los suscriptores hasta que se desuscriben', () => {
    const controller = createMockController(7, { cpu: null })
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
    const controller = createMockController(7, { cpu: null })
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
    const controller = createMockController(7, { cpu: null })

    controller.dispatch({ type: 'Mulligan', player: controller.actor(), redraw: false })
    controller.dispatch({ type: 'Mulligan', player: controller.actor(), redraw: false })

    const first = controller.actor()

    controller.dispatch({ type: 'PassPhase', player: first })

    expect(controller.actor()).not.toBe(first)

  })


  it('buildPrompt ofrece el mulligan y no ofrece nada en el turno normal', () => {
    const controller = createMockController(7, { cpu: null })
    const player     = controller.actor()
    const prompt     = buildPrompt(controller.getState(), controller.getLegal(player), player)

    expect(prompt?.options.map(option => option.label)).toEqual(['Keep hand', 'Redraw hand'])

    controller.dispatch({ type: 'Mulligan', player, redraw: false })
    controller.dispatch({ type: 'Mulligan', player: controller.actor(), redraw: false })

    const actor = controller.actor()

    expect(buildPrompt(controller.getState(), controller.getLegal(actor), actor)).toBeNull()

  })

})


describe('GameController con CPU', () => {

  beforeEach(() => { vi.useFakeTimers() })

  afterEach(() => { vi.useRealTimers() })

  it('isCpu identifica solo al jugador de la IA', () => {
    const controller = createMockController(7)

    expect(controller.isCpu('p2')).toBe(true)
    expect(controller.isCpu('p1')).toBe(false)
    expect(createMockController(7, { cpu: null }).isCpu('p2')).toBe(false)
    controller.dispose()

  })


  it('la CPU decide su mulligan tras el delay y no antes', () => {
    const controller = createMockController(7)

    controller.dispatch({ type: 'Mulligan', player: 'p1', redraw: false })

    expect(controller.getState().players.p2.mulliganDone).toBe(false)
    vi.advanceTimersByTime(599)
    expect(controller.getState().players.p2.mulliganDone).toBe(false)
    vi.advanceTimersByTime(1)
    expect(controller.getState().players.p2.mulliganDone).toBe(true)
    expect(controller.getState().phase).toBe('main')
    controller.dispose()

  })


  it('tras el turno humano la CPU juega y se detiene cuando decide el humano', () => {
    const controller = createMockController(7)

    controller.dispatch({ type: 'Mulligan', player: 'p1', redraw: false })
    vi.advanceTimersByTime(600)

    while (controller.getState().active === 'p1' && controller.getState().phase !== 'gameOver') {
      const pass = controller.getLegal('p1').find(action => action.type === 'PassPhase')

      if (!pass)
        break

      controller.dispatch(pass)

    }

    vi.advanceTimersByTime(60000)

    const state = controller.getState()

    expect(state.turn).toBeGreaterThan(1)
    expect(controller.getLegal('p1').length).toBeGreaterThan(0)
    expect(state.active === 'p1' || state.phase === 'gameOver').toBe(true)
    controller.dispose()

  })


  it('dispose cancela los timers pendientes', () => {
    const controller = createMockController(7)

    controller.dispose()
    vi.advanceTimersByTime(10000)

    expect(controller.getState().players.p2.mulliganDone).toBe(false)

  })


  it('un error de la CPU detiene el bucle y se propaga sin cambiar el estado', () => {
    const controller = createMockController(7)

    controller.dispatch({ type: 'Mulligan', player: 'p1', redraw: false })

    const before = controller.getState()

    vi.spyOn(controller, 'getLegal').mockImplementation(() => { throw new Error('boom') })

    expect(() => vi.advanceTimersByTime(600)).toThrow('boom')
    expect(controller.getState()).toBe(before)
    controller.dispose()

  })

})
