import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { getLegalActions } from '../../src/engine'
import { BLOCKER_ID, COUNTER_1K_ID, COUNTER_2K_ID, LEADER_ID, NO_COUNTER_ID } from '../engine/fixtures'
import { card, inPlay, other, startGame, withPlayer } from '../engine/helpers'
import { counterCards, expectedDefense, isLethal, lifeAtRisk, pickBlocker, pickCounter, powerNeeded, shouldRedraw, wantsAttack } from '../../src/ai/heuristics'
import type { GameState, PlayerId } from '../../src/engine/types'

function battle(options: { life: number; hand: string[]; characters?: string[] }): { state: GameState; defender: PlayerId } {
  const start    = startGame()
  const attacker = start.first
  const defender = other(attacker)
  const hand     = options.hand.map((id, i) => card(defender, id, i + 1))
  const life     = Array.from({ length: options.life }, (_, i) => card(defender, LEADER_ID, 50 + i))
  const base     = withPlayer({ ...start, turn: 3, active: attacker }, defender, { hand, life, characters: (options.characters ?? []).map((id, i) => inPlay(card(defender, id, 80 + i))) })
  const state    = apply(base, { type: 'Attack', player: attacker, attacker: 'leader', target: 'leader' }).state

  return { state, defender }

}


describe('shouldRedraw', () => {

  it('redraws when there are no Characters with cost 3 or less', () => {
    const start = startGame()
    const empty = withPlayer(start, 'p1', { hand: [card('p1', LEADER_ID, 1)] })
    const cheap = withPlayer(start, 'p1', { hand: [card('p1', NO_COUNTER_ID, 1)] })

    expect(shouldRedraw(empty, 'p1')).toBe(true)
    expect(shouldRedraw(cheap, 'p1')).toBe(false)

  })

})


describe('lethal and life risk', () => {

  it('detects a lethal hit when the Leader has no Life', () => {
    const { state } = battle({ life: 0, hand: [] })

    expect(isLethal(state, state.battle!)).toBe(true)

  })

  it('does not flag lethal with Life remaining, but flags risk when 2 or less would remain', () => {
    const risky = battle({ life: 3, hand: [] })
    const safe  = battle({ life: 4, hand: [] })

    expect(isLethal(risky.state, risky.state.battle!)).toBe(false)
    expect(lifeAtRisk(risky.state, risky.state.battle!)).toBe(true)
    expect(lifeAtRisk(safe.state, safe.state.battle!)).toBe(false)

  })

})


describe('counters', () => {

  it('lists only Characters with counter', () => {
    const { state, defender } = battle({ life: 1, hand: [COUNTER_1K_ID, NO_COUNTER_ID, COUNTER_2K_ID] })

    expect(counterCards(state, defender).map(entry => entry.counter)).toEqual([1000, 2000])

  })

  it('picks the smallest single card that is enough', () => {
    const { state, defender } = battle({ life: 1, hand: [COUNTER_2K_ID, COUNTER_1K_ID] })

    expect(powerNeeded(state, state.battle!)).toBe(1)
    expect(pickCounter(state, defender, state.battle!)).toBe(`${defender}-t2`)

  })

  it('returns null when the hand cannot stop the attack', () => {
    const { state, defender } = battle({ life: 1, hand: [NO_COUNTER_ID] })

    expect(pickCounter(state, defender, state.battle!)).toBeNull()

  })

})


describe('blocking', () => {

  it('blocks with a Blocker when the attack is lethal', () => {
    const { state, defender } = battle({ life: 0, hand: [], characters: [BLOCKER_ID] })

    expect(pickBlocker(state, getLegalActions(state, defender), state.battle!)).toBe(`${defender}-t80`)

  })

  it('does not sacrifice a weaker Blocker when the attack is not lethal', () => {
    const { state, defender } = battle({ life: 4, hand: [], characters: [BLOCKER_ID] })

    expect(pickBlocker(state, getLegalActions(state, defender), state.battle!)).toBeNull()

  })

})


describe('wantsAttack', () => {

  it('attacks the Leader when power is enough', () => {
    expect(wantsAttack(startGame(), 'p1', 'leader', 'leader')).toBe(true)

  })

  it('does not attack a stronger target with little Life', () => {
    const start  = startGame()
    const strong = withPlayer(withPlayer(start, 'p2', { characters: [inPlay(card('p2', LEADER_ID, 1))] }), 'p1', { life: [] })
    const target = strong.players.p2.characters[0].card.instanceId
    const buffed = { ...strong, defs: { ...strong.defs, [LEADER_ID]: { ...strong.defs[LEADER_ID], power: 9000 } } }

    expect(wantsAttack(buffed, 'p1', 'leader', target)).toBe(true)
    expect(wantsAttack({ ...buffed, modifiers: [{ target: target, power: 9000, duration: 'permanent', sourceId: 'x' }] }, 'p1', 'leader', target)).toBe(false)

  })

})


describe('expectedDefense', () => {

  it('assumes no defense on normal and the exact hand on experto', () => {
    const { state, defender } = battle({ life: 5, hand: [COUNTER_1K_ID, COUNTER_2K_ID] })

    expect(expectedDefense(state, defender, 'normal')).toBe(0)
    expect(expectedDefense(state, defender, 'experto')).toBe(3000)

  })


  it('estimates from the deck list on dificil', () => {
    const { state, defender } = battle({ life: 5, hand: [NO_COUNTER_ID] })
    const estimate            = expectedDefense(state, defender, 'dificil')

    expect(estimate).toBeGreaterThanOrEqual(0)
    expect(expectedDefense(withPlayer(state, defender, { hand: [] }), defender, 'dificil')).toBe(0)

  })

})
