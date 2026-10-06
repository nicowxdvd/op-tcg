import { describe, expect, it } from 'vitest'
import { buildGame } from '../../src/app/gameConfig'
import { gameResult, reasonLabel, winnerLabel } from '../../src/app/gameResult'

const state = buildGame({ mode: 'cpu', decks: { p1: 'st01', p2: 'st02' }, seed: 3 })

describe('gameResult', () => {
  it('es null mientras no hay ganador', () => {
    expect(gameResult(state)).toBeNull()

  })


  it('el motivo es Life cuando el perdedor todavía tiene mazo', () => {
    const over = { ...state, phase: 'gameOver' as const, winner: 'p1' as const, turn: 9 }

    expect(gameResult(over)).toEqual({ winner: 'p1', reason: 'life', turns: 9 })

  })


  it('el motivo es mazo vacío cuando el perdedor no tiene cartas en el mazo', () => {
    const loser = { ...state.players.p2, deck: [] }
    const over  = { ...state, phase: 'gameOver' as const, winner: 'p1' as const, players: { ...state.players, p2: loser } }

    expect(gameResult(over)?.reason).toBe('deck')

  })


  it('los textos dependen del modo', () => {
    const result = { winner: 'p2' as const, reason: 'life' as const, turns: 4 }

    expect(winnerLabel(result, 'cpu')).toBe('Ganó la CPU')
    expect(winnerLabel(result, 'hotseat')).toBe('Ganó el Jugador 2')
    expect(reasonLabel(result, 'cpu')).toBe('Vos se quedó sin Life')
    expect(reasonLabel({ ...result, reason: 'deck' }, 'hotseat')).toBe('El Jugador 1 se quedó sin cartas en el mazo')

  })

})
