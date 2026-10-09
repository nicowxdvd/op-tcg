import type { AIPlayer } from '../ai'
import { GameController } from '../ui/GameController'
import { buildGame } from './gameConfig'
import type { MatchConfig } from './gameConfig'

const CPU: Omit<AIPlayer, 'difficulty'> = { player: 'p2', delayMs: 600 }


export function createController(config: MatchConfig): GameController {
  return new GameController(buildGame(config), { ai: config.mode === 'cpu' ? { ...CPU, difficulty: config.difficulty } : null, rngSeed: config.seed })

}
