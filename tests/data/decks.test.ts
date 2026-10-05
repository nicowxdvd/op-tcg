import { describe, expect, it } from 'vitest'
import { effectRegistry, loadCards, loadDeck, loadDefs } from '../../src/data'
import { createGame, validateDeck } from '../../src/engine/state'

const DECK_IDS = ['st01', 'st02']

describe('mazos Starter Deck', () => {
  const defs = loadDefs()

  it.each(DECK_IDS)('%s cumple las reglas de mazo', id => {
    const deck = loadDeck(id)

    expect(defs[deck.leader].type).toBe('Leader')
    expect(deck.cards).toHaveLength(50)
    expect(() => validateDeck(defs, deck, 'p1')).not.toThrow()

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

})


describe('cargador', () => {
  it('convierte las 34 cartas de ST-01 y ST-02', () => {
    expect(loadCards()).toHaveLength(34)
    expect(Object.keys(loadDefs())).toHaveLength(34)

  })

})
