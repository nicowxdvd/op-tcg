import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { getLegalActions } from '../../src/engine/queries'
import { STAGE_2_ID, STAGE_ID } from './fixtures'
import { card, startGame, withPlayer } from './helpers'
import type { Action, EffectRegistry, GameState } from '../../src/engine/types'

const play: Action = { type: 'PlayStage', player: 'p1', instanceId: 'p1-t1' }

function stage(effects: EffectRegistry = {}, donActive = 3): GameState {
  const start = startGame()

  return withPlayer({ ...start, turn: 3, active: 'p1', effects }, 'p1', { hand: [card('p1', STAGE_ID, 1), card('p1', STAGE_2_ID, 2), card('p1', 'T-C01', 3)], donActive })

}


describe('PlayStage', () => {

  it('paga el cost y deja la Stage en su zona', () => {
    const state  = stage()
    const result = apply(state, play)
    const mine   = result.state.players.p1

    expect(mine.stage?.instanceId).toBe('p1-t1')
    expect(mine.hand.map(item => item.instanceId)).toEqual(['p1-t2', 'p1-t3'])
    expect(mine.donActive).toBe(1)
    expect(mine.donRested).toBe(state.players.p1.donRested + 2)
    expect(result.events).toEqual([{ type: 'StagePlayed', player: 'p1', instanceId: 'p1-t1' }])

  })


  it('jugar una segunda Stage manda la primera al trash', () => {
    const first  = apply(stage(), play).state
    const result = apply(first, { ...play, instanceId: 'p1-t2' })
    const mine   = result.state.players.p1

    expect(mine.stage?.instanceId).toBe('p1-t2')
    expect(mine.trash.map(item => item.instanceId)).toEqual(['p1-t1'])
    expect(result.events).toEqual([{ type: 'StageTrashed', player: 'p1', instanceId: 'p1-t1' }, { type: 'StagePlayed', player: 'p1', instanceId: 'p1-t2' }])

  })


  it('dispara el [On Play] de la Stage', () => {
    const effects = { [STAGE_ID]: [{ timing: 'onPlay', run: ctx => [{ op: 'draw', player: ctx.owner, amount: 1 }] }] } as EffectRegistry
    const result  = apply(stage(effects), play)

    expect(result.events.map(event => event.type)).toEqual(['StagePlayed', 'EffectTriggered', 'CardDrawn'])
    expect(result.state.players.p1.hand).toHaveLength(3)

  })


  it('solo se juega en el Main del jugador activo y sin batalla', () => {
    const state = stage()

    expect(() => apply(state, { ...play, player: 'p2' })).toThrow(/No es el turno de p2/)
    expect(() => apply({ ...state, phase: 'end' }, play)).toThrow(/fase main/)
    expect(() => apply({ ...state, battle: { attacker: 'leader', target: 'leader', attackerPlayer: 'p2', step: 'block', counterPower: 0 } }, play)).toThrow(/batalla/)

  })


  it('falla con DON!! insuficiente, carta ausente o carta que no es Stage', () => {
    expect(() => apply(stage({}, 1), play)).toThrow(/DON!! insuficiente/)
    expect(() => apply(stage(), { ...play, instanceId: 'p1-t99' })).toThrow(/no está en la mano/)
    expect(() => apply(stage(), { ...play, instanceId: 'p1-t3' })).toThrow(/no es un Stage/)

  })


  it('conserva el total de cartas y de DON!!', () => {
    const state  = stage()
    const first  = apply(state, play).state
    const result = apply(first, { ...play, instanceId: 'p1-t2' }).state
    const mine   = result.players.p1
    const before = state.players.p1

    expect(mine.deck.length + mine.hand.length + mine.trash.length + 1).toBe(before.deck.length + before.hand.length + before.trash.length)
    expect(mine.donActive + mine.donRested).toBe(before.donActive + before.donRested)

  })


  it('apply no muta el estado de entrada', () => {
    const state  = stage()
    const frozen = JSON.stringify(state)

    apply(state, play)

    expect(JSON.stringify(state)).toBe(frozen)

  })

})


describe('getLegalActions con Stages', () => {

  it('ofrece PlayStage solo con DON!! suficiente', () => {
    expect(getLegalActions(stage(), 'p1')).toContainEqual(play)
    expect(getLegalActions(stage({}, 1), 'p1')).not.toContainEqual(play)
    expect(getLegalActions(stage({}, 1), 'p1')).toContainEqual({ ...play, instanceId: 'p1-t2' })

  })


  it('toda acción PlayStage ofrecida es aceptada por apply', () => {
    const state = stage()

    for (const action of getLegalActions(state, 'p1').filter(candidate => candidate.type === 'PlayStage'))
      expect(() => apply(state, action)).not.toThrow()

  })

})
