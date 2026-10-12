import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { getLegalActions } from '../../src/engine/queries'
import { newGame, rawGame } from './helpers'

describe('Concede', () => {

  it('termina la partida y gana el rival', () => {
    const result = apply(newGame(), { type: 'Concede', player: 'p1' })

    expect(result.state.phase).toBe('gameOver')
    expect(result.state.winner).toBe('p2')
    expect(result.state.conceded).toBe(true)
    expect(result.events).toEqual([{ type: 'GameOver', winner: 'p2' }])

  })


  it('funciona durante el sorteo', () => {
    expect(apply(rawGame(), { type: 'Concede', player: 'p2' }).state.winner).toBe('p1')

  })


  it('falla si la partida ya terminó', () => {
    const over = apply(newGame(), { type: 'Concede', player: 'p1' }).state

    expect(() => apply(over, { type: 'Concede', player: 'p2' })).toThrow('La partida ya terminó')

  })


  it('no aparece entre las acciones legales, para que la IA no la elija', () => {
    expect(getLegalActions(newGame(), 'p1').some(action => action.type === 'Concede')).toBe(false)

  })

})
