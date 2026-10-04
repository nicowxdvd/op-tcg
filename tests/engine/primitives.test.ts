import { describe, expect, it } from 'vitest'
import { resolveQueue } from '../../src/engine/effects'
import { card, inPlay, startGame, withPlayer } from './helpers'
import type { EffectRegistry, EffectStep, GameEvent, GameState, PlayerId } from '../../src/engine/types'

function stage(effects: EffectRegistry = {}): GameState {
  const start = startGame()
  const mine  = withPlayer({ ...start, turn: 3, active: 'p1', effects }, 'p1', { characters: [inPlay(card('p1', 'T-C04', 1), 1, 2)] })

  return withPlayer(mine, 'p2', { characters: [inPlay(card('p2', 'T-C02', 2), 1, 1)] })

}


function run(state: GameState, ...steps: EffectStep[]): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = []

  return { state: resolveQueue({ ...state, effectQueue: [{ source: 'p1-leader', owner: 'p1', steps }] }, events), events }

}


function total(state: GameState, id: PlayerId): number {
  const player = state.players[id]

  return player.deck.length + player.hand.length + player.life.length + player.trash.length + player.characters.length

}


describe('primitiva ko', () => {

  it('manda el Character al trash y sus DON!! adjuntos a rested', () => {
    const state  = stage()
    const result = run(state, { op: 'ko', target: 'p2-t2' })
    const rival  = result.state.players.p2

    expect(rival.characters).toEqual([])
    expect(rival.trash.map(item => item.instanceId)).toEqual(['p2-t2'])
    expect(rival.donRested).toBe(state.players.p2.donRested + 1)
    expect(result.events).toEqual([{ type: 'CharacterKOd', player: 'p2', instanceId: 'p2-t2' }])
    expect(total(result.state, 'p2')).toBe(total(state, 'p2'))

  })


  it('dispara el [On K.O.] del Character derribado por efecto', () => {
    const state  = stage({ 'T-C02': [{ timing: 'onKO', run: ctx => [{ op: 'draw', player: ctx.owner, amount: 1 }] }] })
    const result = run(state, { op: 'ko', target: 'p2-t2' })

    expect(result.events.map(event => event.type)).toEqual(['CharacterKOd', 'EffectTriggered', 'CardDrawn'])
    expect(result.state.players.p2.hand).toHaveLength(state.players.p2.hand.length + 1)
    expect(result.state.effectQueue).toEqual([])

  })


  it('no hace nada si el objetivo ya no está en juego', () => {
    const state  = stage()
    const result = run(state, { op: 'ko', target: 'p2-t99' })

    expect(result.state).toEqual({ ...state, effectQueue: [] })
    expect(result.events).toEqual([])

  })

})


describe('primitivas rest y activate', () => {

  it('descansa y activa un Character', () => {
    const rested = run(stage(), { op: 'rest', target: 'p2-t2' })
    const active = run(rested.state, { op: 'activate', target: 'p2-t2' })

    expect(rested.state.players.p2.characters[0].rested).toBe(true)
    expect(active.state.players.p2.characters[0].rested).toBe(false)
    expect(rested.events).toEqual([{ type: 'CharacterRested', target: 'p2-t2' }])
    expect(active.events).toEqual([{ type: 'CharacterActivated', target: 'p2-t2' }])

  })


  it('descansa y activa un Leader', () => {
    const rested = run(stage(), { op: 'rest', target: 'p1-leader' })
    const active = run(rested.state, { op: 'activate', target: 'p1-leader' })

    expect(rested.state.players.p1.leaderRested).toBe(true)
    expect(active.state.players.p1.leaderRested).toBe(false)

  })


  it('no hace nada si el objetivo no existe', () => {
    expect(run(stage(), { op: 'rest', target: 'nadie' }).events).toEqual([])

  })

})


describe('primitiva search', () => {

  function deckWith(state: GameState): GameState {
    const deck = [card('p1', 'T-L02', 91), card('p1', 'T-C01', 92), card('p1', 'T-C02', 93), card('p1', 'T-C03', 94)]

    return withPlayer(state, 'p1', { deck })

  }


  it('toma la primera carta que cumple el tipo y manda el resto al fondo', () => {
    const state  = deckWith(stage())
    const result = run(state, { op: 'search', player: 'p1', amount: 3, type: 'Character' })
    const mine   = result.state.players.p1

    expect(mine.hand.at(-1)?.instanceId).toBe('p1-t92')
    expect(mine.deck.map(item => item.instanceId)).toEqual(['p1-t94', 'p1-t91', 'p1-t93'])
    expect(result.events).toEqual([{ type: 'CardSearched', player: 'p1', instanceId: 'p1-t92' }])
    expect(total(result.state, 'p1')).toBe(total(state, 'p1'))

  })


  it('sin carta que cumpla, la mano no cambia y las vistas van al fondo', () => {
    const state  = deckWith(stage())
    const result = run(state, { op: 'search', player: 'p1', amount: 2, type: 'Event' })

    expect(result.state.players.p1.hand).toEqual(state.players.p1.hand)
    expect(result.state.players.p1.deck.map(item => item.instanceId)).toEqual(['p1-t93', 'p1-t94', 'p1-t91', 'p1-t92'])
    expect(result.events).toEqual([])

  })

})


describe('primitiva toLife', () => {

  it('mueve una carta de la mano al tope de la Life', () => {
    const state  = withPlayer(stage(), 'p1', { hand: [card('p1', 'T-C01', 90)] })
    const result = run(state, { op: 'toLife', player: 'p1', instanceId: 'p1-t90' })
    const mine   = result.state.players.p1

    expect(mine.life[0].instanceId).toBe('p1-t90')
    expect(mine.life).toHaveLength(state.players.p1.life.length + 1)
    expect(mine.hand).toEqual([])
    expect(result.events).toEqual([{ type: 'CardToLife', player: 'p1', instanceId: 'p1-t90' }])

  })


  it('mueve el tope del mazo al tope de la Life', () => {
    const state  = stage()
    const top    = state.players.p1.deck[0]
    const result = run(state, { op: 'toLife', player: 'p1', instanceId: top.instanceId })

    expect(result.state.players.p1.life[0]).toEqual(top)
    expect(result.state.players.p1.deck).toEqual(state.players.p1.deck.slice(1))
    expect(total(result.state, 'p1')).toBe(total(state, 'p1'))

  })


  it('lanza error con una carta que no está en la mano ni en el tope', () => {
    const state = stage()

    expect(() => run(state, { op: 'toLife', player: 'p1', instanceId: state.players.p1.deck[1].instanceId })).toThrow(/ni en el tope del mazo/)

  })

})


describe('primitiva toHand', () => {

  it('mueve una carta de la Life a la mano', () => {
    const state  = stage()
    const life   = state.players.p1.life[2]
    const result = run(state, { op: 'toHand', player: 'p1', instanceId: life.instanceId })

    expect(result.state.players.p1.life).toHaveLength(state.players.p1.life.length - 1)
    expect(result.state.players.p1.hand.at(-1)).toEqual(life)
    expect(result.events).toEqual([{ type: 'CardToHand', player: 'p1', instanceId: life.instanceId }])

  })


  it('mueve una carta del trash a la mano', () => {
    const state  = withPlayer(stage(), 'p1', { trash: [card('p1', 'T-C01', 80)] })
    const result = run(state, { op: 'toHand', player: 'p1', instanceId: 'p1-t80' })

    expect(result.state.players.p1.trash).toEqual([])
    expect(result.state.players.p1.hand.at(-1)?.instanceId).toBe('p1-t80')

  })


  it('devuelve un Character a la mano y sus DON!! a rested', () => {
    const state  = stage()
    const result = run(state, { op: 'toHand', player: 'p1', instanceId: 'p1-t1' })
    const mine   = result.state.players.p1

    expect(mine.characters).toEqual([])
    expect(mine.hand.at(-1)?.instanceId).toBe('p1-t1')
    expect(mine.donRested).toBe(state.players.p1.donRested + 2)
    expect(total(result.state, 'p1')).toBe(total(state, 'p1'))

  })


  it('lanza error con una carta que no está en esas zonas', () => {
    expect(() => run(stage(), { op: 'toHand', player: 'p1', instanceId: 'nadie' })).toThrow(/no está en la Life/)

  })

})
