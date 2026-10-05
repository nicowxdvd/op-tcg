import { describe, expect, it } from 'vitest'
import { advanceRng, chooseAction } from '../../src/ai'
import { apply } from '../../src/engine/actions'
import { effectRegistry, loadDeck, loadDefs } from '../../src/data'
import { getLegalActions } from '../../src/engine/queries'
import { createGame } from '../../src/engine/state'
import type { Action, GameState, PlayerId } from '../../src/engine/types'

const defs      = loadDefs()
const MAX_STEPS = 6000
const MAX_TURNS = 100

function decider(state: GameState): PlayerId {
  if (state.pending)
    return state.pending.player
  if (state.phase === 'mulligan')
    return getLegalActions(state, 'p1').length ? 'p1' : 'p2'
  if (state.battle)
    return state.battle.attackerPlayer === 'p1' ? 'p2' : 'p1'

  return state.active

}


function play(seed: number): { state: GameState; steps: number; types: Set<Action['type']> } {
  let state = createGame({ seed, defs, effects: effectRegistry, decks: { p1: loadDeck('st01'), p2: loadDeck('st02') } })
  let rng   = seed
  let steps = 0
  const types = new Set<Action['type']>()

  while (state.phase !== 'gameOver' && steps < MAX_STEPS && state.turn <= MAX_TURNS) {
    const player = decider(state)
    const action = chooseAction(state, player, rng)

    expect(getLegalActions(state, player)).toContainEqual(action)

    types.add(action.type)
    rng   = advanceRng(rng)
    state = apply(state, action).state
    steps++

  }

  return { state, steps, types }

}


describe('AI vs AI ST01 vs ST02', () => {

  it.each(Array.from({ length: 50 }, (_, i) => i + 1))('seed %i finishes with a winner', seed => {
    const { state, steps } = play(seed)

    expect(state.phase).toBe('gameOver')
    expect(state.winner).not.toBeNull()
    expect(steps).toBeLessThan(MAX_STEPS)
    expect(state.turn).toBeLessThanOrEqual(MAX_TURNS)

  })

  it('plays characters, attaches DON!!, attacks, blocks and counters across games', () => {
    const seen = new Set<Action['type']>()

    for (let seed = 1; seed <= 20; seed++)
      play(seed).types.forEach(type => seen.add(type))

    for (const type of ['PlayCharacter', 'AttachDon', 'Attack', 'DeclareBlock', 'UseCounter'] as const)
      expect(seen.has(type), type).toBe(true)

  })

})
