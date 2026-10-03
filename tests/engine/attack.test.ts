import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { card, inPlay, other, startGame, withPlayer } from './helpers'
import type { GameState, PlayerId } from '../../src/engine/types'

function stage(turn = 3): { state: GameState; id: PlayerId; rival: PlayerId } {
  const start = startGame()
  const id    = turn % 2 ? start.first : other(start.first)
  const rival = other(id)
  const mine  = withPlayer({ ...start, turn, active: id }, id, { characters: [inPlay(card(id, 'T-C02', 1), 1)] })
  const state = withPlayer(mine, rival, { characters: [{ ...inPlay(card(rival, 'T-C03', 2), 1), rested: true }, inPlay(card(rival, 'T-C04', 3), 1)] })

  return { state, id, rival }

}


describe('Attack', () => {

  it('falla en turn <= 2', () => {
    for (const turn of [1, 2]) {
      const { state, id } = stage(turn)

      expect(() => apply(state, { type: 'Attack', player: id, attacker: 'leader', target: 'leader' })).toThrow(/primer turno/)
    }

  })


  it('falla fuera del turno del jugador', () => {
    const { state, rival } = stage()

    expect(() => apply(state, { type: 'Attack', player: rival, attacker: 'leader', target: 'leader' })).toThrow(/No es el turno/)

  })


  it('falla con una batalla en curso', () => {
    const { state, id } = stage()
    const battle        = apply(state, { type: 'Attack', player: id, attacker: 'leader', target: 'leader' }).state

    expect(() => apply(battle, { type: 'Attack', player: id, attacker: `${id}-t1`, target: 'leader' })).toThrow(/batalla en curso/)

  })


  it('falla con el Leader descansado', () => {
    const { state, id } = stage()
    const tired         = withPlayer(state, id, { leaderRested: true })

    expect(() => apply(tired, { type: 'Attack', player: id, attacker: 'leader', target: 'leader' })).toThrow(/descansado/)

  })


  it('falla con un Character descansado', () => {
    const { state, id } = stage()
    const tired         = withPlayer(state, id, { characters: [{ ...inPlay(card(id, 'T-C02', 1), 1), rested: true }] })

    expect(() => apply(tired, { type: 'Attack', player: id, attacker: `${id}-t1`, target: 'leader' })).toThrow(/descansado/)

  })


  it('falla con un Character jugado ese mismo turno', () => {
    const { state, id } = stage()
    const fresh         = withPlayer(state, id, { characters: [inPlay(card(id, 'T-C02', 1), 3)] })

    expect(() => apply(fresh, { type: 'Attack', player: id, attacker: `${id}-t1`, target: 'leader' })).toThrow(/entró este turno/)

  })


  it('el Leader ataca aunque haya entrado un Character este turno', () => {
    const { state, id } = stage()
    const fresh         = withPlayer(state, id, { characters: [inPlay(card(id, 'T-C02', 1), 3)] })

    expect(apply(fresh, { type: 'Attack', player: id, attacker: 'leader', target: 'leader' }).state.battle).not.toBeNull()

  })


  it('falla con un atacante que no está en juego', () => {
    const { state, id } = stage()

    expect(() => apply(state, { type: 'Attack', player: id, attacker: 'p9-x', target: 'leader' })).toThrow(/no está en juego/)

  })


  it('falla contra un Character rival activo', () => {
    const { state, id, rival } = stage()

    expect(() => apply(state, { type: 'Attack', player: id, attacker: 'leader', target: `${rival}-t3` })).toThrow(/descansado/)

  })


  it('falla contra un Character que no está en juego del rival', () => {
    const { state, id } = stage()

    expect(() => apply(state, { type: 'Attack', player: id, attacker: 'leader', target: `${id}-t1` })).toThrow(/no está en juego del rival/)

  })


  it('permite atacar a un Character rival descansado', () => {
    const { state, id, rival } = stage()
    const result               = apply(state, { type: 'Attack', player: id, attacker: `${id}-t1`, target: `${rival}-t2` })

    expect(result.state.battle).toEqual({ attacker: `${id}-t1`, target: `${rival}-t2`, attackerPlayer: id, step: 'block', counterPower: 0 })

  })


  it('descansa al Leader atacante y abre la batalla en paso block', () => {
    const { state, id } = stage()
    const result        = apply(state, { type: 'Attack', player: id, attacker: 'leader', target: 'leader' })

    expect(result.state.players[id].leaderRested).toBe(true)
    expect(result.state.battle).toEqual({ attacker: 'leader', target: 'leader', attackerPlayer: id, step: 'block', counterPower: 0 })
    expect(result.events).toEqual([{ type: 'AttackDeclared', player: id, attacker: 'leader', target: 'leader' }])

  })


  it('descansa al Character atacante', () => {
    const { state, id } = stage()
    const result        = apply(state, { type: 'Attack', player: id, attacker: `${id}-t1`, target: 'leader' })

    expect(result.state.players[id].characters[0].rested).toBe(true)
    expect(result.state.battle?.step).toBe('block')

  })


  it('no muta el estado de entrada', () => {
    const { state, id } = stage()
    const snapshot      = JSON.stringify(state)

    apply(state, { type: 'Attack', player: id, attacker: 'leader', target: 'leader' })

    expect(JSON.stringify(state)).toBe(snapshot)

  })

})
