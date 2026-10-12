import { describe, expect, it } from 'vitest'
import { effectRegistry, listDecks, loadCards, loadDeck, loadDefs } from '../../src/data'
import { createGame, validateDeck } from '../../src/engine/state'

const DECK_IDS = ['st01', 'st02', 'xebec', 'luffy']

describe('mazos del lobby', () => {
  const defs = loadDefs()

  it.each(DECK_IDS)('%s cumple las reglas de mazo', id => {
    const deck = loadDeck(id)

    expect(defs[deck.leader].type).toBe('Leader')
    expect(deck.cards).toHaveLength(50)
    expect(() => validateDeck(defs, deck, 'p1')).not.toThrow()

  })


  it('listDecks lista los mazos con su Leader', () => {
    expect(listDecks().map(deck => deck.id)).toEqual(DECK_IDS)
    expect(listDecks().every(deck => deck.name && defs[deck.leader].type === 'Leader')).toBe(true)

  })


  it('loadDeck falla con un mazo desconocido', () => {
    expect(() => loadDeck('st99')).toThrow('st99')

  })


  it('createGame with the effect registry keeps it in the state', () => {
    const state = createGame({ seed: 1, defs, decks: { p1: loadDeck('st01'), p2: loadDeck('st02') }, effects: effectRegistry })

    expect(state.effects).toBe(effectRegistry)

  })


  it('createGame acepta st01 contra st02 sin red', () => {
    expect(() => createGame({ seed: 1, defs, decks: { p1: loadDeck('st01'), p2: loadDeck('st02') } })).not.toThrow()

  })


  it('createGame acepta xebec contra luffy con el registro de efectos', () => {
    expect(() => createGame({ seed: 1, defs, decks: { p1: loadDeck('xebec'), p2: loadDeck('luffy') }, effects: effectRegistry })).not.toThrow()

  })

})


describe('cargador', () => {
  it('convierte las 63 cartas de ST-01, ST-02 y los mazos OP17', () => {
    expect(loadCards()).toHaveLength(63)
    expect(Object.keys(loadDefs())).toHaveLength(63)

  })


  it('los nombres de las cartas OP17 no llevan el número de la API', () => {
    const defs = loadDefs()

    expect(Object.values(defs).filter(def => /\(\d{3}\)/.test(def.name))).toEqual([])
    expect(defs['OP17-039'].name).toBe('Rocks.D.Xebec')

  })

})
