import type { CardDef } from '../engine/types'
import type { DeckConfig } from '../engine/state'
import type { DeckFile, StoredCard } from './apiTypes'
import { cardFromApi } from './convert'
import ST01 from './cards/ST01.json'
import ST02 from './cards/ST02.json'
import st01 from './decks/st01.json'
import st02 from './decks/st02.json'

const DECKS: Record<string, DeckFile> = { st01, st02 }


export function loadCards(): StoredCard[] {
  return [...ST01, ...ST02] as StoredCard[]

}


export function loadDefs(): Record<string, CardDef> {
  return Object.fromEntries(loadCards().map(card => [card.card_set_id, cardFromApi(card)]))

}


export function loadDeck(id: string): DeckConfig {
  const deck = DECKS[id]

  if (!deck)
    throw new Error(`Mazo desconocido (${id})`)

  return { leader: deck.leader, cards: deck.cards.flatMap(card => Array<string>(card.count).fill(card.id)) }

}
