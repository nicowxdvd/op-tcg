import { describe, expect, it } from 'vitest'
import { buildGame, matchError, rematchConfig } from '../../src/app/gameConfig'
import type { MatchConfig } from '../../src/app/gameConfig'

const VALID: MatchConfig = { mode: 'cpu', decks: { p1: 'st01', p2: 'st02' }, seed: 7, difficulty: 'normal' }

describe('gameConfig', () => {
  it('buildGame crea la partida con los mazos elegidos', () => {
    const state = buildGame(VALID)

    expect(state.players.p1.leader.defId).toBe(state.defs[state.players.p1.leader.defId].id)
    expect(state.players.p1.leader.defId).not.toBe(state.players.p2.leader.defId)
    expect(state.phase).toBe('startRoll')

  })


  it('la misma configuración produce la misma partida', () => {
    expect(buildGame(VALID).players.p1.hand).toEqual(buildGame(VALID).players.p1.hand)

  })


  it('matchError devuelve null con una configuración válida', () => {
    expect(matchError(VALID)).toBeNull()

  })


  it('matchError devuelve el motivo con un mazo inválido', () => {
    expect(matchError({ ...VALID, decks: { p1: 'st99', p2: 'st02' } })).toContain('st99')

  })


  it('rematchConfig conserva modo y mazos y cambia la seed', () => {
    const rematch = rematchConfig(VALID, 99)

    expect(rematch).toEqual({ ...VALID, seed: 99 })

  })


  it('rematchConfig nunca repite la seed anterior', () => {
    expect(rematchConfig(VALID, VALID.seed).seed).not.toBe(VALID.seed)

  })

})
