import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { getLegalActions } from '../../src/engine/queries'
import { BANISH_ID, DOUBLE_ID, RUSH_ID } from './fixtures'
import { card, inPlay, startGame, withPlayer } from './helpers'
import type { GameState } from '../../src/engine/types'

function stage(defId: string, playedTurn: number, life = 5): GameState {
  const start = startGame()
  const mine  = withPlayer({ ...start, turn: 3, active: 'p1' }, 'p1', { characters: [inPlay(card('p1', defId, 1), playedTurn)] })

  return withPlayer(mine, 'p2', { life: mine.players.p2.life.slice(0, life) })

}


function hit(state: GameState) {
  const attacked = apply(state, { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'leader' }).state
  const blocked  = apply(attacked, { type: 'PassBlock', player: 'p2' }).state

  return apply(blocked, { type: 'PassCounter', player: 'p2' })

}


describe('Rush', () => {

  it('un Character con Rush ataca el turno que entra', () => {
    const state = stage(RUSH_ID, 3)

    expect(getLegalActions(state, 'p1')).toContainEqual({ type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'leader' })
    expect(apply(state, { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'leader' }).state.battle).not.toBeNull()

  })


  it('un Character sin Rush no ataca el turno que entra', () => {
    const state = stage('T-C04', 3)

    expect(getLegalActions(state, 'p1').some(action => action.type === 'Attack' && action.attacker === 'p1-t1')).toBe(false)
    expect(() => apply(state, { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'leader' })).toThrow(/entró este turno/)

  })

})


describe('Double Attack', () => {

  it('un ataque conectado quita 2 Life', () => {
    const state  = stage(DOUBLE_ID, 1)
    const life   = state.players.p2.life
    const result = hit(state)
    const rival  = result.state.players.p2

    expect(rival.life).toEqual(life.slice(2))
    expect(rival.hand.slice(-2)).toEqual([life[0], life[1]])
    expect(result.events.filter(event => event.type === 'LifeTaken')).toHaveLength(2)
    expect(result.events.at(-1)).toEqual({ type: 'BattleEnded', connected: true })

  })


  it('con 1 Life el segundo daño gana la partida', () => {
    const result = hit(stage(DOUBLE_ID, 1, 1))

    expect(result.state.winner).toBe('p1')
    expect(result.state.phase).toBe('gameOver')
    expect(result.state.players.p2.life).toHaveLength(0)

  })

})


describe('Banish', () => {

  it('la carta de Life va al trash sin pasar por la mano', () => {
    const state  = stage(BANISH_ID, 1)
    const life   = state.players.p2.life
    const result = hit(state)
    const rival  = result.state.players.p2

    expect(rival.life).toEqual(life.slice(1))
    expect(rival.trash).toEqual([life[0]])
    expect(rival.hand).toEqual(state.players.p2.hand)
    expect(result.events).toContainEqual({ type: 'LifeBanished', player: 'p2', instanceId: life[0].instanceId })
    expect(result.events.some(event => event.type === 'LifeTaken')).toBe(false)

  })

})
