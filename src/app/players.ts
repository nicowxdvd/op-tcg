import type { Difficulty } from '../ai'
import type { PlayerId } from '../engine'
import type { MatchConfig } from './gameConfig'

const LEVELS: Record<Difficulty, string> = { normal: 'Normal', dificil: 'Difícil', experto: 'Experto' }


export function playerNames(config: MatchConfig): Record<PlayerId, string> {
  if (config.mode === 'cpu')
    return { p1: 'Tú', p2: `IA · ${LEVELS[config.difficulty]}` }

  return { p1: 'Jugador 1', p2: 'Jugador 2' }

}
