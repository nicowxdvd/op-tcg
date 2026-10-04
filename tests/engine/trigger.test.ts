import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { getLegalActions } from '../../src/engine/queries'
import { BANISH_ID, DOUBLE_ID } from './fixtures'
import { card, inPlay, startGame, withPlayer } from './helpers'
import type { EffectRegistry, GameState, PlayerState } from '../../src/engine/types'

const TRIGGER = 'T-C05'

const drawTrigger: EffectRegistry = { [TRIGGER]: [{ timing: 'trigger', run: ctx => [{ op: 'draw', player: ctx.owner, amount: 1 }] }] }

function stage(attackerDef = 'T-C04', life = [card('p2', TRIGGER, 31), card('p2', 'T-C06', 32), card('p2', TRIGGER, 33)], effects: EffectRegistry = drawTrigger, rival: Partial<PlayerState> = {}): GameState {
  const start = startGame()
  const mine  = withPlayer({ ...start, turn: 3, active: 'p1', effects }, 'p1', { characters: [inPlay(card('p1', attackerDef, 1), 1, 1)] })

  return withPlayer(mine, 'p2', { life, hand: [], ...rival })

}


function hit(state: GameState) {
  const attacked = apply(state, { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'leader' }).state
  const blocked  = apply(attacked, { type: 'PassBlock', player: 'p2' }).state

  return apply(blocked, { type: 'PassCounter', player: 'p2' })

}


const twoTriggers = [card('p2', TRIGGER, 31), card('p2', TRIGGER, 32), card('p2', 'T-C07', 33)]


function cards(state: GameState): number {
  const player = state.players.p2

  return player.deck.length + player.hand.length + player.life.length + player.trash.length + player.characters.length + (state.battle?.triggerCard ? 1 : 0)

}


describe('[Trigger] al perder Life', () => {

  it('una carta con efecto trigger pausa la batalla y espera la decisión del defensor', () => {
    const state  = stage()
    const result = hit(state)

    expect(result.state.battle).toMatchObject({ step: 'trigger', hitsLeft: 0 })
    expect(result.state.battle?.triggerCard?.instanceId).toBe('p2-t31')
    expect(result.state.players.p2.life.map(item => item.instanceId)).toEqual(['p2-t32', 'p2-t33'])
    expect(result.state.players.p2.hand).toEqual([])
    expect(result.events).toEqual([{ type: 'CounterPassed', player: 'p2' }, { type: 'LifeTaken', player: 'p2', instanceId: 'p2-t31' }, { type: 'TriggerAvailable', player: 'p2', instanceId: 'p2-t31' }])
    expect(cards(result.state)).toBe(cards(state))

  })


  it('RevealTrigger resuelve el efecto, manda la carta al trash y termina la batalla', () => {
    const waiting = hit(stage()).state
    const result  = apply(waiting, { type: 'RevealTrigger', player: 'p2' })
    const rival   = result.state.players.p2

    expect(rival.trash.map(item => item.instanceId)).toEqual(['p2-t31'])
    expect(rival.hand).toHaveLength(1)
    expect(rival.hand[0].instanceId).not.toBe('p2-t31')
    expect(result.state.battle).toBeNull()
    expect(result.events.map(event => event.type)).toEqual(['TriggerRevealed', 'EffectTriggered', 'CardDrawn', 'BattleEnded'])
    expect(cards(result.state)).toBe(cards(waiting))

  })


  it('PassTrigger manda la carta a la mano sin resolver el efecto', () => {
    const result = apply(hit(stage()).state, { type: 'PassTrigger', player: 'p2' })
    const rival  = result.state.players.p2

    expect(rival.hand.map(item => item.instanceId)).toEqual(['p2-t31'])
    expect(rival.trash).toEqual([])
    expect(result.state.battle).toBeNull()
    expect(result.events).toEqual([{ type: 'TriggerPassed', player: 'p2', instanceId: 'p2-t31' }, { type: 'BattleEnded', connected: true }])

  })


  it('sin efecto trigger la carta va a la mano sin pausar', () => {
    const result = hit(stage('T-C04', [card('p2', 'T-C06', 32)]))

    expect(result.state.battle).toBeNull()
    expect(result.state.players.p2.hand.map(item => item.instanceId)).toEqual(['p2-t32'])
    expect(result.events.some(event => event.type === 'TriggerAvailable')).toBe(false)

  })


  it('con Banish la carta va al trash y no se activa el [Trigger]', () => {
    const result = hit(stage(BANISH_ID))

    expect(result.state.battle).toBeNull()
    expect(result.state.players.p2.trash.map(item => item.instanceId)).toEqual(['p2-t31'])
    expect(result.state.players.p2.hand).toEqual([])
    expect(result.events.some(event => event.type === 'TriggerAvailable')).toBe(false)

  })


  it('al terminar la batalla se limpian los modificadores thisBattle', () => {
    const state   = stage()
    const boosted = { ...state, modifiers: [{ target: 'p1-t1', power: 1000, duration: 'thisBattle' as const, sourceId: 'p1-t1' }] }
    const waiting = hit(boosted).state

    expect(waiting.modifiers).toHaveLength(1)
    expect(apply(waiting, { type: 'PassTrigger', player: 'p2' }).state.modifiers).toEqual([])

  })

})


describe('[Trigger] con Double Attack', () => {

  it('pausa en el primer golpe y sigue con el segundo tras la decisión', () => {
    const waiting = hit(stage(DOUBLE_ID, [card('p2', TRIGGER, 31), card('p2', 'T-C06', 32), card('p2', 'T-C07', 33)])).state

    expect(waiting.battle?.hitsLeft).toBe(1)

    const result = apply(waiting, { type: 'PassTrigger', player: 'p2' })

    expect(result.state.battle).toBeNull()
    expect(result.state.players.p2.hand.map(item => item.instanceId)).toEqual(['p2-t31', 'p2-t32'])
    expect(result.state.players.p2.life.map(item => item.instanceId)).toEqual(['p2-t33'])
    expect(result.events.map(event => event.type)).toEqual(['TriggerPassed', 'LifeTaken', 'BattleEnded'])

  })


  it('si el segundo golpe también tiene [Trigger], pide otra decisión', () => {
    const first  = hit(stage(DOUBLE_ID, twoTriggers)).state
    const second = apply(first, { type: 'RevealTrigger', player: 'p2' }).state

    expect(second.battle).toMatchObject({ step: 'trigger', hitsLeft: 0 })
    expect(second.battle?.triggerCard?.instanceId).toBe('p2-t32')

  })


  it('si el segundo golpe es el [Trigger], la pausa llega con hitsLeft 0', () => {
    const waiting = hit(stage(DOUBLE_ID, [card('p2', 'T-C06', 31), card('p2', TRIGGER, 32), card('p2', 'T-C07', 33)])).state

    expect(waiting.battle).toMatchObject({ step: 'trigger', hitsLeft: 0 })
    expect(waiting.players.p2.hand.map(item => item.instanceId)).toEqual(['p2-t31'])

  })


  it('con una sola Life, tras resolver el primer [Trigger] el segundo golpe gana la partida', () => {
    const waiting = hit(stage(DOUBLE_ID, [card('p2', TRIGGER, 31)])).state
    const result  = apply(waiting, { type: 'PassTrigger', player: 'p2' })

    expect(result.state.winner).toBe('p1')
    expect(result.state.phase).toBe('gameOver')
    expect(result.events.at(-1)).toEqual({ type: 'GameOver', winner: 'p1' })

  })

})


describe('[Trigger] y decisiones', () => {

  it('un efecto trigger con elección deja pending y el segundo golpe espera', () => {
    const effects = { [TRIGGER]: [{ timing: 'trigger', run: () => [{ op: 'choose', chooser: 'p2', kind: 'option', options: ['a'], optional: false, then: [{ op: 'draw', player: 'p2', amount: 1 }] }] }] } as EffectRegistry
    const waiting = hit(stage(DOUBLE_ID, twoTriggers, effects)).state
    const asked   = apply(waiting, { type: 'RevealTrigger', player: 'p2' }).state

    expect(asked.pending?.player).toBe('p2')
    expect(asked.battle?.step).toBe('trigger')
    expect(asked.players.p2.life).toHaveLength(2)

    const result = apply(asked, { type: 'Choose', player: 'p2', option: 'a' })

    expect(result.state.pending).toBeNull()
    expect(result.state.battle).toMatchObject({ step: 'trigger', hitsLeft: 0 })
    expect(result.state.battle?.triggerCard?.instanceId).toBe('p2-t32')

  })


  it('un efecto trigger que termina la partida cierra la batalla', () => {
    const result = apply(hit(stage('T-C04', undefined, drawTrigger, { deck: [] })).state, { type: 'RevealTrigger', player: 'p2' })

    expect(result.state.winner).toBe('p1')
    expect(result.state.phase).toBe('gameOver')
    expect(result.state.battle).toBeNull()

  })

})


describe('validaciones del paso trigger', () => {

  it('solo decide el defensor y solo en el paso trigger', () => {
    const waiting = hit(stage()).state

    expect(() => apply(waiting, { type: 'RevealTrigger', player: 'p1' })).toThrow(/decide p2, no p1/)
    expect(() => apply(waiting, { type: 'PassTrigger', player: 'p1' })).toThrow(/decide p2, no p1/)
    expect(() => apply(stage(), { type: 'RevealTrigger', player: 'p2' })).toThrow(/paso trigger/)
    expect(() => apply(stage(), { type: 'PassTrigger', player: 'p2' })).toThrow(/paso trigger/)

  })


  it('mientras espera el trigger no se puede pasar de fase, atacar ni contrarrestar', () => {
    const waiting = hit(stage()).state

    expect(() => apply(waiting, { type: 'PassPhase', player: 'p1' })).toThrow(/batalla/)
    expect(() => apply(waiting, { type: 'Attack', player: 'p1', attacker: 'leader', target: 'leader' })).toThrow(/batalla/)
    expect(() => apply(waiting, { type: 'PassCounter', player: 'p2' })).toThrow(/paso counter/)

  })


  it('getLegalActions ofrece Reveal y Pass al defensor y nada al atacante', () => {
    const waiting = hit(stage()).state

    expect(getLegalActions(waiting, 'p2')).toEqual([{ type: 'RevealTrigger', player: 'p2' }, { type: 'PassTrigger', player: 'p2' }])
    expect(getLegalActions(waiting, 'p1')).toEqual([])

  })


  it('toda acción ofrecida en el paso trigger es aceptada por apply', () => {
    const waiting = hit(stage()).state

    for (const action of getLegalActions(waiting, 'p2'))
      expect(() => apply(waiting, action)).not.toThrow()

  })


  it('apply no muta el estado de entrada', () => {
    const waiting = hit(stage()).state
    const frozen  = JSON.stringify(waiting)

    apply(waiting, { type: 'RevealTrigger', player: 'p2' })
    apply(waiting, { type: 'PassTrigger', player: 'p2' })

    expect(JSON.stringify(waiting)).toBe(frozen)

  })

})
