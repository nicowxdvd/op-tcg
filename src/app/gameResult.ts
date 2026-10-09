import type { GameState, PlayerId } from '../engine'
import { opponentOf } from '../engine'
import type { MatchConfig } from './gameConfig'

export interface GameResult {
  winner: PlayerId
  reason: 'life' | 'deck' | 'concede'
  turns: number

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
  const loser = mode === 'cpu' ? (result.winner === 'p1' ? 'La CPU' : 'Vos') : (result.winner === 'p1' ? 'El Jugador 2' : 'El Jugador 1')

  if (result.reason === 'concede')
    return `${loser} se rindió`

  return result.reason === 'deck' ? `${loser} se quedó sin cartas en el mazo` : `${loser} se quedó sin Life`

}
