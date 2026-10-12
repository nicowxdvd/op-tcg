import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { getLegalActions } from '../../src/engine/queries'
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


describe('Attack con onlyTarget', () => {

  function forcedStage(): { state: GameState; id: PlayerId; rival: PlayerId } {
    const { state, id, rival } = stage()
    const effects              = { 'T-C03': [{ timing: 'passive' as const, aura: { onlyTarget: true }, condition: () => true, run: () => [] }] }

    return { state: { ...state, effects }, id, rival }

  }

  it('obliga a atacar a la carta con el aura y lo quita de las acciones legales', () => {
    const { state, id, rival } = forcedStage()
    const attacks              = getLegalActions(state, id).filter(action => action.type === 'Attack')

    expect(attacks.every(action => action.target === `${rival}-t2`)).toBe(true)
    expect(attacks.length).toBeGreaterThan(0)
    expect(() => apply(state, { type: 'Attack', player: id, attacker: 'leader', target: 'leader' })).toThrow(/solo puede ser atacado/)
    expect(apply(state, { type: 'Attack', player: id, attacker: 'leader', target: `${rival}-t2` }).state.battle?.target).toBe(`${rival}-t2`)

  })


  it('no obliga si la condición del aura no se cumple', () => {
    const { state, id } = forcedStage()
    const free          = { ...state, effects: { 'T-C03': [{ timing: 'passive' as const, aura: { onlyTarget: true }, condition: () => false, run: () => [] }] } }

    expect(apply(free, { type: 'Attack', player: id, attacker: 'leader', target: 'leader' }).state.battle?.target).toBe('leader')

  })

})


describe('Attack con RushCharacter', () => {

  function fresh(): { state: GameState; id: PlayerId; rival: PlayerId } {
    const { state, id, rival } = stage()
    const mine                 = withPlayer(state, id, { characters: [inPlay(card(id, 'T-C02', 1), 3)] })
    const defs                 = { ...mine.defs, 'T-C02': { ...mine.defs['T-C02'], keywords: ['RushCharacter' as const] } }

    return { state: { ...mine, defs }, id, rival }

  }

  it('ataca a un Character rival descansado el turno en que entra, pero no al Leader', () => {
    const { state, id, rival } = fresh()
    const attacks              = getLegalActions(state, id).filter(action => action.type === 'Attack' && action.attacker === `${id}-t1`)

    expect(attacks.map(action => action.type === 'Attack' && action.target)).toEqual([`${rival}-t2`])
    expect(apply(state, { type: 'Attack', player: id, attacker: `${id}-t1`, target: `${rival}-t2` }).state.battle?.target).toBe(`${rival}-t2`)
    expect(() => apply(state, { type: 'Attack', player: id, attacker: `${id}-t1`, target: 'leader' })).toThrow(/entró este turno/)

  })


  it('en turnos siguientes ataca también al Leader', () => {
    const { state, id } = fresh()
    const later         = withPlayer(state, id, { characters: [inPlay(card(id, 'T-C02', 1), 1)] })

    expect(apply(later, { type: 'Attack', player: id, attacker: `${id}-t1`, target: 'leader' }).state.battle?.target).toBe('leader')

  })

})
