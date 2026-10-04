import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { fireEffects } from '../../src/engine/effects'
import { card, inPlay, pass, startGame, withPlayer } from './helpers'
import type { EffectDef, EffectRegistry, GameEvent, GameState, PlayerId } from '../../src/engine/types'

function effect(patch: Partial<EffectDef> & Pick<EffectDef, 'timing'>): EffectDef {
  return { run: ctx => [{ op: 'draw', player: ctx.owner, amount: 1 }], ...patch }

}


function stage(effects: EffectRegistry, attachedDon = 0): GameState {
  const start = startGame()
  const mine  = withPlayer({ ...start, turn: 3, active: 'p1', effects }, 'p1', { characters: [inPlay(card('p1', 'T-C04', 1), 1, attachedDon)] })

  return withPlayer(mine, 'p2', { characters: [{ ...inPlay(card('p2', 'T-C02', 2), 1), rested: true }] })

}


function attackCharacter(state: GameState) {
  return apply(state, { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'p2-t2' })

}


function finish(state: GameState) {
  const attacked = attackCharacter(state).state
  const blocked  = apply(attacked, { type: 'PassBlock', player: 'p2' }).state

  return apply(blocked, { type: 'PassCounter', player: 'p2' })

}


function triggered(events: GameEvent[]): GameEvent[] {
  return events.filter(event => event.type === 'EffectTriggered')

}


describe('disparo de efectos', () => {

  it('[On Play] se dispara al jugar la carta, una sola vez', () => {
    const base   = stage({ 'T-C04': [effect({ timing: 'onPlay' })] })
    const hand   = withPlayer(base, 'p1', { characters: [], hand: [card('p1', 'T-C04', 1)], donActive: 3 })
    const result = apply(hand, { type: 'PlayCharacter', player: 'p1', instanceId: 'p1-t1' })

    expect(triggered(result.events)).toEqual([{ type: 'EffectTriggered', player: 'p1', source: 'p1-t1', timing: 'onPlay' }])
    expect(result.events.filter(event => event.type === 'CardDrawn')).toHaveLength(1)
    expect(result.state.players.p1.hand).toHaveLength(1)
    expect(result.state.effectQueue).toEqual([])

  })


  it('[On Play] no se dispara para una carta sin efecto', () => {
    const hand   = withPlayer(stage({}), 'p1', { characters: [], hand: [card('p1', 'T-C04', 1)], donActive: 3 })
    const result = apply(hand, { type: 'PlayCharacter', player: 'p1', instanceId: 'p1-t1' })

    expect(triggered(result.events)).toEqual([])

  })


  it('[When Attacking] se dispara al declarar el ataque, antes del Block step', () => {
    const state  = stage({ 'T-C04': [effect({ timing: 'whenAttacking', run: ctx => [{ op: 'power', target: ctx.source, amount: 2000, duration: 'thisBattle' }] })] })
    const result = attackCharacter(state)

    expect(result.state.battle?.step).toBe('block')
    expect(result.state.modifiers).toEqual([{ target: 'p1-t1', power: 2000, duration: 'thisBattle', sourceId: 'p1-t1' }])
    expect(result.events.map(event => event.type)).toEqual(['AttackDeclared', 'EffectTriggered', 'PowerModified'])

  })


  it('[When Attacking] también se dispara con el Leader atacante', () => {
    const state  = { ...stage({ 'T-L01': [effect({ timing: 'whenAttacking' })] }), turn: 3 }
    const result = apply(state, { type: 'Attack', player: 'p1', attacker: 'leader', target: 'p2-t2' })

    expect(triggered(result.events)).toEqual([{ type: 'EffectTriggered', player: 'p1', source: 'p1-leader', timing: 'whenAttacking' }])

  })


  it('[On K.O.] se dispara cuando el Character va al trash por batalla', () => {
    const state  = stage({ 'T-C02': [effect({ timing: 'onKO' })] })
    const result = finish(state)

    expect(result.state.players.p2.trash.map(item => item.instanceId)).toEqual(['p2-t2'])
    expect(triggered(result.events)).toEqual([{ type: 'EffectTriggered', player: 'p2', source: 'p2-t2', timing: 'onKO' }])
    expect(result.state.players.p2.hand).toHaveLength(state.players.p2.hand.length + 1)

  })


  it('[On K.O.] no se dispara si el ataque no conecta', () => {
    const state  = stage({ 'T-C02': [effect({ timing: 'onKO' })] })
    const weak   = withPlayer(state, 'p1', { characters: [inPlay(card('p1', 'T-C01', 1), 1)] })
    const result = finish(weak)

    expect(triggered(result.events)).toEqual([])

  })


  it('[End of Your Turn] se dispara al terminar el turno del dueño', () => {
    const state  = stage({ 'T-C04': [effect({ timing: 'endOfYourTurn' })] })
    const result = pass(state)

    expect(triggered(result.events)).toEqual([{ type: 'EffectTriggered', player: 'p1', source: 'p1-t1', timing: 'endOfYourTurn' }])
    expect(result.events.findIndex(event => event.type === 'EffectTriggered')).toBeLessThan(result.events.findIndex(event => event.type === 'PhaseChanged' && event.phase === 'refresh'))

  })


  it('[End of Your Turn] no se dispara al terminar el turno del rival', () => {
    const state  = stage({ 'T-C02': [effect({ timing: 'endOfYourTurn' })] })
    const result = pass(state)

    expect(triggered(result.events)).toEqual([])

  })

})


describe('condiciones de efectos', () => {

  it('[DON!! xN] exige N o más DON!! adjuntos', () => {
    const registry = { 'T-C04': [effect({ timing: 'whenAttacking', donRequired: 2 })] }

    expect(triggered(attackCharacter(stage(registry, 1)).events)).toEqual([])
    expect(triggered(attackCharacter(stage(registry, 2)).events)).toHaveLength(1)
    expect(triggered(attackCharacter(stage(registry, 3)).events)).toHaveLength(1)

  })


  it('[DON!! xN] de un [On K.O.] usa los DON!! que tenía al caer', () => {
    const registry = { 'T-C02': [effect({ timing: 'onKO', donRequired: 1 })] }
    const state    = stage(registry)
    const loaded   = withPlayer(state, 'p2', { characters: [{ ...inPlay(card('p2', 'T-C02', 2), 1, 1), rested: true }] })

    expect(triggered(finish(state).events)).toEqual([])
    expect(triggered(finish(loaded).events)).toHaveLength(1)

  })


  it('[Your Turn] solo vale en el turno del dueño', () => {
    const yours = effect({ timing: 'onKO', turn: 'yours' })

    expect(triggered(finish(stage({ 'T-C02': [yours] })).events)).toEqual([])
    expect(triggered(finish(stage({ 'T-C02': [effect({ timing: 'onKO', turn: 'opponents' })] })).events)).toHaveLength(1)

  })


  it('[Opponent\'s Turn] bloquea el efecto en el turno del dueño', () => {
    const state = stage({ 'T-C04': [effect({ timing: 'whenAttacking', turn: 'opponents' })] })

    expect(triggered(attackCharacter(state).events)).toEqual([])

  })


  it('[Once Per Turn] impide repetir el efecto y se reinicia al terminar el turno', () => {
    const state  = stage({ 'T-C04': [effect({ timing: 'whenAttacking', oncePerTurn: true })] })
    const source = { instanceId: 'p1-t1', defId: 'T-C04', owner: 'p1' as const, attachedDon: 0 }
    const first  = [] as GameEvent[]
    const second = [] as GameEvent[]
    const once   = fireEffects(state, 'whenAttacking', source, first)
    const twice  = fireEffects(once, 'whenAttacking', source, second)

    expect(triggered(first)).toHaveLength(1)
    expect(once.oncePerTurnUsed).toEqual(['T-C04:p1-t1:0'])
    expect(triggered(second)).toEqual([])

    const next  = pass(pass(twice).state).state
    const third = [] as GameEvent[]

    expect(next.oncePerTurnUsed).toEqual([])

    fireEffects({ ...next, active: 'p1' }, 'whenAttacking', source, third)

    expect(triggered(third)).toHaveLength(1)

  })


  it('[Once Per Turn] lleva la cuenta por carta', () => {
    const state  = stage({ 'T-C04': [effect({ timing: 'whenAttacking', oncePerTurn: true })] })
    const events = [] as GameEvent[]
    const one    = fireEffects(state, 'whenAttacking', { instanceId: 'p1-t1', defId: 'T-C04', owner: 'p1', attachedDon: 0 }, events)

    fireEffects(one, 'whenAttacking', { instanceId: 'p1-t9', defId: 'T-C04', owner: 'p1', attachedDon: 0 }, events)

    expect(triggered(events)).toHaveLength(2)

  })


  it('condition en false bloquea el efecto', () => {
    const blocked = stage({ 'T-C04': [effect({ timing: 'whenAttacking', condition: () => false })] })
    const allowed = stage({ 'T-C04': [effect({ timing: 'whenAttacking', condition: ctx => ctx.state.turn === 3 })] })

    expect(triggered(attackCharacter(blocked).events)).toEqual([])
    expect(triggered(attackCharacter(allowed).events)).toHaveLength(1)

  })

})


describe('resolución de efectos', () => {

  it('varios efectos de una carta se resuelven en orden de aparición', () => {
    const registry = { 'T-C04': [effect({ timing: 'whenAttacking', run: ctx => [{ op: 'power', target: ctx.source, amount: 1000, duration: 'thisTurn' }] }), effect({ timing: 'whenAttacking', run: ctx => [{ op: 'power', target: ctx.source, amount: 2000, duration: 'thisTurn' }] })] }
    const result   = attackCharacter(stage(registry))

    expect(result.state.modifiers.map(item => item.power)).toEqual([1000, 2000])

  })


  it('robar con el mazo vacío pierde la partida', () => {
    const empty  = withPlayer(stage({ 'T-C04': [effect({ timing: 'whenAttacking' })] }), 'p1', { deck: [] })
    const result = attackCharacter(empty)

    expect(result.state.winner).toBe('p2')
    expect(result.state.phase).toBe('gameOver')
    expect(result.events.at(-1)).toEqual({ type: 'GameOver', winner: 'p2' })

  })


  it('conserva el total de cartas y de DON!! por jugador', () => {
    const state  = stage({ 'T-C04': [effect({ timing: 'whenAttacking' })], 'T-C02': [effect({ timing: 'onKO' })] }, 1)
    const result = finish(state).state
    const cards  = (game: GameState, id: PlayerId) => { const p = game.players[id]; return p.deck.length + p.hand.length + p.life.length + p.trash.length + p.characters.length }
    const don    = (game: GameState, id: PlayerId) => { const p = game.players[id]; return p.donDeck + p.donActive + p.donRested + p.leaderAttachedDon + p.characters.reduce((sum, c) => sum + c.attachedDon, 0) }

    for (const id of ['p1', 'p2'] as const) {
      expect(cards(result, id)).toBe(cards(state, id))
      expect(don(result, id)).toBe(don(state, id))
    }

  })


  it('apply no muta el estado de entrada', () => {
    const state  = stage({ 'T-C04': [effect({ timing: 'whenAttacking' })] })
    const frozen = JSON.stringify(state)

    attackCharacter(state)

    expect(JSON.stringify(state)).toBe(frozen)

  })

})
