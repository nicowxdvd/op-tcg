import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { LEADER_ID } from './fixtures'
import { card, inPlay, other, startGame, withPlayer } from './helpers'
import type { GameState } from '../../src/engine/types'

function stage(donActive: number): GameState {
  const start = startGame()
  const id    = start.first

  return withPlayer(start, id, { donActive, hand: [card(id, 'T-C04', 1), card(id, 'T-C01', 2), card(id, 'T-C06', 3), card(id, LEADER_ID, 4)], characters: [] })

}


function fullBoard(): GameState {
  const state = stage(10)
  const id    = state.first
  const board = [1, 2, 3, 4, 5].map(n => inPlay(card(id, 'T-C02', 10 + n), 1, n === 3 ? 2 : 0))

  return withPlayer(state, id, { characters: board })

}


describe('PlayCharacter', () => {

  it('mueve la carta de la mano a characters y descansa exactamente cost DON!!', () => {
    const state  = stage(5)
    const id     = state.first
    const result = apply(state, { type: 'PlayCharacter', player: id, instanceId: `${id}-t1` })
    const player = result.state.players[id]

    expect(player.donActive).toBe(2)
    expect(player.donRested).toBe(3)
    expect(player.hand.map(c => c.instanceId)).toEqual([`${id}-t2`, `${id}-t3`, `${id}-t4`])
    expect(player.characters).toEqual([{ card: card(id, 'T-C04', 1), rested: false, attachedDon: 0, playedTurn: 1 }])
    expect(result.events).toEqual([{ type: 'CharacterPlayed', player: id, instanceId: `${id}-t1` }])

  })


  it('un Character de cost 0 entra sin gastar DON!!', () => {
    const state  = stage(0)
    const id     = state.first
    const player = apply(state, { type: 'PlayCharacter', player: id, instanceId: `${id}-t2` }).state.players[id]

    expect(player.characters).toHaveLength(1)
    expect(player.donActive).toBe(0)
    expect(player.donRested).toBe(0)

  })


  it('registra el turno en que entra el Character', () => {
    const state = stage(5)
    const id    = state.first
    const later = { ...state, turn: 7 }
    const entry = apply(later, { type: 'PlayCharacter', player: id, instanceId: `${id}-t1` }).state.players[id].characters[0]

    expect(entry.playedTurn).toBe(7)

  })


  it('falla con DON!! insuficiente', () => {
    const state = stage(2)
    const id    = state.first

    expect(() => apply(state, { type: 'PlayCharacter', player: id, instanceId: `${id}-t1` })).toThrow(/DON!! insuficiente/)

  })


  it('juega con el DON!! justo', () => {
    const state = stage(3)
    const id    = state.first

    expect(() => apply(state, { type: 'PlayCharacter', player: id, instanceId: `${id}-t1` })).not.toThrow()

  })


  it('falla fuera de la fase main', () => {
    const state = { ...stage(5), phase: 'draw' as const }
    const id    = state.first

    expect(() => apply(state, { type: 'PlayCharacter', player: id, instanceId: `${id}-t1` })).toThrow(/fase main/)

  })


  it('falla fuera del turno del jugador', () => {
    const state = stage(5)
    const id    = other(state.first)
    const staged = withPlayer(state, id, { donActive: 5, hand: [card(id, 'T-C04', 1)] })

    expect(() => apply(staged, { type: 'PlayCharacter', player: id, instanceId: `${id}-t1` })).toThrow(/No es el turno/)

  })


  it('falla si la carta no está en la mano', () => {
    const state = stage(5)

    expect(() => apply(state, { type: 'PlayCharacter', player: state.first, instanceId: 'p1-zzz' })).toThrow(/no está en la mano/)

  })


  it('falla si la carta no es un Character', () => {
    const state = stage(5)
    const id    = state.first

    expect(() => apply(state, { type: 'PlayCharacter', player: id, instanceId: `${id}-t4` })).toThrow(/no es un Character/)

  })


  it('con menos de 5 Characters no admite replaceId', () => {
    const state = stage(5)
    const id    = state.first

    expect(() => apply(state, { type: 'PlayCharacter', player: id, instanceId: `${id}-t1`, replaceId: 'x' })).toThrow(/Solo se reemplaza/)

  })


  it('con 5 Characters, jugar el sexto sin replaceId falla', () => {
    const state = fullBoard()
    const id    = state.first

    expect(() => apply(state, { type: 'PlayCharacter', player: id, instanceId: `${id}-t1` })).toThrow(/elegir uno para reemplazar/)

  })


  it('con 5 Characters, un replaceId que no está en juego falla', () => {
    const state = fullBoard()
    const id    = state.first

    expect(() => apply(state, { type: 'PlayCharacter', player: id, instanceId: `${id}-t1`, replaceId: `${id}-t99` })).toThrow(/no está en juego/)

  })


  it('con 5 Characters y replaceId válido, el reemplazado va al trash y quedan 5', () => {
    const state    = fullBoard()
    const id       = state.first
    const replaced = `${id}-t11`
    const result   = apply(state, { type: 'PlayCharacter', player: id, instanceId: `${id}-t1`, replaceId: replaced })
    const player   = result.state.players[id]

    expect(player.characters).toHaveLength(5)
    expect(player.characters.map(c => c.card.instanceId)).not.toContain(replaced)
    expect(player.characters.map(c => c.card.instanceId)).toContain(`${id}-t1`)
    expect(player.trash.map(c => c.instanceId)).toEqual([replaced])
    expect(result.events.map(event => event.type)).toEqual(['CharacterTrashed', 'CharacterPlayed'])

  })


  it('el DON!! adjunto al Character reemplazado vuelve descansado', () => {
    const state  = fullBoard()
    const id     = state.first
    const result = apply(state, { type: 'PlayCharacter', player: id, instanceId: `${id}-t1`, replaceId: `${id}-t13` })
    const player = result.state.players[id]

    expect(player.donActive).toBe(7)
    expect(player.donRested).toBe(3 + 2 + state.players[id].donRested)

  })


  it('no muta el estado recibido', () => {
    const state = fullBoard()
    const id    = state.first
    const copy  = structuredClone(state)

    apply(state, { type: 'PlayCharacter', player: id, instanceId: `${id}-t1`, replaceId: `${id}-t11` })

    expect(state).toEqual(copy)

  })

})
