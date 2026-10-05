import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { resolveQueue } from '../../src/engine/effects'
import { hasKeyword, passivePower } from '../../src/engine/effects/passive'
import { hasTrait } from '../../src/engine/effects/targets'
import { getLegalActions, getPower } from '../../src/engine/queries'
import { BLOCKER_ID, defs } from './fixtures'
import { card, inPlay, startGame, withPlayer } from './helpers'
import type { CardDef, EffectDef, EffectRegistry, EffectStep, GameEvent, GameState } from '../../src/engine/types'

const TRAIT_ID = 'T-TR1'
const traitDef: CardDef = { id: TRAIT_ID, name: 'Con tipos', type: 'Character', cost: 2, power: 3000, counter: 1000, life: 0, colors: ['Red'], keywords: [], traits: 'Straw Hat Crew Supernovas' }

function stage(effects: EffectRegistry = {}): GameState {
  const start = startGame()
  const mine  = withPlayer({ ...start, turn: 3, active: 'p1', effects, defs: { ...defs, [TRAIT_ID]: traitDef } }, 'p1', { characters: [inPlay(card('p1', 'T-C04', 1), 1, 0)], donActive: 2, donRested: 3 })

  return withPlayer(mine, 'p2', { characters: [{ ...inPlay(card('p2', 'T-C02', 2), 1), rested: true }, inPlay(card('p2', BLOCKER_ID, 3))], donActive: 4, donRested: 0 })

}


function run(state: GameState, ...steps: EffectStep[]): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = []

  return { state: resolveQueue({ ...state, effectQueue: [{ source: 'p1-t1', owner: 'p1', steps }] }, events), events }

}


function passive(patch: Partial<EffectDef>): EffectDef {
  return { timing: 'passive', run: () => [], ...patch }

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


describe('primitiva playSelf', () => {

  function trashed(extra: Partial<GameState['players']['p1']> = {}): GameState {
    const effects: EffectRegistry = { 'T-C05': [{ timing: 'onPlay', run: ctx => [{ op: 'draw', player: ctx.owner, amount: 1 }] }] }

    return withPlayer(stage(effects), 'p1', { trash: [card('p1', 'T-C05', 50)], ...extra })

  }

  it('pone la carta del trash como Character activo y dispara su [On Play]', () => {
    const state  = trashed()
    const result = run(state, { op: 'playSelf', player: 'p1', instanceId: 'p1-t50' })
    const mine   = result.state.players.p1

    expect(mine.trash).toEqual([])
    expect(mine.characters.map(item => item.card.instanceId)).toEqual(['p1-t1', 'p1-t50'])
    expect(mine.characters[1]).toMatchObject({ rested: false, attachedDon: 0, playedTurn: 3 })
    expect(mine.hand).toHaveLength(state.players.p1.hand.length + 1)
    expect(result.events).toContainEqual({ type: 'CharacterPlayed', player: 'p1', instanceId: 'p1-t50' })

  })


  it('con 5 Characters pide elegir cuál reemplazar y lo manda al trash', () => {
    const full    = Array.from({ length: 5 }, (_, i) => inPlay(card('p1', 'T-C04', i + 1), 1, i === 0 ? 2 : 0))
    const state   = trashed({ characters: full })
    const pending = run(state, { op: 'playSelf', player: 'p1', instanceId: 'p1-t50' }).state

    expect(pending.pending).toMatchObject({ player: 'p1', kind: 'target', optional: false })
    expect(pending.pending?.options).toHaveLength(5)

    const done = apply(pending, { type: 'Choose', player: 'p1', option: 'p1-t1' }).state
    const mine = done.players.p1

    expect(mine.characters).toHaveLength(5)
    expect(mine.characters.some(item => item.card.instanceId === 'p1-t50')).toBe(true)
    expect(mine.trash.map(item => item.instanceId)).toEqual(['p1-t1'])
    expect(mine.donRested).toBe(state.players.p1.donRested + 2)

  })


  it('no hace nada si la carta ya no está en el trash', () => {
    const state  = trashed({ trash: [] })
    const result = run(state, { op: 'playSelf', player: 'p1', instanceId: 'p1-t50' })

    expect(result.state.players.p1.characters).toHaveLength(1)

  })

})


describe('efectos pasivos', () => {

  it('un aura de power solo cuenta con los DON!! requeridos', () => {
    const effects = { 'T-C04': [passive({ donRequired: 1, aura: { power: 1000 } })] }
    const without = stage(effects)
    const withDon = withPlayer(without, 'p1', { characters: [inPlay(card('p1', 'T-C04', 1), 1, 1)] })

    expect(passivePower(without, 'p1-t1')).toBe(0)
    expect(passivePower(withDon, 'p1-t1')).toBe(1000)
    expect(getPower(withDon, 'p1-t1')).toBe(defs['T-C04'].power + 1000 + 1000)

  })


  it('respeta turn y condition', () => {
    const effects = { 'T-C04': [passive({ turn: 'opponents', aura: { power: 2000 } }), passive({ condition: ctx => ctx.state.players[ctx.owner].characters.length >= 2, aura: { power: 500 } })] }
    const state   = stage(effects)

    expect(passivePower(state, 'p1-t1')).toBe(0)
    expect(passivePower({ ...state, active: 'p2' }, 'p1-t1')).toBe(2000)
    expect(passivePower(withPlayer(state, 'p1', { characters: [inPlay(card('p1', 'T-C04', 1)), inPlay(card('p1', 'T-C03', 7))] }), 'p1-t1')).toBe(500)

  })


  it('affects permite un aura que beneficia a otras cartas del dueño', () => {
    const effects = { 'T-C04': [passive({ aura: { power: 1000, affects: (ctx, candidate) => candidate !== ctx.source && candidate.startsWith(ctx.owner) } })] }
    const state   = withPlayer(stage(effects), 'p1', { characters: [inPlay(card('p1', 'T-C04', 1)), inPlay(card('p1', 'T-C03', 7))] })

    expect(passivePower(state, 'p1-t1')).toBe(0)
    expect(passivePower(state, 'p1-t7')).toBe(1000)
    expect(passivePower(state, state.players.p1.leader.instanceId)).toBe(1000)
    expect(passivePower(state, 'p2-t2')).toBe(0)

  })


  it('un aura de keyword otorga Rush y habilita atacar el turno en que entra', () => {
    const effects = { 'T-C04': [passive({ donRequired: 1, aura: { keyword: 'Rush' } })] }
    const base    = withPlayer(stage(effects), 'p1', { characters: [inPlay(card('p1', 'T-C04', 1), 3, 0)] })
    const granted = withPlayer(base, 'p1', { characters: [inPlay(card('p1', 'T-C04', 1), 3, 1)] })

    expect(hasKeyword(base, 'p1-t1', 'Rush')).toBe(false)
    expect(hasKeyword(granted, 'p1-t1', 'Rush')).toBe(true)
    expect(getLegalActions(base, 'p1').some(action => action.type === 'Attack' && action.attacker === 'p1-t1')).toBe(false)
    expect(getLegalActions(granted, 'p1').some(action => action.type === 'Attack' && action.attacker === 'p1-t1')).toBe(true)
    expect(() => apply(granted, { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'leader' })).not.toThrow()

  })


  it('un aura de Blocker permite bloquear', () => {
    const effects = { 'T-C02': [passive({ aura: { keyword: 'Blocker' } })] }
    const state   = withPlayer(stage(effects), 'p2', { characters: [inPlay(card('p2', 'T-C02', 2))] })
    const battle  = apply(state, { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'leader' }).state

    expect(getLegalActions(battle, 'p2')).toContainEqual({ type: 'DeclareBlock', player: 'p2', blockerId: 'p2-t2' })

  })


  it('las cartas sin pasivos no cambian su power ni sus keywords', () => {
    const state = stage()

    expect(getPower(state, 'p1-t1')).toBe(defs['T-C04'].power)
    expect(hasKeyword(state, 'p2-t3', 'Blocker')).toBe(true)
    expect(hasKeyword(state, 'p1-t1', 'Rush')).toBe(false)

  })

})


describe('timing onBattle', () => {

  function hawkins(): GameState {
    const effects = { 'T-C04': [{ timing: 'onBattle', run: ctx => [{ op: 'activate', target: ctx.source }] } as EffectDef] }

    return stage(effects)

  }

  it('se dispara al atacar a un Character y deja al atacante activo', () => {
    const result = apply(hawkins(), { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'p2-t2' })

    expect(result.events.filter(event => event.type === 'EffectTriggered')).toEqual([{ type: 'EffectTriggered', player: 'p1', source: 'p1-t1', timing: 'onBattle' }])
    expect(result.state.players.p1.characters[0].rested).toBe(false)

  })


  it('no se dispara al atacar al Leader sin que nadie bloquee', () => {
    const result = apply(hawkins(), { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'leader' })

    expect(result.events.filter(event => event.type === 'EffectTriggered')).toEqual([])
    expect(result.state.players.p1.characters[0].rested).toBe(true)

  })


  it('se dispara cuando un Blocker rival toma el ataque al Leader', () => {
    const attacked = apply(hawkins(), { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'leader' }).state
    const blocked  = apply(attacked, { type: 'DeclareBlock', player: 'p2', blockerId: 'p2-t3' })

    expect(blocked.events.filter(event => event.type === 'EffectTriggered')).toHaveLength(1)
    expect(blocked.state.players.p1.characters[0].rested).toBe(false)
    expect(blocked.state.battle).toMatchObject({ target: 'p2-t3', step: 'counter' })

  })

})
