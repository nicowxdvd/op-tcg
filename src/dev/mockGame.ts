import { effectRegistry, loadDeck, loadDefs } from '../data'
import { createGame } from '../engine'
import { GameController } from '../ui/GameController'


export function createMockController(seed = Date.now()): GameController {
  const state = createGame({ seed, defs: loadDefs(), effects: effectRegistry, decks: { p1: loadDeck('st01'), p2: loadDeck('st02') } })

  return new GameController(state)

}
