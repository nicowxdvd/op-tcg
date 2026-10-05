import { describe, expect, it } from 'vitest'
import { loadCards, loadDeck } from '../../../src/data'
import { effectRegistry } from '../../../src/engine/effects/cards'

const DECK_IDS = ['st01', 'st02']

describe('effect registry coverage', () => {

  it('every card in the ST01 and ST02 decks has a registry entry', () => {
    const ids     = [...new Set(DECK_IDS.flatMap(id => { const deck = loadDeck(id); return [deck.leader, ...deck.cards] }))]
    const missing = ids.filter(id => !(id in effectRegistry))

    expect(missing).toEqual([])

  })


  it('every registry entry matches a card in the JSON data', () => {
    const known   = new Set(loadCards().map(card => card.card_set_id))
    const unknown = Object.keys(effectRegistry).filter(id => !known.has(id))

    expect(unknown).toEqual([])

  })

})
