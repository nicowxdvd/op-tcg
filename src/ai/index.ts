import type { PlayerId } from '../engine/types'
import { next } from '../engine/rng'
import type { Rng } from './heuristics'

export { chooseAction } from './simpleAI'
export type { Rng } from './heuristics'

export interface AIPlayer {
  player: PlayerId
  delayMs: number

}


export function advanceRng(rng: Rng): Rng {
  return next(rng).seed

}
