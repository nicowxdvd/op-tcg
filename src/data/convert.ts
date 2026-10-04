import type { CardDef, CardType, Keyword } from '../engine/types'
import type { ApiCard } from './apiTypes'

const CARD_TYPES: CardType[] = ['Leader', 'Character', 'Event', 'Stage']
const KEYWORD_TAGS: Record<string, Keyword> = { 'Rush': 'Rush', 'Blocker': 'Blocker', 'Double Attack': 'DoubleAttack', 'Banish': 'Banish' }
const LEADING_KEYWORD = /^\s*\[(Rush|Blocker|Double Attack|Banish)\](?:\s*\([^)]*\))?/


function toNumber(id: string, field: string, value: string | number | null): number {
  if (value === null || value === '')
    return 0

  const parsed = Number(value)

  if (Number.isNaN(parsed))
    throw new Error(`${id}: el campo ${field} no es numérico (${value})`)

  return parsed

}


function toType(id: string, value: string): CardType {
  if (!CARD_TYPES.includes(value as CardType))
    throw new Error(`${id}: tipo de carta desconocido (${value})`)

  return value as CardType

}


export function keywordsFromText(text: string | null): Keyword[] {
  const keywords: Keyword[] = []
  let rest = text ?? ''
  let match = LEADING_KEYWORD.exec(rest)

  while (match) {
    keywords.push(KEYWORD_TAGS[match[1]])
    rest  = rest.slice(match[0].length)
    match = LEADING_KEYWORD.exec(rest)

  }

  return keywords

}


export function cardFromApi(card: ApiCard): CardDef {
  const id = card.card_set_id

  return {
    id,
    name: card.card_name,
    type: toType(id, card.card_type),
    cost: toNumber(id, 'card_cost', card.card_cost),
    power: toNumber(id, 'card_power', card.card_power),
    counter: toNumber(id, 'counter_amount', card.counter_amount),
    life: toNumber(id, 'life', card.life),
    colors: card.card_color.split('/').map(color => color.trim()),
    keywords: keywordsFromText(card.card_text),
  }

}
