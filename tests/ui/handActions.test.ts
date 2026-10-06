import { describe, expect, it } from 'vitest'
import { apply, getLegalActions } from '../../src/engine'
import type { EffectRegistry, GameState } from '../../src/engine'
import { COUNTER_1K_ID, COUNTER_EVENT_ID, EVENT_ID, LEADER_ID, STAGE_ID } from '../engine/fixtures'
import { card, inPlay, other, startGame, withPlayer } from '../engine/helpers'
import { handActionsFor } from '../../src/ui/handActions'


const effects = { [EVENT_ID]: [{ timing: 'main', run: () => [] }], [COUNTER_EVENT_ID]: [{ timing: 'counter', run: () => [] }] } as EffectRegistry


function mainPhase(): GameState {
  const start = { ...startGame(), effects }
  const id    = start.first

  return withPlayer({ ...start, turn: 3, active: id }, id, { donActive: 10, hand: [card(id, 'T-C02', 1), card(id, EVENT_ID, 2), card(id, STAGE_ID, 3), card(id, LEADER_ID, 4)], characters: [] })

}


describe('handActionsFor', () => {

  it('ofrece jugar un Character, un Event y un Stage en el turno propio', () => {
    const state = mainPhase()
    const id    = state.active
    const legal = getLegalActions(state, id)

    expect(handActionsFor(state, legal, `${id}-t1`).map(item => [item.kind, item.action.type])).toEqual([['play', 'PlayCharacter']])
    expect(handActionsFor(state, legal, `${id}-t2`).map(item => [item.kind, item.action.type])).toEqual([['play', 'PlayEvent']])
    expect(handActionsFor(state, legal, `${id}-t3`).map(item => [item.kind, item.action.type])).toEqual([['play', 'PlayStage']])

  })

  it('devuelve vacío para una carta sin acción legal', () => {
    const state = mainPhase()
    const id    = state.active

    expect(handActionsFor(state, getLegalActions(state, id), `${id}-t4`)).toEqual([])

  })

  it('devuelve vacío para una carta que no está en las acciones', () => {
    const state = mainPhase()

    expect(handActionsFor(state, getLegalActions(state, state.active), 'no-existe')).toEqual([])

  })

  it('ofrece counter en el paso counter de un ataque rival', () => {
    const start    = { ...startGame(), effects }
    const attacker = start.first
    const defender = other(attacker)
    const base     = withPlayer({ ...start, turn: 3, active: attacker }, defender, { donActive: 10, hand: [card(defender, COUNTER_1K_ID, 1), card(defender, COUNTER_EVENT_ID, 2), card(defender, 'T-N01', 3)], life: [card(defender, LEADER_ID, 50)] })
    const state    = apply(base, { type: 'Attack', player: attacker, attacker: 'leader', target: 'leader' }).state
    const passed   = apply(state, { type: 'PassBlock', player: defender }).state
    const legal    = getLegalActions(passed, defender)

    expect(handActionsFor(passed, legal, `${defender}-t1`).map(item => [item.kind, item.action.type])).toEqual([['counter', 'UseCounter']])
    expect(handActionsFor(passed, legal, `${defender}-t2`).map(item => [item.kind, item.action.type])).toEqual([['counter', 'UseCounterEvent']])
    expect(handActionsFor(passed, legal, `${defender}-t3`)).toEqual([])

  })

  it('con 5 Characters en juego ofrece una acción por cada replaceId', () => {
    const base  = mainPhase()
    const id    = base.active
    const state = withPlayer(base, id, { hand: [card(id, 'T-C02', 1)], characters: [1, 2, 3, 4, 5].map(n => inPlay(card(id, `T-C0${n}`, 10 + n))) })
    const items = handActionsFor(state, getLegalActions(state, id), `${id}-t1`)

    expect(items).toHaveLength(5)
    expect(items.every(item => item.kind === 'play' && item.action.type === 'PlayCharacter' && item.action.replaceId !== undefined)).toBe(true)
    expect(new Set(items.map(item => item.label)).size).toBe(5)

  })

})
