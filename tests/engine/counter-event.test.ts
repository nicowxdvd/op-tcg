import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { getLegalActions } from '../../src/engine/queries'
import { COUNTER_EVENT_ID } from './fixtures'
import { card, inPlay, startGame, withPlayer } from './helpers'
import type { Action, EffectRegistry, GameState } from '../../src/engine/types'

const use: Action = { type: 'UseCounterEvent', player: 'p2', instanceId: 'p2-t1' }

const counterEffect: EffectRegistry = { [COUNTER_EVENT_ID]: [{ timing: 'counter', run: ctx => [{ op: 'draw', player: ctx.owner, amount: 1 }] }] }

function stage(effects: EffectRegistry = counterEffect, donActive = 3): GameState {
  const start = startGame()
  const mine  = withPlayer({ ...start, turn: 3, active: 'p1', effects }, 'p1', { characters: [inPlay(card('p1', 'T-C04', 5), 1, 1)] })
  const rival = withPlayer(mine, 'p2', { hand: [card('p2', COUNTER_EVENT_ID, 1), card('p2', 'T-C01', 2)], donActive })
  const hit   = apply(rival, { type: 'Attack', player: 'p1', attacker: 'p1-t5', target: 'leader' }).state

  return apply(hit, { type: 'PassBlock', player: 'p2' }).state

}


describe('Event [Counter]', () => {

  it('paga el cost, suma su valor al counterPower, resuelve el efecto y va al trash', () => {
    const state  = stage()
    const result = apply(state, use)
    const rival  = result.state.players.p2

    expect(result.state.battle?.counterPower).toBe(2000)
    expect(result.state.battle?.step).toBe('counter')
    expect(rival.trash.map(item => item.instanceId)).toEqual(['p2-t1'])
    expect(rival.donActive).toBe(2)
    expect(rival.donRested).toBe(state.players.p2.donRested + 1)
    expect(rival.hand).toHaveLength(2)
    expect(result.events).toEqual([{ type: 'CounterUsed', player: 'p2', instanceId: 'p2-t1', counterPower: 2000 }, { type: 'EffectTriggered', player: 'p2', source: 'p2-t1', timing: 'counter' }, { type: 'CardDrawn', player: 'p2', instanceId: state.players.p2.deck[0].instanceId }])

  })


  it('el valor suma con un Counter de Character y puede evitar el daño', () => {
    const state  = stage()
    const first  = apply(state, use).state
    const second = apply(first, { type: 'UseCounter', player: 'p2', instanceId: 'p2-t2' })
    const result = apply(second.state, { type: 'PassCounter', player: 'p2' })

    expect(second.state.battle?.counterPower).toBe(4000)
    expect(result.state.players.p2.life).toHaveLength(state.players.p2.life.length)
    expect(result.events.at(-1)).toEqual({ type: 'BattleEnded', connected: false })

  })


  it('solo lo juega el defensor y solo en el Counter step', () => {
    const state = stage()

    expect(() => apply(state, { ...use, player: 'p1' })).toThrow(/decide p2, no p1/)
    expect(() => apply({ ...state, battle: { ...state.battle!, step: 'block' } }, use)).toThrow(/paso counter/)
    expect(() => apply({ ...state, battle: null }, use)).toThrow(/paso counter/)

  })


  it('falla con DON!! insuficiente, carta ausente o carta que no es Event', () => {
    expect(() => apply(stage(counterEffect, 0), use)).toThrow(/DON!! insuficiente/)
    expect(() => apply(stage(), { ...use, instanceId: 'p2-t99' })).toThrow(/no está en la mano/)
    expect(() => apply(stage(), { ...use, instanceId: 'p2-t2' })).toThrow(/no es un Event/)

  })


  it('falla si el Event no tiene efecto [Counter]', () => {
    expect(() => apply(stage({}), use)).toThrow(/no tiene efecto \[Counter\]/)
    expect(() => apply(stage({ [COUNTER_EVENT_ID]: [{ timing: 'main', run: () => [] }] }), use)).toThrow(/no tiene efecto \[Counter\]/)

  })


  it('un efecto [Counter] con power thisBattle sube el power del Leader defensor', () => {
    const effects = { [COUNTER_EVENT_ID]: [{ timing: 'counter', run: () => [{ op: 'power', target: 'p2-leader', amount: 4000, duration: 'thisBattle' }] }] } as EffectRegistry
    const result  = apply(apply(stage(effects), use).state, { type: 'PassCounter', player: 'p2' })

    expect(result.events.at(-1)).toEqual({ type: 'BattleEnded', connected: false })
    expect(result.state.modifiers).toEqual([])

  })


  it('un efecto con elección deja pending y la batalla espera', () => {
    const effects = { [COUNTER_EVENT_ID]: [{ timing: 'counter', run: () => [{ op: 'choose', chooser: 'p2', kind: 'option', options: ['a'], optional: false, then: [{ op: 'draw', player: 'p2', amount: 1 }] }] }] } as EffectRegistry
    const waiting = apply(stage(effects), use).state

    expect(waiting.pending?.player).toBe('p2')
    expect(() => apply(waiting, { type: 'PassCounter', player: 'p2' })).toThrow(/decisión pendiente/)
    expect(apply(waiting, { type: 'Choose', player: 'p2', option: 'a' }).state.battle?.step).toBe('counter')

  })


  it('apply no muta el estado de entrada', () => {
    const state  = stage()
    const frozen = JSON.stringify(state)

    apply(state, use)

    expect(JSON.stringify(state)).toBe(frozen)

  })

})


describe('getLegalActions con Events [Counter]', () => {

  it('ofrece UseCounterEvent al defensor solo con efecto [Counter] y DON!! suficiente', () => {
    expect(getLegalActions(stage(), 'p2')).toContainEqual(use)
    expect(getLegalActions(stage({}), 'p2')).not.toContainEqual(use)
    expect(getLegalActions(stage(counterEffect, 0), 'p2')).not.toContainEqual(use)
    expect(getLegalActions(stage(), 'p1')).toEqual([])

  })


  it('toda acción UseCounterEvent ofrecida es aceptada por apply', () => {
    const state = stage()

    for (const action of getLegalActions(state, 'p2').filter(candidate => candidate.type === 'UseCounterEvent'))
      expect(() => apply(state, action)).not.toThrow()

  })

})
