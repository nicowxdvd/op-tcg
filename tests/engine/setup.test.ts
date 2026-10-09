import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { getLegalActions } from '../../src/engine/queries'
import { createGame, type GameConfig } from '../../src/engine/state'
import { buildDeck, buildDeckWith, defs, FOREIGN_ID, LEADER_ID, OTHER_LEADER_ID } from './fixtures'

function makeConfig(seed = 1, p1Cards = buildDeck(), p2Cards = buildDeck()): GameConfig {
  return { seed, defs, decks: { p1: { leader: LEADER_ID, cards: p1Cards }, p2: { leader: LEADER_ID, cards: p2Cards } } }

}


function chosen(config: GameConfig) {
  const state = createGame(config)

  return apply(state, { type: 'ChooseFirst', player: state.rollWinner, goFirst: true }).state

}


describe('createGame: validación de mazos', () => {

  it('acepta un mazo válido', () => {
    expect(() => createGame(makeConfig())).not.toThrow()

  })


  it('rechaza un mazo de 49 cartas', () => {
    expect(() => createGame(makeConfig(1, buildDeck().slice(1)))).toThrow(/49 cartas/)

  })


  it('rechaza un mazo de 51 cartas', () => {
    expect(() => createGame(makeConfig(1, buildDeck(), [...buildDeck(), 'T-C01']))).toThrow(/51 cartas/)

  })


  it('rechaza 5 copias de una carta', () => {
    expect(() => createGame(makeConfig(1, buildDeckWith({ 1: 'T-C01' })))).toThrow(/más de 4 copias de T-C01/)

  })


  it('rechaza una carta de color ajeno al Leader', () => {
    expect(() => createGame(makeConfig(1, buildDeckWith({ 0: FOREIGN_ID })))).toThrow(/color/)

  })


  it('rechaza un Leader dentro de las 50 cartas', () => {
    expect(() => createGame(makeConfig(1, buildDeckWith({ 0: LEADER_ID })))).toThrow(/Leaders/)

  })


  it('rechaza una carta desconocida', () => {
    expect(() => createGame(makeConfig(1, buildDeckWith({ 0: 'T-ZZZ' })))).toThrow(/desconocida/)

  })


  it('rechaza un Leader inexistente o que no es Leader', () => {
    const missing = makeConfig()
    const wrong   = makeConfig()

    missing.decks.p1.leader = 'T-ZZZ'
    wrong.decks.p2.leader   = 'T-C01'

    expect(() => createGame(missing)).toThrow(/Leader inválido/)
    expect(() => createGame(wrong)).toThrow(/Leader inválido/)

  })


  it('indica qué jugador tiene el mazo inválido', () => {
    expect(() => createGame(makeConfig(1, buildDeck(), buildDeck().slice(1)))).toThrow(/^p2:/)

  })


  it('rechaza un mazo cuyas cartas no coinciden con el color de su Leader', () => {
    const config = makeConfig()

    config.decks.p2.leader = OTHER_LEADER_ID

    expect(() => createGame(config)).toThrow(/p2: la carta .* no comparte color/)

  })

})


describe('createGame: estado inicial', () => {

  it('deja la partida en fase startRoll, turno 1 y sin ganador', () => {
    const state = createGame(makeConfig())

    expect(state.phase).toBe('startRoll')
    expect(state.turn).toBe(1)
    expect(state.winner).toBeNull()
    expect(state.active).toBe(state.first)

  })


  it('reparte 5 cartas de mano y deja 45 en el mazo', () => {
    const state = createGame(makeConfig())

    for (const id of ['p1', 'p2'] as const) {
      expect(state.players[id].hand).toHaveLength(5)
      expect(state.players[id].deck).toHaveLength(45)
      expect(state.players[id].life).toHaveLength(0)
    }

  })


  it('deja los 10 DON!! en el mazo de DON!! y el mulligan pendiente', () => {
    const state = createGame(makeConfig())

    for (const id of ['p1', 'p2'] as const) {
      expect(state.players[id].donDeck).toBe(10)
      expect(state.players[id].donActive).toBe(0)
      expect(state.players[id].donRested).toBe(0)
      expect(state.players[id].mulliganDone).toBe(false)
    }

  })


  it('asigna instanceId únicos y dueño correcto', () => {
    const state = createGame(makeConfig())

    for (const id of ['p1', 'p2'] as const) {
      const player = state.players[id]
      const cards  = [...player.hand, ...player.deck]
      const ids    = new Set(cards.map(card => card.instanceId))

      expect(ids.size).toBe(50)
      expect(cards.every(card => card.owner === id)).toBe(true)
      expect(player.leader.defId).toBe(LEADER_ID)
    }

  })


  it('con la misma seed produce el mismo primer jugador y las mismas manos', () => {
    const a = createGame(makeConfig(77))
    const b = createGame(makeConfig(77))

    expect(a.first).toBe(b.first)
    expect(a.dice).toEqual(b.dice)
    expect(a.players.p1.hand).toEqual(b.players.p1.hand)
    expect(a.players.p2.hand).toEqual(b.players.p2.hand)
    expect(a).toEqual(b)

  })


  it('con seeds distintas aparecen ambos primeros jugadores y manos distintas', () => {
    const states = Array.from({ length: 20 }, (_, seed) => createGame(makeConfig(seed)))
    const firsts = new Set(states.map(state => state.rollWinner))
    const hands  = new Set(states.map(state => state.players.p1.hand.map(card => card.instanceId).join()))

    expect(firsts).toEqual(new Set(['p1', 'p2']))
    expect(hands.size).toBeGreaterThan(1)

  })


  it('baraja el mazo: el orden no coincide con la lista original', () => {
    const state = createGame(makeConfig(3))
    const order = [...state.players.p1.hand, ...state.players.p1.deck].map(card => card.instanceId)
    const raw   = buildDeck().map((_, i) => `p1-${i}`)

    expect(order).not.toEqual(raw)
    expect([...order].sort()).toEqual([...raw].sort())

  })


  it('no muta la configuración recibida', () => {
    const config = makeConfig()
    const copy   = structuredClone(config)

    createGame(config)

    expect(config).toEqual(copy)

  })

})


describe('sorteo de inicio', () => {

  it('lanza un dado de 1 a 6 por jugador, distintos, y gana el mayor', () => {
    for (let seed = 0; seed < 30; seed++) {
      const state = createGame(makeConfig(seed))
      const { p1, p2 } = state.dice

      expect(p1).toBeGreaterThanOrEqual(1)
      expect(p1).toBeLessThanOrEqual(6)
      expect(p2).toBeGreaterThanOrEqual(1)
      expect(p2).toBeLessThanOrEqual(6)
      expect(p1).not.toBe(p2)
      expect(state.rollWinner).toBe(p1 > p2 ? 'p1' : 'p2')
    }

  })


  it('solo el ganador tiene acciones legales y puede elegir', () => {
    const state = createGame(makeConfig(5))
    const loser = state.rollWinner === 'p1' ? 'p2' : 'p1'

    expect(getLegalActions(state, state.rollWinner).map(action => action.type)).toEqual(['ChooseFirst', 'ChooseFirst'])
    expect(getLegalActions(state, loser)).toEqual([])
    expect(() => apply(state, { type: 'ChooseFirst', player: loser, goFirst: true })).toThrow(/Le toca elegir/)

  })


  it('elegir primero o segundo fija quién empieza y pasa a mulligan', () => {
    const state  = createGame(makeConfig(5))
    const winner = state.rollWinner
    const loser  = winner === 'p1' ? 'p2' : 'p1'
    const first  = apply(state, { type: 'ChooseFirst', player: winner, goFirst: true })
    const second = apply(state, { type: 'ChooseFirst', player: winner, goFirst: false })

    expect(first.state.first).toBe(winner)
    expect(first.state.active).toBe(winner)
    expect(first.state.phase).toBe('mulligan')
    expect(first.events).toEqual([{ type: 'FirstChosen', player: winner, first: winner }])
    expect(second.state.first).toBe(loser)
    expect(second.state.active).toBe(loser)
    expect(second.events).toEqual([{ type: 'FirstChosen', player: winner, first: loser }])

  })


  it('rechaza elegir fuera de la fase startRoll', () => {
    const state = chosen(makeConfig(5))

    expect(() => apply(state, { type: 'ChooseFirst', player: state.rollWinner, goFirst: true })).toThrow(/startRoll/)

  })

})


describe('mulligan', () => {
  const ids = (cards: { instanceId: string }[]) => cards.map(card => card.instanceId)

  it('conservar deja la mano igual y marca la decisión', () => {
    const state  = chosen(makeConfig(5))
    const result = apply(state, { type: 'Mulligan', player: state.first, redraw: false })
    const player = result.state.players[state.first]

    expect(ids(player.hand)).toEqual(ids(state.players[state.first].hand))
    expect(player.mulliganDone).toBe(true)
    expect(result.state.phase).toBe('mulligan')
    expect(result.events).toEqual([{ type: 'MulliganDecided', player: state.first, redraw: false }])

  })


  it('rehacer devuelve la mano, baraja y roba 5 sin perder cartas', () => {
    const state  = chosen(makeConfig(5))
    const before = state.players[state.first]
    const result = apply(state, { type: 'Mulligan', player: state.first, redraw: true })
    const after  = result.state.players[state.first]

    expect(after.hand).toHaveLength(5)
    expect(after.deck).toHaveLength(45)
    expect(ids(after.hand)).not.toEqual(ids(before.hand))
    expect(ids([...after.hand, ...after.deck]).sort()).toEqual(ids([...before.hand, ...before.deck]).sort())
    expect(result.state.seed).not.toBe(state.seed)

  })


  it('decide primero el primer jugador y después el rival', () => {
    const state  = chosen(makeConfig(5))
    const second = state.first === 'p1' ? 'p2' : 'p1'

    expect(() => apply(state, { type: 'Mulligan', player: second, redraw: false })).toThrow(/Le toca decidir/)

    const afterFirst = apply(state, { type: 'Mulligan', player: state.first, redraw: false }).state

    expect(() => apply(afterFirst, { type: 'Mulligan', player: state.first, redraw: false })).toThrow(/Le toca decidir/)
    expect(() => apply(afterFirst, { type: 'Mulligan', player: second, redraw: false })).not.toThrow()

  })


  it('rechaza el mulligan fuera de la fase mulligan', () => {
    const state = chosen(makeConfig(5))
    const first = apply(state, { type: 'Mulligan', player: state.first, redraw: false }).state
    const done  = apply(first, { type: 'Mulligan', player: state.first === 'p1' ? 'p2' : 'p1', redraw: true }).state

    expect(() => apply(done, { type: 'Mulligan', player: done.first, redraw: false })).toThrow(/fase mulligan/)

  })


  it('al decidir ambos coloca Life igual a leader.life y empieza el turno 1', () => {
    const state  = chosen(makeConfig(9))
    const second = state.first === 'p1' ? 'p2' : 'p1'
    const first  = apply(state, { type: 'Mulligan', player: state.first, redraw: true }).state
    const result = apply(first, { type: 'Mulligan', player: second, redraw: false })

    for (const id of ['p1', 'p2'] as const) {
      expect(result.state.players[id].life).toHaveLength(5)
      expect(result.state.players[id].hand).toHaveLength(5)
      expect(result.state.players[id].deck).toHaveLength(40)
    }

    expect(result.state.turn).toBe(1)
    expect(result.state.active).toBe(state.first)
    expect(result.state.phase).toBe('main')
    expect(result.events.map(event => event.type)).toEqual(['MulliganDecided', 'GameStarted', 'PhaseChanged', 'PhaseChanged', 'PhaseChanged', 'DonAdded', 'PhaseChanged'])

  })


  it('la Life sale del tope del mazo y no repite cartas', () => {
    const state  = chosen(makeConfig(9))
    const second = state.first === 'p1' ? 'p2' : 'p1'
    const first  = apply(state, { type: 'Mulligan', player: state.first, redraw: false }).state
    const result = apply(first, { type: 'Mulligan', player: second, redraw: false }).state
    const player = result.players.p1
    const before = state.players.p1

    expect(ids(player.life)).toEqual(ids(before.deck.slice(0, 5)))
    expect(ids([...player.hand, ...player.life, ...player.deck]).sort()).toEqual(ids([...before.hand, ...before.deck]).sort())

  })


  it('no muta el estado recibido', () => {
    const state = chosen(makeConfig(5))
    const copy  = structuredClone(state)

    apply(state, { type: 'Mulligan', player: state.first, redraw: true })

    expect(state).toEqual(copy)

  })

})
