import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { card, inPlay, other, pass, startGame, withPlayer } from './helpers'
import type { GameState, PlayerState } from '../../src/engine/types'

function stage(donActive = 3): GameState {
  const start = startGame()
  const id    = start.first

  return withPlayer(start, id, { donActive, characters: [inPlay(card(id, 'T-C02', 1))] })

}


function totalDon(player: PlayerState): number {
  return player.donDeck + player.donActive + player.donRested + player.leaderAttachedDon + player.characters.reduce((sum, c) => sum + c.attachedDon, 0)

}


describe('AttachDon', () => {

  it('adjunta 1 DON!! activo al Leader', () => {
    const state  = stage()
    const id     = state.first
    const result = apply(state, { type: 'AttachDon', player: id, target: 'leader' })
    const player = result.state.players[id]

    expect(player.donActive).toBe(2)
    expect(player.leaderAttachedDon).toBe(1)
    expect(result.events).toEqual([{ type: 'DonAttached', player: id, target: 'leader' }])

  })


  it('adjunta 1 DON!! activo a un Character en juego', () => {
    const state  = stage()
    const id     = state.first
    const player = apply(state, { type: 'AttachDon', player: id, target: `${id}-t1` }).state.players[id]

    expect(player.donActive).toBe(2)
    expect(player.characters[0].attachedDon).toBe(1)
    expect(player.leaderAttachedDon).toBe(0)

  })


  it('acumula varios DON!! sobre el mismo objetivo', () => {
    const state = stage()
    const id    = state.first
    const first = apply(state, { type: 'AttachDon', player: id, target: 'leader' }).state
    const last  = apply(first, { type: 'AttachDon', player: id, target: 'leader' }).state

    expect(last.players[id].leaderAttachedDon).toBe(2)
    expect(last.players[id].donActive).toBe(1)

  })


  it('conserva el total de DON!!', () => {
    const state = stage()
    const id    = state.first
    const after = apply(state, { type: 'AttachDon', player: id, target: `${id}-t1` }).state

    expect(totalDon(after.players[id])).toBe(totalDon(state.players[id]))

  })


  it('falla sin DON!! activo', () => {
    const state = stage(0)

    expect(() => apply(state, { type: 'AttachDon', player: state.first, target: 'leader' })).toThrow(/No hay DON!! activo/)

  })


  it('falla si el Character no está en juego', () => {
    const state = stage()

    expect(() => apply(state, { type: 'AttachDon', player: state.first, target: 'p1-zzz' })).toThrow(/no está en juego/)

  })


  it('falla fuera de la fase main', () => {
    const state = { ...stage(), phase: 'don' as const }

    expect(() => apply(state, { type: 'AttachDon', player: state.first, target: 'leader' })).toThrow(/fase main/)

  })


  it('falla fuera del turno del jugador', () => {
    const state  = stage()
    const id     = other(state.first)
    const staged = withPlayer(state, id, { donActive: 2 })

    expect(() => apply(staged, { type: 'AttachDon', player: id, target: 'leader' })).toThrow(/No es el turno/)

  })


  it('el DON!! adjunto vuelve a donActive en el siguiente Refresh del dueño', () => {
    const state  = stage(1)
    const id     = state.first
    const hooked = apply(state, { type: 'AttachDon', player: id, target: 'leader' }).state
    const turn3  = pass(pass(hooked).state).state
    const player = turn3.players[id]

    expect(player.leaderAttachedDon).toBe(0)
    expect(player.donActive).toBe(3)

  })


  it('no muta el estado recibido', () => {
    const state = stage()
    const copy  = structuredClone(state)

    apply(state, { type: 'AttachDon', player: state.first, target: 'leader' })

    expect(state).toEqual(copy)

  })

})
