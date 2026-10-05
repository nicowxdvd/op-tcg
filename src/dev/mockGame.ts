import { effectRegistry, loadDeck, loadDefs } from '../data'
import { createGame } from '../engine'
import type { AIPlayer } from '../ai'
import { GameController } from '../ui/GameController'


export interface MockOptions {
  cpu?: AIPlayer | null

}


const DEFAULT_CPU: AIPlayer = { player: 'p2', delayMs: 600 }


export function createMockController(seed = Date.now(), options: MockOptions = {}): GameController {
  const state = createGame({ seed, defs: loadDefs(), effects: effectRegistry, decks: { p1: loadDeck('st01'), p2: loadDeck('st02') } })

  return new GameController(state, { ai: options.cpu === undefined ? DEFAULT_CPU : options.cpu, rngSeed: seed })

}
