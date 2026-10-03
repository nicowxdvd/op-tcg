import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { getLegalActions } from '../../src/engine/queries'
import { card, inPlay, startGame, withPlayer } from './helpers'
import type { GameState } from '../../src/engine/types'

function stage(life = 0): GameState {
  const start  = startGame()
  const mine   = withPlayer({ ...start, turn: 3, active: 'p1' }, 'p1', { characters: [inPlay(card('p1', 'T-C02', 1), 1)], donActive: 5, hand: [card('p1', 'T-C04', 5)] })
  const hurt   = withPlayer(mine, 'p2', { life: mine.players.p2.life.slice(0, life) })

  return hurt

}


function finish(state: GameState): ReturnType<typeof apply> {
  const attacked = apply(state, { type: 'Attack', player: 'p1', attacker: 'leader', target: 'leader' }).state
  const blocked  = apply(attacked, { type: 'PassBlock', player: 'p2' }).state

  return apply(blocked, { type: 'PassCounter', player: 'p2' })

}


describe('victoria', () => {

  it('golpear al Leader con 0 Life deja winner y phase gameOver', () => {
    const result = finish(stage(0))

    expect(result.state.winner).toBe('p1')
    expect(result.state.phase).toBe('gameOver')
    expect(result.state.battle).toBeNull()
    expect(result.events).toEqual([{ type: 'CounterPassed', player: 'p2' }, { type: 'BattleEnded', connected: true }, { type: 'GameOver', winner: 'p1' }])

  })


  it('golpear al Leader con 1 Life no gana todavía', () => {
    const result = finish(stage(1))

    expect(result.state.winner).toBeNull()
    expect(result.state.phase).toBe('main')
    expect(result.state.players.p2.life).toHaveLength(0)

  })


  it('un ataque que no conecta con 0 Life no gana', () => {
    const state    = withPlayer(stage(0), 'p1', { leaderRested: false, characters: [inPlay(card('p1', 'T-C01', 1), 1)] })
    const attacked = apply(state, { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'leader' }).state
    const blocked  = apply(attacked, { type: 'PassBlock', player: 'p2' }).state
    const result   = apply(blocked, { type: 'PassCounter', player: 'p2' })

    expect(result.state.winner).toBeNull()
    expect(result.state.phase).toBe('main')

  })


  it('en gameOver no hay acciones legales para nadie', () => {
    const over = finish(stage(0)).state

    expect(getLegalActions(over, 'p1')).toEqual([])
    expect(getLegalActions(over, 'p2')).toEqual([])

  })


  it('en gameOver las acciones lanzan error', () => {
    const over = finish(stage(0)).state

    expect(() => apply(over, { type: 'Attack', player: 'p1', attacker: 'leader', target: 'leader' })).toThrow(/fase main/)
    expect(() => apply(over, { type: 'PassPhase', player: 'p1' })).toThrow(/fase main/)

  })

})


describe('acciones bloqueadas durante la batalla', () => {

  function inBattle(): GameState {
    return apply(stage(3), { type: 'Attack', player: 'p1', attacker: 'leader', target: 'leader' }).state

  }


  it('PassPhase lanza error', () => {
    expect(() => apply(inBattle(), { type: 'PassPhase', player: 'p1' })).toThrow(/batalla en curso/)

  })


  it('PlayCharacter lanza error', () => {
    expect(() => apply(inBattle(), { type: 'PlayCharacter', player: 'p1', instanceId: 'p1-t5' })).toThrow(/batalla en curso/)

  })


  it('AttachDon lanza error', () => {
    expect(() => apply(inBattle(), { type: 'AttachDon', player: 'p1', target: 'leader' })).toThrow(/batalla en curso/)

  })


  it('el atacante no puede actuar en el paso block', () => {
    const state = inBattle()

    expect(() => apply(state, { type: 'PassBlock', player: 'p1' })).toThrow(/decide/)

  })

})
