import { describe, expect, it } from 'vitest'
import { playerNames, playersFor } from '../../src/app/players'
import { COLORS } from '../../src/ui/theme'
import type { MatchConfig } from '../../src/app/gameConfig'

const base: MatchConfig = { mode: 'cpu', decks: { p1: 'st01', p2: 'st02' }, seed: 1, difficulty: 'normal' }
const tints             = { p1: 0x3b82f6, p2: 0xa855f7 }

describe('playerNames', () => {

  it('contra la IA usa Tú y el nivel', () => {
    expect(playerNames(base)).toEqual({ p1: 'Tú', p2: 'IA · Normal' })
    expect(playerNames({ ...base, difficulty: 'dificil' }).p2).toBe('IA · Difícil')

  })


  it('en hotseat usa Jugador 1 y 2', () => {
    expect(playerNames({ ...base, mode: 'hotseat' })).toEqual({ p1: 'Jugador 1', p2: 'Jugador 2' })

  })


  it('playersFor pone los nombres en mayúsculas, el color del Líder en el punto y azul o verde en el borde', () => {
    const players = playersFor(base, tints)

    expect(players.p1).toEqual({ name: 'TÚ', indicator: tints.p1, frame: COLORS.indicatorHuman })
    expect(players.p2).toEqual({ name: 'IA · NORMAL', indicator: tints.p2, frame: COLORS.indicatorCpu })

  })


  it('playersFor en hotseat no usa el verde de la IA', () => {
    expect(playersFor({ ...base, mode: 'hotseat' }, tints).p2.frame).not.toBe(COLORS.indicatorCpu)

  })

})
