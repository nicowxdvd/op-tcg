import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { getLegalActions } from '../../src/engine/queries'
import { card, inPlay, startGame, withPlayer } from './helpers'
import type { Action, EffectRegistry, EffectStep, GameState } from '../../src/engine/types'

const koChoice: EffectStep[] = [{ op: 'choose', chooser: 'p1', kind: 'target', options: ['p2-t2', 'p2-t3'], optional: false, then: [{ op: 'ko', target: '$choice' }] }, { op: 'draw', player: 'p1', amount: 1 }]

function stage(steps: EffectStep[] = koChoice, optional = false, timing: 'whenAttacking' | 'endOfYourTurn' = 'whenAttacking'): GameState {
  const start   = startGame()
  const effects = { 'T-C04': [{ timing, run: () => steps.map(step => step.op === 'choose' ? { ...step, optional } : step) }] } as EffectRegistry
  const mine    = withPlayer({ ...start, turn: 3, active: 'p1', effects }, 'p1', { characters: [inPlay(card('p1', 'T-C04', 1), 1)] })

  return withPlayer(mine, 'p2', { characters: [{ ...inPlay(card('p2', 'T-C02', 2), 1), rested: true }, { ...inPlay(card('p2', 'T-C03', 3), 1), rested: true }] })

}


function pending(state = stage()): GameState {
  return apply(state, { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'leader' }).state

}


describe('decisiones pendientes', () => {

  it('un efecto con elección deja pending y detiene el resto', () => {
    const state = pending()

    expect(state.pending).toMatchObject({ player: 'p1', kind: 'target', options: ['p2-t2', 'p2-t3'], optional: false })
    expect(state.pending?.resume.rest).toEqual([{ op: 'draw', player: 'p1', amount: 1 }])
    expect(state.players.p2.characters).toHaveLength(2)
    expect(state.players.p1.hand).toHaveLength(stage().players.p1.hand.length)

  })


  it('solo decide el jugador indicado', () => {
    const state = pending()

    expect(() => apply(state, { type: 'Choose', player: 'p2', option: 'p2-t2' })).toThrow(/decisión pendiente es de p1/)
    expect(() => apply(state, { type: 'PassChoice', player: 'p2' })).toThrow(/decisión pendiente es de p1/)

  })


  it('mientras hay pending cualquier otra acción lanza error', () => {
    const state = pending()

    expect(() => apply(state, { type: 'PassPhase', player: 'p1' })).toThrow(/decisión pendiente/)
    expect(() => apply(state, { type: 'PassBlock', player: 'p2' })).toThrow(/decisión pendiente/)
    expect(() => apply(state, { type: 'AttachDon', player: 'p1', target: 'leader' })).toThrow(/decisión pendiente/)

  })


  it('tras elegir, ejecuta con la opción y continúa con el resto del efecto', () => {
    const state  = pending()
    const result = apply(state, { type: 'Choose', player: 'p1', option: 'p2-t3' })

    expect(result.state.pending).toBeNull()
    expect(result.state.players.p2.characters.map(item => item.card.instanceId)).toEqual(['p2-t2'])
    expect(result.state.players.p1.hand).toHaveLength(state.players.p1.hand.length + 1)
    expect(result.events.map(event => event.type)).toEqual(['ChoiceMade', 'CharacterKOd', 'CardDrawn'])

  })


  it('una opción fuera de la lista lanza error y no cambia el estado', () => {
    const state = pending()

    expect(() => apply(state, { type: 'Choose', player: 'p1', option: 'p2-t99' })).toThrow(/no está entre las permitidas/)
    expect(state.pending).not.toBeNull()

  })


  it('Choose sin pending lanza error', () => {
    expect(() => apply(stage(), { type: 'Choose', player: 'p1', option: 'p2-t2' })).toThrow(/No hay una decisión pendiente/)

  })


  it('PassChoice falla si la decisión no es opcional', () => {
    expect(() => apply(pending(), { type: 'PassChoice', player: 'p1' })).toThrow(/no es opcional/)

  })


  it('PassChoice en una decisión opcional se salta el then y sigue con el resto', () => {
    const state  = pending(stage(koChoice, true))
    const result = apply(state, { type: 'PassChoice', player: 'p1' })

    expect(result.state.pending).toBeNull()
    expect(result.state.players.p2.characters).toHaveLength(2)
    expect(result.state.players.p1.hand).toHaveLength(state.players.p1.hand.length + 1)
    expect(result.events.map(event => event.type)).toEqual(['ChoicePassed', 'CardDrawn'])

  })


  it('sin opciones el efecto no pide decisión y continúa', () => {
    const empty  = [{ op: 'choose', chooser: 'p1', kind: 'target', options: [], optional: false, then: [{ op: 'ko', target: '$choice' }] }, { op: 'draw', player: 'p1', amount: 1 }] as EffectStep[]
    const result = pending(stage(empty))

    expect(result.pending).toBeNull()
    expect(result.players.p1.hand).toHaveLength(stage().players.p1.hand.length + 1)

  })


  it('el ataque sigue su curso tras resolver la decisión', () => {
    const state = apply(pending(), { type: 'Choose', player: 'p1', option: 'p2-t2' }).state

    expect(state.battle?.step).toBe('block')
    expect(apply(state, { type: 'PassBlock', player: 'p2' }).state.battle?.step).toBe('counter')

  })


  it('un [End of Your Turn] con elección detiene el cambio de turno hasta decidir', () => {
    const state  = apply(stage(koChoice, false, 'endOfYourTurn'), { type: 'PassPhase', player: 'p1' }).state

    expect(state.phase).toBe('end')
    expect(state.turn).toBe(3)
    expect(state.pending?.player).toBe('p1')

    const result = apply(state, { type: 'Choose', player: 'p1', option: 'p2-t2' })

    expect(result.state.phase).toBe('main')
    expect(result.state.turn).toBe(4)
    expect(result.state.active).toBe('p2')
    expect(result.state.players.p2.characters.map(item => item.card.instanceId)).toEqual(['p2-t3'])

  })


  it('apply no muta el estado de entrada', () => {
    const state  = pending()
    const frozen = JSON.stringify(state)

    apply(state, { type: 'Choose', player: 'p1', option: 'p2-t2' })

    expect(JSON.stringify(state)).toBe(frozen)

  })

})


describe('getLegalActions con pending', () => {

  it('solo ofrece Choose por opción al jugador que decide y nada al otro', () => {
    const state = pending()

    expect(getLegalActions(state, 'p1')).toEqual([{ type: 'Choose', player: 'p1', option: 'p2-t2' }, { type: 'Choose', player: 'p1', option: 'p2-t3' }])
    expect(getLegalActions(state, 'p2')).toEqual([])

  })


  it('agrega PassChoice si la decisión es opcional', () => {
    const actions = getLegalActions(pending(stage(koChoice, true)), 'p1')

    expect(actions.at(-1)).toEqual({ type: 'PassChoice', player: 'p1' })
    expect(actions).toHaveLength(3)

  })


  it('siempre devuelve al menos una acción legal que apply acepta', () => {
    const kinds = ['target', 'option', 'trashFromHand', 'orderDeck', 'confirm'] as const

    for (const kind of kinds) {
      const steps: EffectStep[] = [{ op: 'choose', chooser: 'p1', kind, options: ['p2-t2'], optional: false, then: [{ op: 'rest', target: '$choice' }] }]
      const state               = pending(stage(steps))
      const actions: Action[]   = getLegalActions(state, 'p1')

      expect(actions.length).toBeGreaterThan(0)
      expect(() => apply(state, actions[0])).not.toThrow()

    }

  })

})


describe('búsqueda con elección', () => {

  it('search deja elegir entre las cartas que cumplen y manda el resto al fondo', () => {
    const base   = withPlayer(stage([{ op: 'search', player: 'p1', amount: 3, type: 'Character' }]), 'p1', { deck: [card('p1', 'T-L02', 91), card('p1', 'T-C01', 92), card('p1', 'T-C02', 93), card('p1', 'T-C03', 94)] })
    const state  = pending(base)

    expect(state.pending?.options).toEqual(['p1-t92', 'p1-t93'])
    expect(state.pending?.optional).toBe(true)

    const result = apply(state, { type: 'Choose', player: 'p1', option: 'p1-t93' })
    const mine   = result.state.players.p1

    expect(mine.hand.at(-1)?.instanceId).toBe('p1-t93')
    expect(mine.deck.map(item => item.instanceId)).toEqual(['p1-t94', 'p1-t91', 'p1-t92'])

  })


  it('search permite no tomar ninguna y manda las vistas al fondo', () => {
    const base   = withPlayer(stage([{ op: 'search', player: 'p1', amount: 2, type: 'Character' }]), 'p1', { deck: [card('p1', 'T-C01', 92), card('p1', 'T-C02', 93), card('p1', 'T-C03', 94)] })
    const state  = pending(base)
    const result = apply(state, { type: 'PassChoice', player: 'p1' })

    expect(result.state.players.p1.hand).toEqual(state.players.p1.hand)
    expect(result.state.players.p1.deck.map(item => item.instanceId)).toEqual(['p1-t94', 'p1-t92', 'p1-t93'])

  })


  it('search sin cartas que cumplan no pide decisión', () => {
    expect(pending(stage([{ op: 'search', player: 'p1', amount: 3, type: 'Event' }])).pending).toBeNull()

  })

})
