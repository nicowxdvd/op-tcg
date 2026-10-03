import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { BLOCKER_ID } from './fixtures'
import { card, inPlay, other, startGame, withPlayer } from './helpers'
import type { GameState, PlayerId } from '../../src/engine/types'

function stage(): { state: GameState; attacker: PlayerId; defender: PlayerId } {
  const start    = startGame()
  const attacker = start.first
  const defender = other(attacker)
  const base     = { ...start, turn: 3, active: attacker }
  const mine     = withPlayer(base, defender, { characters: [inPlay(card(defender, BLOCKER_ID, 1)), inPlay(card(defender, 'T-C02', 2)), { ...inPlay(card(defender, BLOCKER_ID, 3)), rested: true }] })
  const state    = apply(mine, { type: 'Attack', player: attacker, attacker: 'leader', target: 'leader' }).state

  return { state, attacker, defender }

}


describe('DeclareBlock', () => {

  it('descansa al blocker, redirige el objetivo y pasa a counter', () => {
    const { state, defender } = stage()
    const result              = apply(state, { type: 'DeclareBlock', player: defender, blockerId: `${defender}-t1` })

    expect(result.state.players[defender].characters[0].rested).toBe(true)
    expect(result.state.battle).toMatchObject({ target: `${defender}-t1`, step: 'counter' })
    expect(result.events).toEqual([{ type: 'BlockDeclared', player: defender, blockerId: `${defender}-t1` }])

  })


  it('falla con un Character sin Blocker', () => {
    const { state, defender } = stage()

    expect(() => apply(state, { type: 'DeclareBlock', player: defender, blockerId: `${defender}-t2` })).toThrow(/no tiene Blocker/)

  })


  it('falla con un blocker descansado', () => {
    const { state, defender } = stage()

    expect(() => apply(state, { type: 'DeclareBlock', player: defender, blockerId: `${defender}-t3` })).toThrow(/descansado/)

  })


  it('falla con un Character que no está en juego', () => {
    const { state, defender } = stage()

    expect(() => apply(state, { type: 'DeclareBlock', player: defender, blockerId: 'p9-x' })).toThrow(/no está en juego/)

  })


  it('solo decide el defensor', () => {
    const { state, attacker, defender } = stage()

    expect(() => apply(state, { type: 'DeclareBlock', player: attacker, blockerId: `${defender}-t1` })).toThrow(/decide/)

  })


  it('falla sin batalla o fuera del paso block', () => {
    const { state, defender } = stage()
    const idle                = { ...state, battle: null }
    const counter             = apply(state, { type: 'PassBlock', player: defender }).state

    expect(() => apply(idle, { type: 'DeclareBlock', player: defender, blockerId: `${defender}-t1` })).toThrow(/paso block/)
    expect(() => apply(counter, { type: 'DeclareBlock', player: defender, blockerId: `${defender}-t1` })).toThrow(/paso block/)

  })


  it('no muta el estado de entrada', () => {
    const { state, defender } = stage()
    const snapshot            = JSON.stringify(state)

    apply(state, { type: 'DeclareBlock', player: defender, blockerId: `${defender}-t1` })

    expect(JSON.stringify(state)).toBe(snapshot)

  })

})


describe('PassBlock', () => {

  it('deja el objetivo y pasa a counter', () => {
    const { state, defender } = stage()
    const result              = apply(state, { type: 'PassBlock', player: defender })

    expect(result.state.battle).toMatchObject({ target: 'leader', step: 'counter' })
    expect(result.events).toEqual([{ type: 'BlockPassed', player: defender }])

  })


  it('solo decide el defensor', () => {
    const { state, attacker } = stage()

    expect(() => apply(state, { type: 'PassBlock', player: attacker })).toThrow(/decide/)

  })


  it('falla sin batalla', () => {
    const { state, defender } = stage()

    expect(() => apply({ ...state, battle: null }, { type: 'PassBlock', player: defender })).toThrow(/paso block/)

  })

})
