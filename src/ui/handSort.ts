import type { CardView } from './CardSprite'

export type HandSort = 'original' | 'cost' | 'counter'

export const HAND_SORTS: HandSort[] = ['original', 'cost', 'counter']

export const HAND_SORT_LABELS: Record<HandSort, string> = { original: 'Original', cost: 'Coste', counter: 'Counter' }


export function nextHandSort(sort: HandSort): HandSort {
  return HAND_SORTS[(HAND_SORTS.indexOf(sort) + 1) % HAND_SORTS.length]
}


export function sortHand(cards: CardView[], sort: HandSort): CardView[] {
  if (sort === 'cost')
    return [...cards].sort((a, b) => (a.def?.cost ?? 0) - (b.def?.cost ?? 0))

  if (sort === 'counter')
    return [...cards].sort((a, b) => (b.def?.counter ?? 0) - (a.def?.counter ?? 0))

  return cards

}
