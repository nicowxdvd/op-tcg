import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { COUNTER_1K_ID, COUNTER_2K_ID } from './fixtures'
import { card, inPlay, startGame, withPlayer } from './helpers'
import type { GameState, PlayerId } from '../../src/engine/types'

interface Stage { state: GameState; attacker: PlayerId; defender: PlayerId }

function stage(attackerPatch = {}, defenderPatch = {}): Stage {
  const start    = startGame()
  const attacker = 'p1' as const
  const defender = 'p2' as const
  const mine     = withPlayer({ ...start, turn: 3, active: attacker }, attacker, { characters: [inPlay(card(attacker, 'T-C04', 1), 1, 1)], ...attackerPatch })
  const state    = withPlayer(mine, defender, { characters: [{ ...inPlay(card(defender, 'T-C02', 2), 1, 2), rested: true }], hand: [card(defender, COUNTER_1K_ID, 3), card(defender, COUNTER_2K_ID, 4)], ...defenderPatch })

  return { state, attacker, defender }

}


function fight(stageState: Stage, attacker: string, target: string, counters: string[] = []): ReturnType<typeof apply> {
  const { state, attacker: id, defender } = stageState
  const attacked                          = apply(state, { type: 'Attack', player: id, attacker, target }).state
  const blocked                           = apply(attacked, { type: 'PassBlock', player: defender }).state
  const countered                         = counters.reduce((acc, instanceId) => apply(acc, { type: 'UseCounter', player: defender, instanceId }).state, blocked)

  return apply(countered, { type: 'PassCounter', player: defender })

}


describe('daño al Leader', () => {

  it('un empate conecta y la carta del tope de Life va a la mano', () => {
    const s      = stage()
    const life   = s.state.players[s.defender].life
    const result = fight(s, 'leader', 'leader')
    const player = result.state.players[s.defender]

    expect(player.life).toEqual(life.slice(1))
    expect(player.hand.at(-1)).toEqual(life[0])
    expect(player.hand).toHaveLength(3)
    expect(result.state.battle).toBeNull()
    expect(result.events).toEqual([{ type: 'CounterPassed', player: s.defender }, { type: 'LifeTaken', player: s.defender, instanceId: life[0].instanceId }, { type: 'BattleEnded', connected: true }])

  })


  it('un atacante con más power conecta', () => {
    const s      = stage({ leaderAttachedDon: 2 })
    const result = fight(s, 'leader', 'leader')

    expect(result.state.players[s.defender].life).toHaveLength(4)

  })


  it('un atacante con menos power no hace daño', () => {
    const s      = stage({ characters: [inPlay(card('p1', 'T-C01', 1), 1, 0)] })
    const result = fight(s, `${s.attacker}-t1`, 'leader')

    expect(result.state.players[s.defender].life).toHaveLength(5)
    expect(result.state.battle).toBeNull()
    expect(result.events.at(-1)).toEqual({ type: 'BattleEnded', connected: false })

  })


  it('un Counter que supera el power del atacante evita el daño', () => {
    const s      = stage()
    const result = fight(s, 'leader', 'leader', [`${s.defender}-t3`])

    expect(result.state.players[s.defender].life).toHaveLength(5)
    expect(result.state.players[s.defender].trash).toHaveLength(1)

  })

})


describe('daño a un Character', () => {

  it('un K.O. manda el Character al trash y devuelve su DON!! a donRested', () => {
    const s      = stage()
    const before = s.state.players[s.defender].donRested
    const result = fight(s, 'leader', `${s.defender}-t2`)
    const player = result.state.players[s.defender]

    expect(player.characters).toEqual([])
    expect(player.trash.map(c => c.instanceId)).toEqual([`${s.defender}-t2`])
    expect(player.donRested).toBe(before + 2)
    expect(result.events).toEqual([{ type: 'CounterPassed', player: s.defender }, { type: 'CharacterKOd', player: s.defender, instanceId: `${s.defender}-t2` }, { type: 'BattleEnded', connected: true }])

  })


  it('el Character defendido no recibe bono de DON!! en el turno rival', () => {
    const s      = stage({ characters: [inPlay(card('p1', 'T-C02', 1), 1, 0)] }, { characters: [{ ...inPlay(card('p2', 'T-C02', 2), 1, 5), rested: true }] })
    const result = fight(s, `${s.attacker}-t1`, `${s.defender}-t2`)

    expect(result.state.players[s.defender].characters).toEqual([])

  })


  it('un Counter evita el K.O.', () => {
    const s      = stage({ characters: [inPlay(card('p1', 'T-C02', 1), 1, 0)] })
    const result = fight(s, `${s.attacker}-t1`, `${s.defender}-t2`, [`${s.defender}-t3`])

    expect(result.state.players[s.defender].characters).toHaveLength(1)

  })


  it('el Character atacante cuenta su bono de DON!! adjunto', () => {
    const s      = stage({ characters: [inPlay(card('p1', 'T-C01', 1), 1, 1)] })
    const result = fight(s, `${s.attacker}-t1`, `${s.defender}-t2`)

    expect(result.state.players[s.defender].characters).toEqual([])

  })

})


describe('inmutabilidad', () => {

  it('resolver el daño no muta el estado de entrada', () => {
    const s        = stage()
    const attacked = apply(s.state, { type: 'Attack', player: s.attacker, attacker: 'leader', target: `${s.defender}-t2` }).state
    const passed   = apply(attacked, { type: 'PassBlock', player: s.defender }).state
    const snapshot = JSON.stringify(passed)

    apply(passed, { type: 'PassCounter', player: s.defender })

    expect(JSON.stringify(passed)).toBe(snapshot)

  })

})


describe('objetivo ausente', () => {

  it('termina la batalla sin daño', () => {
    const s        = stage()
    const attacked = apply(s.state, { type: 'Attack', player: s.attacker, attacker: 'leader', target: `${s.defender}-t2` }).state
    const passed   = apply(attacked, { type: 'PassBlock', player: s.defender }).state
    const gone     = withPlayer(passed, s.defender, { characters: [] })
    const result   = apply(gone, { type: 'PassCounter', player: s.defender })

    expect(result.state.battle).toBeNull()
    expect(result.events.at(-1)).toEqual({ type: 'BattleEnded', connected: false })

  })

})
