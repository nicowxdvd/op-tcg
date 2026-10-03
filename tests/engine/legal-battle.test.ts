import { describe, expect, it } from 'vitest'
import { apply, getLegalActions } from '../../src/engine'
import { BLOCKER_ID, COUNTER_1K_ID, NO_COUNTER_ID } from './fixtures'
import { card, inPlay, startGame, withPlayer } from './helpers'
import type { Action, GameState } from '../../src/engine'

function stage(turn = 3): GameState {
  const start = startGame()
  const mine  = withPlayer({ ...start, turn, active: 'p1' }, 'p1', { characters: [inPlay(card('p1', 'T-C02', 1), 1), inPlay(card('p1', 'T-C03', 2), turn)], donActive: 0, hand: [] })

  return withPlayer(mine, 'p2', { characters: [{ ...inPlay(card('p2', 'T-C02', 3), 1), rested: true }, inPlay(card('p2', 'T-C04', 4), 1), inPlay(card('p2', BLOCKER_ID, 5), 1), { ...inPlay(card('p2', BLOCKER_ID, 6), 1), rested: true }], hand: [card('p2', COUNTER_1K_ID, 7), card('p2', NO_COUNTER_ID, 8)] })

}


function attacks(actions: Action[]): Action[] {
  return actions.filter(action => action.type === 'Attack')

}


describe('getLegalActions con batalla', () => {

  it('no ofrece Attack en turn <= 2', () => {
    expect(attacks(getLegalActions(stage(1), 'p1'))).toEqual([])

  })


  it('ofrece cada Attack posible en main sin batalla', () => {
    const found = attacks(getLegalActions(stage(), 'p1'))

    expect(found).toEqual([
      { type: 'Attack', player: 'p1', attacker: 'leader', target: 'leader' },
      { type: 'Attack', player: 'p1', attacker: 'leader', target: 'p2-t3' },
      { type: 'Attack', player: 'p1', attacker: 'leader', target: 'p2-t6' },
      { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'leader' },
      { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'p2-t3' },
      { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'p2-t6' },
    ])

  })


  it('no ofrece atacantes descansados', () => {
    const tired = withPlayer(stage(), 'p1', { leaderRested: true })

    expect(attacks(getLegalActions(tired, 'p1')).some(action => action.type === 'Attack' && action.attacker === 'leader')).toBe(false)

  })


  it('en block solo el defensor actúa, con los blockers activos y PassBlock', () => {
    const state = apply(stage(), { type: 'Attack', player: 'p1', attacker: 'leader', target: 'leader' }).state

    expect(getLegalActions(state, 'p1')).toEqual([])
    expect(getLegalActions(state, 'p2')).toEqual([{ type: 'DeclareBlock', player: 'p2', blockerId: 'p2-t5' }, { type: 'PassBlock', player: 'p2' }])

  })


  it('en counter solo el defensor actúa, con los Characters con counter y PassCounter', () => {
    const blocking = apply(stage(), { type: 'Attack', player: 'p1', attacker: 'leader', target: 'leader' }).state
    const state    = apply(blocking, { type: 'PassBlock', player: 'p2' }).state

    expect(getLegalActions(state, 'p1')).toEqual([])
    expect(getLegalActions(state, 'p2')).toEqual([{ type: 'UseCounter', player: 'p2', instanceId: 'p2-t7' }, { type: 'PassCounter', player: 'p2' }])

  })


  it('cada acción devuelta se aplica sin error en todos los pasos', () => {
    const blocking = apply(stage(), { type: 'Attack', player: 'p1', attacker: 'leader', target: 'leader' }).state
    const counter  = apply(blocking, { type: 'PassBlock', player: 'p2' }).state

    for (const state of [stage(), blocking, counter])
      for (const player of ['p1', 'p2'] as const)
        for (const action of getLegalActions(state, player))
          expect(() => apply(state, action)).not.toThrow()

  })


  it('una acción fuera de la lista lanza error', () => {
    const blocking = apply(stage(), { type: 'Attack', player: 'p1', attacker: 'leader', target: 'leader' }).state

    expect(() => apply(blocking, { type: 'DeclareBlock', player: 'p2', blockerId: 'p2-t6' })).toThrow()
    expect(() => apply(blocking, { type: 'UseCounter', player: 'p2', instanceId: 'p2-t7' })).toThrow()
    expect(() => apply(stage(), { type: 'Attack', player: 'p1', attacker: 'p1-t2', target: 'leader' })).toThrow()
    expect(() => apply(stage(), { type: 'Attack', player: 'p1', attacker: 'leader', target: 'p2-t4' })).toThrow()

  })


  it('en gameOver no hay acciones', () => {
    const over = { ...stage(), phase: 'gameOver' as const, winner: 'p1' as const }

    expect(getLegalActions(over, 'p1')).toEqual([])
    expect(getLegalActions(over, 'p2')).toEqual([])

  })

})
