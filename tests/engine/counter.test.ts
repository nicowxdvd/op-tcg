import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { COUNTER_1K_ID, COUNTER_2K_ID, LEADER_ID, NO_COUNTER_ID } from './fixtures'
import { card, other, startGame, withPlayer } from './helpers'
import type { GameState, PlayerId } from '../../src/engine/types'

function stage(): { state: GameState; attacker: PlayerId; defender: PlayerId } {
  const start    = startGame()
  const attacker = start.first
  const defender = other(attacker)
  const base     = withPlayer({ ...start, turn: 3, active: attacker }, defender, { hand: [card(defender, COUNTER_1K_ID, 1), card(defender, COUNTER_2K_ID, 2), card(defender, NO_COUNTER_ID, 3), card(defender, LEADER_ID, 4)], trash: [] })
  const fought   = apply(base, { type: 'Attack', player: attacker, attacker: 'leader', target: 'leader' }).state
  const state    = apply(fought, { type: 'PassBlock', player: defender }).state

  return { state, attacker, defender }

}


describe('UseCounter', () => {

  it('trashea la carta de la mano y suma su counter', () => {
    const { state, defender } = stage()
    const result              = apply(state, { type: 'UseCounter', player: defender, instanceId: `${defender}-t1` })
    const player              = result.state.players[defender]

    expect(player.hand.map(c => c.instanceId)).toEqual([`${defender}-t2`, `${defender}-t3`, `${defender}-t4`])
    expect(player.trash.map(c => c.instanceId)).toEqual([`${defender}-t1`])
    expect(result.state.battle?.counterPower).toBe(1000)
    expect(result.state.battle?.step).toBe('counter')
    expect(result.events).toEqual([{ type: 'CounterUsed', player: defender, instanceId: `${defender}-t1`, counterPower: 1000 }])

  })


  it('acumula los counters usados', () => {
    const { state, defender } = stage()
    const first               = apply(state, { type: 'UseCounter', player: defender, instanceId: `${defender}-t1` }).state
    const second              = apply(first, { type: 'UseCounter', player: defender, instanceId: `${defender}-t2` }).state

    expect(second.battle?.counterPower).toBe(3000)
    expect(second.players[defender].trash).toHaveLength(2)

  })


  it('falla con una carta sin counter', () => {
    const { state, defender } = stage()

    expect(() => apply(state, { type: 'UseCounter', player: defender, instanceId: `${defender}-t3` })).toThrow(/no tiene counter/)

  })


  it('falla con una carta que no es Character', () => {
    const { state, defender } = stage()

    expect(() => apply(state, { type: 'UseCounter', player: defender, instanceId: `${defender}-t4` })).toThrow(/no es un Character/)

  })


  it('falla con una carta que no está en la mano', () => {
    const { state, defender } = stage()

    expect(() => apply(state, { type: 'UseCounter', player: defender, instanceId: 'p9-x' })).toThrow(/no está en la mano/)

  })


  it('solo decide el defensor', () => {
    const { state, attacker, defender } = stage()

    expect(() => apply(state, { type: 'UseCounter', player: attacker, instanceId: `${defender}-t1` })).toThrow(/decide/)

  })


  it('falla fuera del paso counter', () => {
    const { state, defender } = stage()
    const blocking            = { ...state, battle: state.battle && { ...state.battle, step: 'block' as const } }

    expect(() => apply(blocking, { type: 'UseCounter', player: defender, instanceId: `${defender}-t1` })).toThrow(/paso counter/)

  })


  it('no muta el estado de entrada', () => {
    const { state, defender } = stage()
    const snapshot            = JSON.stringify(state)

    apply(state, { type: 'UseCounter', player: defender, instanceId: `${defender}-t1` })

    expect(JSON.stringify(state)).toBe(snapshot)

  })

})


describe('PassCounter', () => {

  it('cierra el paso counter y la batalla', () => {
    const { state, defender } = stage()
    const result              = apply(state, { type: 'PassCounter', player: defender })

    expect(result.state.battle).toBeNull()
    expect(result.events[0]).toEqual({ type: 'CounterPassed', player: defender })

  })


  it('solo decide el defensor', () => {
    const { state, attacker } = stage()

    expect(() => apply(state, { type: 'PassCounter', player: attacker })).toThrow(/decide/)

  })


  it('falla sin batalla', () => {
    const { state, defender } = stage()

    expect(() => apply({ ...state, battle: null }, { type: 'PassCounter', player: defender })).toThrow(/paso counter/)

  })

})
