import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { newGame, other, pass, startGame, withPlayer } from './helpers'

describe('turno 1', () => {

  it('el primer jugador no roba y recibe 1 DON!!', () => {
    const state  = startGame()
    const player = state.players[state.first]

    expect(state.phase).toBe('main')
    expect(state.turn).toBe(1)
    expect(state.active).toBe(state.first)
    expect(player.hand).toHaveLength(5)
    expect(player.deck).toHaveLength(40)
    expect(player.donActive).toBe(1)
    expect(player.donDeck).toBe(9)

  })


  it('el rival todavía no tiene DON!! ni robó', () => {
    const state    = startGame()
    const opponent = state.players[other(state.first)]

    expect(opponent.hand).toHaveLength(5)
    expect(opponent.donActive).toBe(0)
    expect(opponent.donDeck).toBe(10)

  })

})


describe('secuencia de turnos', () => {

  it('turno 2: el segundo jugador roba 1 y recibe 2 DON!!', () => {
    const state  = pass(startGame()).state
    const player = state.players[state.active]

    expect(state.turn).toBe(2)
    expect(state.active).not.toBe(state.first)
    expect(state.phase).toBe('main')
    expect(player.hand).toHaveLength(6)
    expect(player.deck).toHaveLength(39)
    expect(player.donActive).toBe(2)
    expect(player.donDeck).toBe(8)

  })


  it('turno 3: el primer jugador roba 1 y suma 2 DON!! a su 1 anterior', () => {
    const state  = pass(pass(startGame()).state).state
    const player = state.players[state.first]

    expect(state.turn).toBe(3)
    expect(state.active).toBe(state.first)
    expect(player.hand).toHaveLength(6)
    expect(player.donActive).toBe(3)
    expect(player.donDeck).toBe(7)

  })


  it('cada jugador roba la carta del tope del mazo', () => {
    const start = startGame()
    const top   = start.players[start.first].deck[0]
    const turn3 = pass(pass(start).state).state

    expect(turn3.players[start.first].hand.at(-1)).toEqual(top)

  })


  it('el DON!! no supera 10 por jugador', () => {
    let state = startGame()

    for (let i = 0; i < 20; i++) {
      state = pass(state).state

      for (const id of ['p1', 'p2'] as const) {
        const player = state.players[id]

        expect(player.donDeck).toBeGreaterThanOrEqual(0)
        expect(player.donDeck + player.donActive + player.donRested).toBe(10)
      }
    }

    expect(state.players.p1.donActive).toBe(10)
    expect(state.players.p2.donActive).toBe(10)

  })


  it('el primer jugador llega a 10 DON!! en su turno 11 con solo 1 disponible', () => {
    let state = startGame()

    for (let i = 0; i < 10; i++)
      state = pass(state).state

    expect(state.turn).toBe(11)
    expect(state.active).toBe(state.first)
    expect(state.players[state.first].donActive).toBe(10)
    expect(state.players[state.first].donDeck).toBe(0)

  })


  it('PassPhase emite el cierre del turno y las fases del siguiente', () => {
    const events = pass(startGame()).events

    expect(events.map(event => event.type)).toEqual(['PhaseChanged', 'PhaseChanged', 'PhaseChanged', 'CardDrawn', 'PhaseChanged', 'DonAdded', 'PhaseChanged'])
    expect(events.filter(event => event.type === 'PhaseChanged').map(event => event.type === 'PhaseChanged' && event.phase)).toEqual(['end', 'refresh', 'draw', 'don', 'main'])

  })

})


describe('refresh', () => {

  it('devuelve a donActive el DON!! descansado y el adjunto, y activa Leader y Characters', () => {
    const start  = startGame()
    const id     = start.first
    const card   = start.players[id].hand[0]
    const staged = withPlayer(start, id, { donActive: 0, donRested: 2, leaderRested: true, leaderAttachedDon: 1, characters: [{ card, rested: true, attachedDon: 2, playedTurn: 1 }] })
    const after  = pass(pass(staged).state).state
    const result = after.players[id]

    expect(after.turn).toBe(3)
    expect(result.donActive).toBe(7)
    expect(result.donRested).toBe(0)
    expect(result.leaderAttachedDon).toBe(0)
    expect(result.leaderRested).toBe(false)
    expect(result.characters[0].rested).toBe(false)
    expect(result.characters[0].attachedDon).toBe(0)

  })

})


describe('mazo vacío', () => {

  it('robar con el mazo vacío deja al rival como ganador y la fase en gameOver', () => {
    const start  = startGame()
    const id     = start.first
    const after  = pass(pass(withPlayer(start, id, { deck: [] })).state)

    expect(after.state.phase).toBe('gameOver')
    expect(after.state.winner).toBe(other(id))
    expect(after.events.at(-1)).toEqual({ type: 'GameOver', winner: other(id) })
    expect(after.state.players[id].donActive).toBe(start.players[id].donActive)

  })


  it('el segundo jugador también pierde si no puede robar en su turno 2', () => {
    const start = startGame()
    const after = pass(withPlayer(start, other(start.first), { deck: [] })).state

    expect(after.phase).toBe('gameOver')
    expect(after.winner).toBe(start.first)

  })


  it('el primer jugador con mazo vacío no pierde en el turno 1 porque no roba', () => {
    const created = newGame()
    const first   = created.first
    const staged  = withPlayer(created, first, { deck: [] })
    const decided = apply(staged, { type: 'Mulligan', player: first, redraw: false }).state
    const started = apply(decided, { type: 'Mulligan', player: other(first), redraw: false }).state

    expect(started.winner).toBeNull()

  })

})


describe('PassPhase', () => {

  it('rechaza pasar fuera del turno del jugador', () => {
    const state = startGame()

    expect(() => apply(state, { type: 'PassPhase', player: other(state.active) })).toThrow(/No es el turno/)

  })


  it('rechaza pasar fuera de la fase main', () => {
    const created = newGame()

    expect(() => apply(created, { type: 'PassPhase', player: created.active })).toThrow(/fase main/)

  })


  it('rechaza pasar con la partida terminada', () => {
    const start = startGame()
    const over  = pass(withPlayer(start, other(start.first), { deck: [] })).state

    expect(() => apply(over, { type: 'PassPhase', player: over.active })).toThrow(/fase main/)

  })


  it('no muta el estado recibido', () => {
    const state = startGame()
    const copy  = structuredClone(state)

    pass(state)

    expect(state).toEqual(copy)

  })

})
