import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { getLegalActions } from '../../src/engine/queries'
import { EVENT_ID } from './fixtures'
import { card, startGame, withPlayer } from './helpers'
import type { Action, EffectRegistry, GameState } from '../../src/engine/types'

const play: Action = { type: 'PlayEvent', player: 'p1', instanceId: 'p1-t1' }

const mainEffect: EffectRegistry = { [EVENT_ID]: [{ timing: 'main', run: ctx => [{ op: 'draw', player: ctx.owner, amount: 2 }] }] }

function stage(effects: EffectRegistry = mainEffect, donActive = 3): GameState {
  const start = startGame()

  return withPlayer({ ...start, turn: 3, active: 'p1', effects }, 'p1', { hand: [card('p1', EVENT_ID, 1), card('p1', 'T-C01', 2)], donActive })

}


describe('PlayEvent', () => {

  it('paga el cost, resuelve el efecto [Main] y manda el Event al trash', () => {
    const state  = stage()
    const result = apply(state, play)
    const mine   = result.state.players.p1

    expect(mine.trash.map(item => item.instanceId)).toEqual(['p1-t1'])
    expect(mine.hand.map(item => item.instanceId).slice(0, 1)).toEqual(['p1-t2'])
    expect(mine.hand).toHaveLength(3)
    expect(mine.donActive).toBe(2)
    expect(mine.donRested).toBe(state.players.p1.donRested + 1)
    expect(result.events.map(event => event.type)).toEqual(['EventPlayed', 'EffectTriggered', 'CardDrawn', 'CardDrawn'])

  })


  it('solo se juega en el Main del jugador activo y sin batalla', () => {
    const state = stage()

    expect(() => apply(state, { ...play, player: 'p2' })).toThrow(/No es el turno de p2/)
    expect(() => apply({ ...state, phase: 'end' }, play)).toThrow(/fase main/)
    expect(() => apply({ ...state, battle: { attacker: 'leader', target: 'leader', attackerPlayer: 'p2', step: 'block', counterPower: 0 } }, play)).toThrow(/batalla/)

  })


  it('falla con DON!! insuficiente', () => {
    expect(() => apply(stage(mainEffect, 0), play)).toThrow(/DON!! insuficiente/)

  })


  it('falla con una carta que no está en la mano o que no es Event', () => {
    expect(() => apply(stage(), { ...play, instanceId: 'p1-t99' })).toThrow(/no está en la mano/)
    expect(() => apply(stage(), { ...play, instanceId: 'p1-t2' })).toThrow(/no es un Event/)

  })


  it('falla si el Event no tiene efecto [Main]', () => {
    expect(() => apply(stage({}), play)).toThrow(/no tiene efecto \[Main\]/)
    expect(() => apply(stage({ [EVENT_ID]: [{ timing: 'counter', run: () => [] }] }), play)).toThrow(/no tiene efecto \[Main\]/)

  })


  it('un Event con elección deja pending y ya está en el trash', () => {
    const effects = { [EVENT_ID]: [{ timing: 'main', run: () => [{ op: 'choose', chooser: 'p1', kind: 'option', options: ['a', 'b'], optional: false, then: [{ op: 'draw', player: 'p1', amount: 1 }] }] }] } as EffectRegistry
    const waiting = apply(stage(effects), play).state

    expect(waiting.pending?.player).toBe('p1')
    expect(waiting.players.p1.trash).toHaveLength(1)
    expect(apply(waiting, { type: 'Choose', player: 'p1', option: 'a' }).state.players.p1.hand).toHaveLength(2)

  })


  it('conserva el total de cartas y de DON!!', () => {
    const state  = stage()
    const result = apply(state, play).state
    const mine   = result.players.p1
    const before = state.players.p1

    expect(mine.deck.length + mine.hand.length + mine.trash.length).toBe(before.deck.length + before.hand.length + before.trash.length)
    expect(mine.donActive + mine.donRested).toBe(before.donActive + before.donRested)

  })


  it('apply no muta el estado de entrada', () => {
    const state  = stage()
    const frozen = JSON.stringify(state)

    apply(state, play)

    expect(JSON.stringify(state)).toBe(frozen)

  })

})


describe('getLegalActions con Events', () => {

  it('ofrece PlayEvent solo si tiene efecto [Main] y alcanza el DON!!', () => {
    expect(getLegalActions(stage(), 'p1')).toContainEqual(play)
    expect(getLegalActions(stage({}), 'p1')).not.toContainEqual(play)
    expect(getLegalActions(stage(mainEffect, 0), 'p1')).not.toContainEqual(play)

  })


  it('toda acción PlayEvent ofrecida es aceptada por apply', () => {
    const state = stage()

    for (const action of getLegalActions(state, 'p1').filter(candidate => candidate.type === 'PlayEvent'))
      expect(() => apply(state, action)).not.toThrow()

  })

})
