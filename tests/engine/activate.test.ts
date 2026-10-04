import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { getLegalActions } from '../../src/engine/queries'
import { card, inPlay, pass, startGame, withPlayer } from './helpers'
import type { Action, EffectCost, EffectDef, GameState, PlayerState } from '../../src/engine/types'

const activate: Action = { type: 'ActivateEffect', player: 'p1', source: 'p1-t1', index: 0 }

function effect(patch: Partial<EffectDef> = {}): EffectDef {
  return { timing: 'activateMain', run: ctx => [{ op: 'draw', player: ctx.owner, amount: 1 }], ...patch }

}


function stage(def: EffectDef, patch: Partial<PlayerState> = {}): GameState {
  const start = startGame()
  const mine  = withPlayer({ ...start, turn: 3, active: 'p1', effects: { 'T-C04': [def] } }, 'p1', { characters: [inPlay(card('p1', 'T-C04', 1), 1)], donActive: 3, ...patch })

  return withPlayer(mine, 'p2', { characters: [] })

}


function withCost(cost: EffectCost, patch: Partial<PlayerState> = {}): GameState {
  return stage(effect({ cost }), patch)

}


describe('ActivateEffect', () => {

  it('resuelve el efecto de [Activate: Main] y emite EffectActivated', () => {
    const state  = stage(effect())
    const result = apply(state, activate)

    expect(result.state.players.p1.hand).toHaveLength(state.players.p1.hand.length + 1)
    expect(result.events).toEqual([{ type: 'EffectActivated', player: 'p1', source: 'p1-t1', index: 0 }, { type: 'CardDrawn', player: 'p1', instanceId: state.players.p1.deck[0].instanceId }])

  })


  it('solo se activa en el Main del jugador activo y sin batalla', () => {
    const state = stage(effect())

    expect(() => apply(state, { ...activate, player: 'p2' })).toThrow(/No es el turno de p2/)
    expect(() => apply({ ...state, phase: 'end' }, activate)).toThrow(/fase main/)
    expect(() => apply({ ...state, battle: { attacker: 'leader', target: 'leader', attackerPlayer: 'p2', step: 'block', counterPower: 0 } }, activate)).toThrow(/batalla/)

  })


  it('falla con una carta sin efecto, un índice inexistente o un timing distinto', () => {
    expect(() => apply(stage(effect()), { ...activate, source: 'p1-t9' })).toThrow(/no tiene el efecto/)
    expect(() => apply(stage(effect()), { ...activate, index: 3 })).toThrow(/no tiene el efecto/)
    expect(() => apply(stage(effect({ timing: 'onPlay' })), activate)).toThrow(/no es \[Activate: Main\]/)

  })


  it('respeta [DON!! xN] y [Opponent\'s Turn]', () => {
    expect(() => apply(stage(effect({ donRequired: 1 })), activate)).toThrow(/no se puede activar ahora/)
    expect(() => apply(stage(effect({ turn: 'opponents' })), activate)).toThrow(/no se puede activar ahora/)

    const loaded = stage(effect({ donRequired: 1 }))

    expect(apply(withPlayer(loaded, 'p1', { characters: [inPlay(card('p1', 'T-C04', 1), 1, 1)] }), activate).events[0].type).toBe('EffectActivated')

  })


  it('funciona desde el Leader y desde la Stage', () => {
    const state = withPlayer({ ...stage(effect()), effects: { 'T-L01': [effect()], 'T-C05': [effect()] } }, 'p1', { stage: card('p1', 'T-C05', 7) })

    expect(apply(state, { ...activate, source: 'p1-leader' }).state.players.p1.hand).toHaveLength(state.players.p1.hand.length + 1)
    expect(apply(state, { ...activate, source: 'p1-t7' }).state.players.p1.hand).toHaveLength(state.players.p1.hand.length + 1)

  })

})


describe('costos de ActivateEffect', () => {

  it('restSelf descansa la carta y no se puede pagar dos veces', () => {
    const state  = withCost({ restSelf: true })
    const result = apply(state, activate)

    expect(result.state.players.p1.characters[0].rested).toBe(true)
    expect(() => apply(result.state, activate)).toThrow(/ya está descansada/)

  })


  it('restSelf falla en una Stage porque no se descansa', () => {
    const state = withPlayer({ ...withCost({ restSelf: true }), effects: { 'T-C05': [effect({ cost: { restSelf: true } })] } }, 'p1', { stage: card('p1', 'T-C05', 7) })

    expect(() => apply(state, { ...activate, source: 'p1-t7' })).toThrow(/no se puede descansar/)

  })


  it('restDon descansa DON!! activos y falla si no alcanzan', () => {
    const result = apply(withCost({ restDon: 2 }), activate)

    expect(result.state.players.p1.donActive).toBe(1)
    expect(result.state.players.p1.donRested).toBe(2)
    expect(result.events).toContainEqual({ type: 'DonRested', player: 'p1', amount: 2 })
    expect(() => apply(withCost({ restDon: 2 }, { donActive: 1 }), activate)).toThrow(/DON!! insuficiente/)

  })


  it('un costo impagable no cambia el estado y el efecto no se ejecuta', () => {
    const state  = withCost({ restDon: 2, restSelf: true }, { donActive: 1 })
    const frozen = JSON.stringify(state)

    expect(() => apply(state, activate)).toThrow(/DON!! insuficiente/)
    expect(JSON.stringify(state)).toBe(frozen)

  })


  it('trashFromHand pide elegir la carta y luego ejecuta el efecto', () => {
    const hand    = [card('p1', 'T-C01', 11), card('p1', 'T-C02', 12)]
    const state   = withCost({ trashFromHand: 1 }, { hand })
    const waiting = apply(state, activate).state

    expect(waiting.pending).toMatchObject({ player: 'p1', kind: 'trashFromHand', options: ['p1-t11', 'p1-t12'], optional: false })
    expect(waiting.players.p1.hand).toHaveLength(2)

    const result = apply(waiting, { type: 'Choose', player: 'p1', option: 'p1-t12' })

    expect(result.state.players.p1.trash.map(item => item.instanceId)).toEqual(['p1-t12'])
    expect(result.state.players.p1.hand.map(item => item.instanceId)).toEqual(['p1-t11', state.players.p1.deck[0].instanceId])
    expect(result.events.map(event => event.type)).toEqual(['ChoiceMade', 'CardDiscarded', 'CardDrawn'])

  })


  it('trashFromHand de 2 cartas pide dos decisiones sin repetir la carta', () => {
    const hand  = [card('p1', 'T-C01', 11), card('p1', 'T-C02', 12), card('p1', 'T-C03', 13)]
    const first = apply(withCost({ trashFromHand: 2 }, { hand }), activate).state
    const next  = apply(first, { type: 'Choose', player: 'p1', option: 'p1-t11' }).state

    expect(next.pending?.options).toEqual(['p1-t12', 'p1-t13'])
    expect(apply(next, { type: 'Choose', player: 'p1', option: 'p1-t13' }).state.players.p1.trash.map(item => item.instanceId)).toEqual(['p1-t11', 'p1-t13'])

  })


  it('trashFromHand falla si la mano no alcanza', () => {
    expect(() => apply(withCost({ trashFromHand: 2 }, { hand: [card('p1', 'T-C01', 11)] }), activate)).toThrow(/Mano insuficiente/)

  })


  it('con varios costos paga todos antes del efecto', () => {
    const state  = withCost({ restSelf: true, restDon: 1, trashFromHand: 1 }, { hand: [card('p1', 'T-C01', 11)] })
    const result = apply(apply(state, activate).state, { type: 'Choose', player: 'p1', option: 'p1-t11' }).state

    expect(result.players.p1.characters[0].rested).toBe(true)
    expect(result.players.p1.donRested).toBe(1)
    expect(result.players.p1.trash).toHaveLength(1)
    expect(result.players.p1.hand).toHaveLength(1)

  })

})


describe('[Once Per Turn] en ActivateEffect', () => {

  it('impide repetir en el mismo turno y se reinicia al siguiente', () => {
    const state = stage(effect({ oncePerTurn: true }))
    const used  = apply(state, activate).state

    expect(used.oncePerTurnUsed).toEqual(['T-C04:p1-t1:0'])
    expect(() => apply(used, activate)).toThrow(/no se puede activar ahora/)

    const back = pass(pass(used).state).state

    expect(back.active).toBe('p1')
    expect(apply(back, activate).events[0].type).toBe('EffectActivated')

  })

})


describe('getLegalActions con ActivateEffect', () => {

  it('ofrece la activación solo mientras se puede pagar', () => {
    expect(getLegalActions(withCost({ restDon: 2 }), 'p1')).toContainEqual(activate)
    expect(getLegalActions(withCost({ restDon: 4 }), 'p1')).not.toContainEqual(activate)
    expect(getLegalActions(stage(effect({ timing: 'onPlay' })), 'p1')).not.toContainEqual(activate)
    expect(getLegalActions(withCost({ restDon: 2 }), 'p2')).toEqual([])

  })


  it('deja de ofrecerla tras usar un [Once Per Turn]', () => {
    const used = apply(stage(effect({ oncePerTurn: true })), activate).state

    expect(getLegalActions(used, 'p1')).not.toContainEqual(activate)

  })


  it('toda acción ActivateEffect ofrecida es aceptada por apply', () => {
    const state = withCost({ restSelf: true, restDon: 1 })

    for (const action of getLegalActions(state, 'p1').filter(candidate => candidate.type === 'ActivateEffect'))
      expect(() => apply(state, action)).not.toThrow()

  })

})
