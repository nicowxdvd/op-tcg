import { describe, expect, it } from 'vitest'
import { playerNames } from '../../src/app/players'
import type { MatchConfig } from '../../src/app/gameConfig'

const base: MatchConfig = { mode: 'cpu', decks: { p1: 'st01', p2: 'st02' }, seed: 1, difficulty: 'normal' }

describe('playerNames', () => {

  it('contra la IA usa Tú y el nivel', () => {
    expect(playerNames(base)).toEqual({ p1: 'Tú', p2: 'IA · Normal' })
    expect(playerNames({ ...base, difficulty: 'dificil' }).p2).toBe('IA · Difícil')

  })


  it('en hotseat usa Jugador 1 y 2', () => {
    expect(playerNames({ ...base, mode: 'hotseat' })).toEqual({ p1: 'Jugador 1', p2: 'Jugador 2' })

  })

})
