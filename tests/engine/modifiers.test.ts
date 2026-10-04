import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { addModifier, clearModifiers, modifierPower } from '../../src/engine/effects/modifiers'
import { getPower } from '../../src/engine/queries'
import { card, inPlay, pass, startGame, withPlayer } from './helpers'
import type { Duration, GameState, Modifier } from '../../src/engine/types'

function modifier(duration: Duration, power = 2000, target = 'p1-t1'): Modifier {
  return { target, power, duration, sourceId: 'p1-leader' }

}


function stage(): GameState {
  const start = startGame()

  return withPlayer({ ...start, turn: 3, active: 'p1' }, 'p1', { characters: [inPlay(card('p1', 'T-C04', 1), 1)] })

}


describe('modificadores de power', () => {

  it('suman al power del Character y del Leader', () => {
    const state = addModifier(addModifier(stage(), modifier('thisTurn', 2000)), modifier('permanent', 1000, 'p1-leader'))

    expect(getPower(state, 'p1-t1')).toBe(getPower(stage(), 'p1-t1') + 2000)
    expect(getPower(state, 'p1-leader')).toBe(getPower(stage(), 'p1-leader') + 1000)

  })


  it('acepta valores negativos y acumula varios sobre la misma carta', () => {
    const state = addModifier(addModifier(stage(), modifier('thisTurn', 3000)), modifier('thisTurn', -1000))

    expect(modifierPower(state, 'p1-t1')).toBe(2000)

  })


  it('clearModifiers quita solo la duración indicada', () => {
    const state   = [modifier('thisBattle'), modifier('thisTurn'), modifier('permanent')].reduce(addModifier, stage())
    const cleared = clearModifiers(state, 'thisTurn')

    expect(cleared.modifiers.map(item => item.duration)).toEqual(['thisBattle', 'permanent'])
    expect(state.modifiers).toHaveLength(3)

  })


  it('thisBattle desaparece al terminar la batalla', () => {
    const state    = addModifier(addModifier(stage(), modifier('thisBattle', 3000)), modifier('permanent', 1000))
    const attacked = apply(state, { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'leader' }).state
    const blocked  = apply(attacked, { type: 'PassBlock', player: 'p2' }).state

    expect(modifierPower(blocked, 'p1-t1')).toBe(4000)

    const result = apply(blocked, { type: 'PassCounter', player: 'p2' }).state

    expect(result.modifiers.map(item => item.duration)).toEqual(['permanent'])

  })


  it('thisBattle cuenta en el cálculo del daño', () => {
    const weak     = withPlayer(stage(), 'p1', { characters: [inPlay(card('p1', 'T-C01', 1), 1)] })
    const boosted  = addModifier(weak, modifier('thisBattle', 5000))
    const attacked = apply(boosted, { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'leader' }).state
    const blocked  = apply(attacked, { type: 'PassBlock', player: 'p2' }).state
    const result   = apply(blocked, { type: 'PassCounter', player: 'p2' })

    expect(result.events.at(-1)).toEqual({ type: 'BattleEnded', connected: true })

  })


  it('thisTurn desaparece al terminar el turno y permanent se mantiene', () => {
    const state  = addModifier(addModifier(stage(), modifier('thisTurn', 3000)), modifier('permanent', 1000))
    const result = pass(state).state

    expect(result.modifiers.map(item => item.duration)).toEqual(['permanent'])

  })


  it('apply no muta el estado de entrada', () => {
    const state  = addModifier(stage(), modifier('thisTurn'))
    const frozen = JSON.stringify(state)

    pass(state)

    expect(JSON.stringify(state)).toBe(frozen)

  })

})
