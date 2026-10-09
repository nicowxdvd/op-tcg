import { describe, expect, it } from 'vitest'
import { chooseAction } from '../../src/ai'
import { apply } from '../../src/engine/actions'
import { getLegalActions } from '../../src/engine'
import { createGame } from '../../src/engine/state'
import { BLOCKER_ID, buildDeck, COUNTER_1K_ID, defs, FOREIGN_ID, LEADER_ID, NO_COUNTER_ID } from '../engine/fixtures'
import { card, inPlay, other, startGame, withPlayer } from '../engine/helpers'
import type { GameState } from '../../src/engine/types'

function mainState(): GameState {
  const start = startGame()
  const id    = start.first

  return withPlayer({ ...start, turn: 3, active: id, phase: 'main' }, id, { donActive: 3, characters: [], hand: [card(id, 'T-C02', 1), card(id, 'T-C03', 2), card(id, LEADER_ID, 3)] })

}


function attacked(life: number, characters: string[] = []): { state: GameState; defender: 'p1' | 'p2' } {
  const start    = startGame()
  const attacker = start.first
  const defender = other(attacker)
  const hand     = [card(defender, COUNTER_1K_ID, 1)]
  const lifeCards = Array.from({ length: life }, (_, i) => card(defender, LEADER_ID, 50 + i))
  const base     = withPlayer({ ...start, turn: 3, active: attacker }, defender, { hand, life: lifeCards, characters: characters.map((id, i) => inPlay(card(defender, id, 10 + i))) })

  return { state: apply(base, { type: 'Attack', player: attacker, attacker: 'leader', target: 'leader' }).state, defender }

}


describe('chooseAction', () => {

  it('wins the roll and chooses to go first', () => {
    const rolled = createGame({ seed: 5, defs, decks: { p1: { leader: LEADER_ID, cards: buildDeck() }, p2: { leader: LEADER_ID, cards: buildDeck() } } })

    expect(chooseAction(rolled, rolled.rollWinner, 1)).toEqual({ type: 'ChooseFirst', player: rolled.rollWinner, goFirst: true })

  })

  it('mulligans only when there are no cheap Characters', () => {
    const rolled  = createGame({ seed: 5, defs, decks: { p1: { leader: LEADER_ID, cards: buildDeck() }, p2: { leader: LEADER_ID, cards: buildDeck() } } })
    const created = apply(rolled, { type: 'ChooseFirst', player: rolled.rollWinner, goFirst: true }).state
    const decider = created.first
    const bad     = withPlayer(created, decider, { hand: [card(decider, LEADER_ID, 1)] })

    expect(chooseAction(created, decider, 1)).toEqual({ type: 'Mulligan', player: decider, redraw: false })
    expect(chooseAction(bad, decider, 1)).toEqual({ type: 'Mulligan', player: decider, redraw: true })

  })

  it('plays the highest cost Character it can pay', () => {
    const state = mainState()

    expect(chooseAction(state, state.active, 1)).toMatchObject({ type: 'PlayCharacter', instanceId: `${state.active}-t2` })

  })

  it('attaches DON!! once nothing else can be played, then attacks the Leader', () => {
    const base  = mainState()
    const state = withPlayer(base, base.active, { hand: [], donActive: 2 })
    const first = chooseAction(state, state.active, 1)

    expect(first).toMatchObject({ type: 'AttachDon', target: 'leader' })

    const spent = withPlayer(apply(state, first).state, state.active, { donActive: 0 })

    expect(chooseAction(spent, state.active, 1)).toMatchObject({ type: 'Attack', attacker: 'leader', target: 'leader' })

  })

  it('passes the phase when there is nothing useful to do', () => {
    const base  = mainState()
    const state = withPlayer({ ...base, turn: 1 }, base.active, { hand: [], donActive: 0 })

    expect(chooseAction(state, state.active, 1)).toEqual({ type: 'PassPhase', player: state.active })

  })

  it('reveals a Trigger when it is available', () => {
    const start    = startGame()
    const attacker = start.first
    const defender = other(attacker)
    const battle   = { attacker: 'leader', target: 'leader', attackerPlayer: attacker, step: 'trigger' as const, counterPower: 0, triggerCard: card(defender, NO_COUNTER_ID, 9) }

    expect(chooseAction({ ...start, turn: 3, phase: 'main', battle }, defender, 1)).toEqual({ type: 'RevealTrigger', player: defender })

  })

  it('uses a Counter only when Life is at risk', () => {
    const low  = attacked(1)
    const high = attacked(5)
    const lowCounter  = apply(low.state, { type: 'PassBlock', player: low.defender }).state
    const highCounter = apply(high.state, { type: 'PassBlock', player: high.defender }).state

    expect(chooseAction(lowCounter, low.defender, 1)).toMatchObject({ type: 'UseCounter' })
    expect(chooseAction(highCounter, high.defender, 1)).toEqual({ type: 'PassCounter', player: high.defender })

  })

  it('blocks a lethal attack with a Blocker', () => {
    const { state, defender } = attacked(0, [BLOCKER_ID])

    expect(chooseAction(state, defender, 1)).toMatchObject({ type: 'DeclareBlock', blockerId: `${defender}-t10` })

  })

  it('always returns a legal action and is deterministic', () => {
    const state  = mainState()
    const action = chooseAction(state, state.active, 7)

    expect(getLegalActions(state, state.active)).toContainEqual(action)
    expect(chooseAction(state, state.active, 7)).toEqual(action)

  })

  it('throws with a summary when there are no legal actions', () => {
    const state = mainState()

    expect(() => chooseAction(state, other(state.active), 1)).toThrow(/jugador/)

  })

  it('ignores the rival hand', () => {
    const state   = mainState()
    const rival   = other(state.active)
    const swapped = withPlayer(state, rival, { hand: [card(rival, FOREIGN_ID, 1), card(rival, BLOCKER_ID, 2)] })

    expect(chooseAction(swapped, state.active, 3)).toEqual(chooseAction(state, state.active, 3))

  })

})
