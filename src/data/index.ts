import type { CardDef } from '../engine/types'
import type { DeckConfig } from '../engine/state'
import type { DeckFile, StoredCard } from './apiTypes'
import { effectRegistry } from '../engine/effects/cards'
import { cardFromApi } from './convert'
import OP15 from './cards/OP15.json'
import OP17 from './cards/OP17.json'
import ST01 from './cards/ST01.json'
import ST02 from './cards/ST02.json'
import ST14 from './cards/ST14.json'
import luffy from './decks/luffy.json'
import st01 from './decks/st01.json'
import st02 from './decks/st02.json'
import xebec from './decks/xebec.json'

const DECKS: Record<string, DeckFile> = { st01, st02, xebec, luffy }

export { effectRegistry }


export function loadCards(): StoredCard[] {
  return [...ST01, ...ST02, ...OP15, ...OP17, ...ST14] as StoredCard[]

}


export function loadDefs(): Record<string, CardDef> {
  return Object.fromEntries(loadCards().map(card => [card.card_set_id, cardFromApi(card)]))

}


export interface DeckSummary {
  id: string
  name: string
  leader: string

}


export function listDecks(): DeckSummary[] {
  return Object.values(DECKS).map(({ id, name, leader }) => ({ id, name, leader }))

}


export function loadDeck(id: string): DeckConfig {
  const deck = DECKS[id]

  if (!deck)
    throw new Error(`Mazo desconocido (${id})`)

  return { leader: deck.leader, cards: deck.cards.flatMap(card => Array<string>(card.count).fill(card.id)) }

}
