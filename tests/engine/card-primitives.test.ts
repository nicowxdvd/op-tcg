import { describe, expect, it } from 'vitest'
import { resolveQueue } from '../../src/engine/effects'
import { BLOCKER_ID, defs } from './fixtures'
import { card, inPlay, startGame, withPlayer } from './helpers'
import type { EffectStep, GameEvent, GameState } from '../../src/engine/types'

function stage(): GameState {
  const start = startGame()
  const mine  = withPlayer({ ...start, turn: 3, active: 'p1', defs: defs }, 'p1', { characters: [inPlay(card('p1', 'T-C04', 1), 1, 0)], donActive: 2, donRested: 3 })

  return withPlayer(mine, 'p2', { characters: [{ ...inPlay(card('p2', 'T-C02', 2), 1), rested: true }, inPlay(card('p2', BLOCKER_ID, 3))], donActive: 4, donRested: 0 })

}


function run(state: GameState, ...steps: EffectStep[]): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = []

  return { state: resolveQueue({ ...state, effectQueue: [{ source: 'p1-t1', owner: 'p1', steps }] }, events), events }

}


describe('primitiva attachDon', () => {

  it('pasa DON!! descansados al Character', () => {
    const result = run(stage(), { op: 'attachDon', player: 'p1', target: 'p1-t1', amount: 2 })

    expect(result.state.players.p1.characters[0].attachedDon).toBe(2)
    expect(result.state.players.p1.donRested).toBe(1)
    expect(result.events.filter(event => event.type === 'DonAttached')).toHaveLength(2)

  })


  it('pasa DON!! descansados al Leader', () => {
    const state  = stage()
    const result = run(state, { op: 'attachDon', player: 'p1', target: state.players.p1.leader.instanceId, amount: 1 })

    expect(result.state.players.p1.leaderAttachedDon).toBe(1)
    expect(result.state.players.p1.donRested).toBe(2)

  })


  it('adjunta solo los que hay descansados y no toca los activos', () => {
    const result = run(stage(), { op: 'attachDon', player: 'p1', target: 'p1-t1', amount: 9 })

    expect(result.state.players.p1.characters[0].attachedDon).toBe(3)
    expect(result.state.players.p1.donRested).toBe(0)
    expect(result.state.players.p1.donActive).toBe(2)

  })


  it('falla si el objetivo no es del jugador', () => {
    expect(() => run(stage(), { op: 'attachDon', player: 'p1', target: 'p2-t2', amount: 1 })).toThrow(/no está en el área/)

  })

})



describe('primitivas restDon y activateDon', () => {

  it('restDon descansa DON!! activos del jugador indicado', () => {
    const result = run(stage(), { op: 'restDon', player: 'p2', amount: 1 })

    expect(result.state.players.p2).toMatchObject({ donActive: 3, donRested: 1 })
    expect(result.events).toContainEqual({ type: 'DonRested', player: 'p2', amount: 1 })

  })


  it('restDon con menos DON!! activos de los pedidos descansa los que hay', () => {
    const result = run(withPlayer(stage(), 'p2', { donActive: 1 }), { op: 'restDon', player: 'p2', amount: 3 })

    expect(result.state.players.p2).toMatchObject({ donActive: 0, donRested: 1 })

  })


  it('activateDon activa DON!! descansados', () => {
    const result = run(stage(), { op: 'activateDon', player: 'p1', amount: 2 })

    expect(result.state.players.p1).toMatchObject({ donActive: 4, donRested: 1 })
    expect(result.events).toContainEqual({ type: 'DonActivated', player: 'p1', amount: 2 })

  })


  it('activateDon sin DON!! descansados no hace nada ni emite eventos', () => {
    const result = run(withPlayer(stage(), 'p1', { donRested: 0 }), { op: 'activateDon', player: 'p1', amount: 1 })

    expect(result.state.players.p1.donActive).toBe(2)
    expect(result.events).toEqual([])

  })

})
