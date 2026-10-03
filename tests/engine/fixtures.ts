import type { CardDef } from '../../src/engine/types'

export const LEADER_ID       = 'T-L01'
export const OTHER_LEADER_ID = 'T-L02'
export const FOREIGN_ID      = 'T-X01'

export const leaderDef       : CardDef = { id: LEADER_ID, name: 'Leader Rojo', type: 'Leader', cost: 0, power: 5000, counter: 0, life: 5, colors: ['Red'], keywords: [] }
export const otherLeaderDef  : CardDef = { id: OTHER_LEADER_ID, name: 'Leader Verde', type: 'Leader', cost: 0, power: 5000, counter: 0, life: 4, colors: ['Green'], keywords: [] }
export const foreignColorDef : CardDef = { id: FOREIGN_ID, name: 'Personaje Verde', type: 'Character', cost: 2, power: 3000, counter: 1000, life: 0, colors: ['Green'], keywords: [] }

export const characterDefs: CardDef[] = Array.from({ length: 13 }, (_, i) => ({ id: `T-C${String(i + 1).padStart(2, '0')}`, name: `Personaje ${i + 1}`, type: 'Character' as const, cost: i % 6, power: 2000 + (i % 6) * 1000, counter: i % 2 ? 1000 : 2000, life: 0, colors: ['Red'], keywords: [] }))

export const defs: Record<string, CardDef> = Object.fromEntries([leaderDef, otherLeaderDef, foreignColorDef, ...characterDefs].map(def => [def.id, def]))

export function buildDeck(): string[] {
  const ids = characterDefs.map(def => def.id)

  return Array.from({ length: 50 }, (_, i) => ids[i % ids.length])

}


export function buildDeckWith(overrides: Record<number, string>): string[] {
  const deck = buildDeck()

  for (const [index, id] of Object.entries(overrides))
    deck[Number(index)] = id

  return deck

}
