import type { Difficulty } from '../ai'
import type { PlayerId } from '../engine'
import { COLORS } from '../ui/theme'
import type { MatchConfig } from './gameConfig'

const LEVELS: Record<Difficulty, string> = { normal: 'Normal', dificil: 'Difícil', experto: 'Experto' }


export function playerNames(config: MatchConfig): Record<PlayerId, string> {
  if (config.mode === 'cpu')
    return { p1: 'Tú', p2: `IA · ${LEVELS[config.difficulty]}` }

  return { p1: 'Jugador 1', p2: 'Jugador 2' }

}


export interface PlayerInfo {
  name: string
  indicator: number

}


export function playersFor(config: MatchConfig): Record<PlayerId, PlayerInfo> {
  const names = playerNames(config)

  return {
    p1: { name: names.p1.toUpperCase(), indicator: COLORS.indicatorHuman },
    p2: { name: names.p2.toUpperCase(), indicator: config.mode === 'cpu' ? COLORS.indicatorCpu : COLORS.indicatorSelf }
  }

}
