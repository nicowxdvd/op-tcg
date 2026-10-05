import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { resolveQueue } from '../../src/engine/effects'
import { hasTrait } from '../../src/engine/effects/targets'
import { getLegalActions } from '../../src/engine/queries'
import { BLOCKER_ID, defs } from './fixtures'
import { card, inPlay, startGame, withPlayer } from './helpers'
import type { CardDef, EffectStep, GameEvent, GameState } from '../../src/engine/types'

const TRAIT_ID = 'T-TR1'
const traitDef: CardDef = { id: TRAIT_ID, name: 'Con tipos', type: 'Character', cost: 2, power: 3000, counter: 1000, life: 0, colors: ['Red'], keywords: [], traits: 'Straw Hat Crew Supernovas' }

function stage(): GameState {
  const start = startGame()
  const mine  = withPlayer({ ...start, turn: 3, active: 'p1', defs: { ...defs, [TRAIT_ID]: traitDef } }, 'p1', { characters: [inPlay(card('p1', 'T-C04', 1), 1, 0)], donActive: 2, donRested: 3 })

  return withPlayer(mine, 'p2', { characters: [{ ...inPlay(card('p2', 'T-C02', 2), 1), rested: true }, inPlay(card('p2', BLOCKER_ID, 3))], donActive: 4, donRested: 0 })

}


function run(state: GameState, ...steps: EffectStep[]): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = []

  return { state: resolveQueue({ ...state, effectQueue: [{ source: 'p1-t1', owner: 'p1', steps }] }, events), events }

}


describe('hasTrait', () => {

  it('encuentra un tipo, también de varias palabras, y no uno parcial', () => {
    expect(hasTrait(traitDef, 'Supernovas')).toBe(true)
    expect(hasTrait(traitDef, 'Straw Hat Crew')).toBe(true)
    expect(hasTrait(traitDef, 'Straw')).toBe(true)
    expect(hasTrait(traitDef, 'Nova')).toBe(false)
    expect(hasTrait(defs['T-C01'], 'Supernovas')).toBe(false)

  })

})



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



describe('primitiva search con trait', () => {

  it('solo ofrece cartas del tope que tienen el tipo', () => {
    const start = stage()
    const deck  = [card('p1', 'T-C01', 90), card('p1', TRAIT_ID, 91), card('p1', 'T-C02', 92)]
    const state = withPlayer(start, 'p1', { deck })
    const run1  = run(state, { op: 'search', player: 'p1', amount: 3, trait: 'Supernovas' })

    expect(run1.state.pending?.options).toEqual(['p1-t91'])

  })


  it('sin cartas con el tipo, deja todas al fondo sin pedir decisión', () => {
    const state = withPlayer(stage(), 'p1', { deck: [card('p1', 'T-C01', 90), card('p1', 'T-C02', 92), card('p1', 'T-C03', 93)] })
    const next  = run(state, { op: 'search', player: 'p1', amount: 2, trait: 'Supernovas' })

    expect(next.state.pending).toBeNull()
    expect(next.state.players.p1.deck.map(item => item.instanceId)).toEqual(['p1-t93', 'p1-t90', 'p1-t92'])

  })


  it('rechaza un pick que no tiene el tipo', () => {
    const state = withPlayer(stage(), 'p1', { deck: [card('p1', 'T-C01', 90), card('p1', TRAIT_ID, 91)] })

    expect(() => run(state, { op: 'search', player: 'p1', amount: 2, trait: 'Supernovas', pick: 'p1-t90' })).toThrow(/filtro/)

  })

})



describe('primitiva blockerLock', () => {

  function battle(steps: EffectStep[], attackTarget = 'leader'): GameState {
    const locked = run(stage(), ...steps).state

    return apply(locked, { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: attackTarget }).state

  }

  it('impide declarar cualquier Blocker durante la batalla', () => {
    const state = battle([{ op: 'blockerLock', duration: 'thisBattle' }])

    expect(() => apply(state, { type: 'DeclareBlock', player: 'p2', blockerId: 'p2-t3' })).toThrow(/no puede bloquear/)
    expect(getLegalActions(state, 'p2').some(action => action.type === 'DeclareBlock')).toBe(false)

  })


  it('con minPower solo bloquea el que tiene menos power', () => {
    const state = battle([{ op: 'blockerLock', minPower: 3000, duration: 'thisBattle' }])
    const low   = battle([{ op: 'blockerLock', minPower: 4000, duration: 'thisBattle' }])

    expect(getLegalActions(state, 'p2').some(action => action.type === 'DeclareBlock')).toBe(false)
    expect(getLegalActions(low, 'p2').some(action => action.type === 'DeclareBlock')).toBe(true)

  })


  it('con attacker solo afecta a ese atacante durante el turno', () => {
    const other = battle([{ op: 'blockerLock', attacker: 'p1-t99', duration: 'thisTurn' }])
    const mine  = battle([{ op: 'blockerLock', attacker: 'p1-t1', duration: 'thisTurn' }])

    expect(getLegalActions(other, 'p2').some(action => action.type === 'DeclareBlock')).toBe(true)
    expect(getLegalActions(mine, 'p2').some(action => action.type === 'DeclareBlock')).toBe(false)

  })


  it('thisBattle se limpia al terminar la batalla; thisTurn no', () => {
    const state   = battle([{ op: 'blockerLock', duration: 'thisBattle' }, { op: 'blockerLock', attacker: 'p1-t1', duration: 'thisTurn' }])
    const passed  = apply(state, { type: 'PassBlock', player: 'p2' }).state
    const ended   = apply(passed, { type: 'PassCounter', player: 'p2' }).state

    expect(ended.restrictions).toHaveLength(1)
    expect(ended.restrictions[0].duration).toBe('thisTurn')

  })

})
