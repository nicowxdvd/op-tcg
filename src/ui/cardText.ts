import { loadCards } from '../data'

const TEXTS = new Map(loadCards().map(card => [card.card_set_id, card.card_text ?? '']))


export function cardText(defId: string): string {
  return TEXTS.get(defId) ?? ''

}
