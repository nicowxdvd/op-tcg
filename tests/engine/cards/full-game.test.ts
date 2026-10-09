import { describe, expect, it } from 'vitest'
import { apply } from '../../../src/engine/actions'
import { effectRegistry, loadDeck, loadDefs } from '../../../src/data'
import { getLegalActions } from '../../../src/engine/queries'
import { createGame, DON_TOTAL } from '../../../src/engine/state'
import { nextInt } from '../../../src/engine/rng'
import type { Action, GameState, PlayerId } from '../../../src/engine/types'

const defs      = loadDefs()
const MAX_STEPS = 6000

function cardCount(state: GameState, id: PlayerId): number {
  const player = state.players[id]
  const held   = state.battle?.triggerCard && state.battle.attackerPlayer !== id ? 1 : 0

  return 1 + player.deck.length + player.hand.length + player.life.length + player.trash.length + player.characters.length + (player.stage ? 1 : 0) + held

}


function donCount(state: GameState, id: PlayerId): number {
  const player = state.players[id]

  return player.donDeck + player.donActive + player.donRested + player.leaderAttachedDon + player.characters.reduce((sum, character) => sum + character.attachedDon, 0)

}


function mulligans(state: GameState): GameState {
  let next = state

  while (next.phase === 'startRoll' || next.phase === 'mulligan') {
    const player = getLegalActions(next, 'p1').length ? 'p1' : 'p2'

    next = apply(next, next.phase === 'startRoll' ? { type: 'ChooseFirst', player, goFirst: true } : { type: 'Mulligan', player, redraw: false }).state

  }

  return next

}


function play(seed: number): { state: GameState; steps: number; effectsFired: number } {
  let state        = mulligans(createGame({ seed, defs, effects: effectRegistry, decks: { p1: loadDeck('st01'), p2: loadDeck('st02') } }))
  let rng          = seed
  let steps        = 0
  let effectsFired = 0

  while (state.phase !== 'gameOver' && steps < MAX_STEPS) {
    const decider = state.pending?.player ?? (state.battle ? (state.battle.attackerPlayer === 'p1' ? 'p2' : 'p1') : state.active)
    const legal   = getLegalActions(state, decider)

    if (!legal.length)
      throw new Error(`No legal actions for ${decider} at step ${steps} (phase ${state.phase})`)

    const aggressive = legal.filter(action => action.type !== 'PassPhase')
    const roll       = nextInt(rng, 100)

    rng = roll.seed

    const pool           = state.pending || state.battle || (aggressive.length && roll.value < 85) ? (aggressive.length ? aggressive : legal) : legal
    const pickRoll       = nextInt(rng, pool.length)
    const action: Action = pool[pickRoll.value]
    const result         = apply(state, action)

    rng           = pickRoll.seed
    state         = result.state
    effectsFired += result.events.filter(event => event.type === 'EffectTriggered' || event.type === 'EffectActivated').length
    steps++

    for (const id of ['p1', 'p2'] as const) {
      expect(donCount(state, id), `DON!! of ${id} at step ${steps}`).toBe(DON_TOTAL)
      expect(cardCount(state, id), `cards of ${id} at step ${steps}`).toBe(51)

    }

  }

  return { state, steps, effectsFired }

}


describe('full ST01 vs ST02 game with the real registry', () => {

  it.each([1, 2, 3, 4, 5, 6, 7, 8])('seed %i plays to the end keeping DON!! and card totals', seed => {
    const { state, steps, effectsFired } = play(seed)

    expect(state.phase).toBe('gameOver')
    expect(state.winner).not.toBeNull()
    expect(steps).toBeLessThan(MAX_STEPS)
    expect(effectsFired).toBeGreaterThan(0)

  })

})
