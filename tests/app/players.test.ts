import { describe, expect, it } from 'vitest'
import { playerNames, playersFor } from '../../src/app/players'
import { COLORS } from '../../src/ui/theme'
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


  it('playersFor pone los nombres en mayúsculas con indicador azul para el humano y verde para la IA', () => {
    const players = playersFor(base)

    expect(players.p1).toEqual({ name: 'TÚ', indicator: COLORS.indicatorHuman })
    expect(players.p2).toEqual({ name: 'IA · NORMAL', indicator: COLORS.indicatorCpu })

  })


  it('playersFor en hotseat no usa el verde de la IA', () => {
    expect(playersFor({ ...base, mode: 'hotseat' }).p2.indicator).not.toBe(COLORS.indicatorCpu)

  })

})
