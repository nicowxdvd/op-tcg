import type { GameState, PlayerId } from '../engine'
import { opponentOf } from '../engine'
import type { MatchConfig } from './gameConfig'

export interface GameResult {
  winner: PlayerId
  reason: 'life' | 'deck' | 'concede'
  turns: number

}

const REASONS: Record<GameResult['reason'], { you: string; other: string }> = {
  life   : { you: 'Te quedaste sin Life', other: 'se quedó sin Life' },
  deck   : { you: 'Te quedaste sin cartas en el mazo', other: 'se quedó sin cartas en el mazo' },
  concede: { you: 'Te rendiste', other: 'se rindió' }
}


export function gameResult(state: GameState): GameResult | null {
  if (!state.winner)
    return null

  const loser = state.players[opponentOf(state.winner)]

  return { winner: state.winner, reason: state.conceded ? 'concede' : loser.deck.length === 0 ? 'deck' : 'life', turns: state.turn }

}


export function winnerLabel(result: GameResult, mode: MatchConfig['mode']): string {
  if (mode === 'cpu')
    return result.winner === 'p1' ? '¡Ganaste!' : 'Ganó la CPU'

  return result.winner === 'p1' ? 'Ganó el Jugador 1' : 'Ganó el Jugador 2'

}


export function reasonLabel(result: GameResult, mode: MatchConfig['mode']): string {
  const reason = REASONS[result.reason]

  if (mode === 'cpu')
    return result.winner === 'p1' ? `La CPU ${reason.other}` : reason.you

  return `${result.winner === 'p1' ? 'El Jugador 2' : 'El Jugador 1'} ${reason.other}`

}
