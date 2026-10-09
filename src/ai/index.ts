import type { PlayerId } from '../engine/types'
import { next } from '../engine/rng'
import type { Rng } from './heuristics'

export { chooseAction } from './simpleAI'
export type { Rng } from './heuristics'

export type Difficulty = 'normal' | 'dificil' | 'experto'

export const DIFFICULTIES: Difficulty[] = ['normal', 'dificil', 'experto']

export interface AIPlayer {
  player: PlayerId
  delayMs: number
  difficulty: Difficulty

}


export function advanceRng(rng: Rng): Rng {
  return next(rng).seed

}
