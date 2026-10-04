import type { GameEvent, GameState, Timing } from '../types'
import { executeStep } from './primitives'
import { queueEffects, type EffectSource } from './timing'

export type { EffectSource } from './timing'


export function resolveQueue(state: GameState, events: GameEvent[]): GameState {
  let next = state

  while (next.effectQueue.length) {
    const [queued, ...rest] = next.effectQueue

    next = { ...next, effectQueue: rest }

    for (const step of queued.steps)
      next = executeStep(next, step, queued, events)

    if (next.phase === 'gameOver')
      return { ...next, effectQueue: [] }

  }

  return next

}


export function fireEffects(state: GameState, timing: Timing, source: EffectSource, events: GameEvent[]): GameState {
  return resolveQueue(queueEffects(state, timing, source, events), events)

}
