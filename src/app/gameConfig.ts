import type { Difficulty } from '../ai'
import type { GameState } from '../engine'
import type { PlayerId } from '../engine/types'
import { createGame } from '../engine'
import { effectRegistry, loadDeck, loadDefs } from '../data'

export interface MatchConfig {
  mode: 'cpu' | 'hotseat'
  decks: Record<PlayerId, string>
  seed: number
  difficulty: Difficulty

}


export const HUMAN_PLAYER: PlayerId = 'p1'


export function buildGame(config: MatchConfig): GameState {
  return createGame({ seed: config.seed, defs: loadDefs(), effects: effectRegistry, decks: { p1: loadDeck(config.decks.p1), p2: loadDeck(config.decks.p2) } })

}


export function matchError(config: MatchConfig): string | null {
  try {
    buildGame(config)

    return null
  }
  catch (error) {
    return error instanceof Error ? error.message : String(error)
  }

}


export function rematchConfig(config: MatchConfig, seed = Date.now()): MatchConfig {
  return { ...config, seed: seed === config.seed ? seed + 1 : seed }

}
