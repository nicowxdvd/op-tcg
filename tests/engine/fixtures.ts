import type { CardDef } from '../../src/engine/types'

export const LEADER_ID       = 'T-L01'
export const OTHER_LEADER_ID = 'T-L02'
export const FOREIGN_ID      = 'T-X01'
export const BLOCKER_ID      = 'T-B01'
export const NO_COUNTER_ID   = 'T-N01'
export const COUNTER_1K_ID   = 'T-K01'
export const COUNTER_2K_ID   = 'T-K02'
export const RUSH_ID         = 'T-R01'
export const DOUBLE_ID       = 'T-D01'
export const BANISH_ID       = 'T-S01'
export const EVENT_ID        = 'T-E01'
export const COUNTER_EVENT_ID = 'T-E02'
export const STAGE_ID        = 'T-G01'
export const STAGE_2_ID      = 'T-G02'

export const leaderDef       : CardDef = { id: LEADER_ID, name: 'Leader Rojo', type: 'Leader', cost: 0, power: 5000, counter: 0, life: 5, colors: ['Red'], keywords: [] }
export const otherLeaderDef  : CardDef = { id: OTHER_LEADER_ID, name: 'Leader Verde', type: 'Leader', cost: 0, power: 5000, counter: 0, life: 4, colors: ['Green'], keywords: [] }
export const foreignColorDef : CardDef = { id: FOREIGN_ID, name: 'Personaje Verde', type: 'Character', cost: 2, power: 3000, counter: 1000, life: 0, colors: ['Green'], keywords: [] }

export const blockerDef      : CardDef = { id: BLOCKER_ID, name: 'Personaje Blocker', type: 'Character', cost: 2, power: 3000, counter: 1000, life: 0, colors: ['Red'], keywords: ['Blocker'] }
export const noCounterDef    : CardDef = { id: NO_COUNTER_ID, name: 'Personaje sin Counter', type: 'Character', cost: 2, power: 3000, counter: 0, life: 0, colors: ['Red'], keywords: [] }
export const counter1kDef    : CardDef = { id: COUNTER_1K_ID, name: 'Personaje Counter 1000', type: 'Character', cost: 2, power: 3000, counter: 1000, life: 0, colors: ['Red'], keywords: [] }
export const counter2kDef    : CardDef = { id: COUNTER_2K_ID, name: 'Personaje Counter 2000', type: 'Character', cost: 2, power: 3000, counter: 2000, life: 0, colors: ['Red'], keywords: [] }
export const rushDef         : CardDef = { id: RUSH_ID, name: 'Personaje Rush', type: 'Character', cost: 2, power: 5000, counter: 1000, life: 0, colors: ['Red'], keywords: ['Rush'] }
export const doubleDef       : CardDef = { id: DOUBLE_ID, name: 'Personaje Double Attack', type: 'Character', cost: 2, power: 5000, counter: 1000, life: 0, colors: ['Red'], keywords: ['DoubleAttack'] }
export const banishDef       : CardDef = { id: BANISH_ID, name: 'Personaje Banish', type: 'Character', cost: 2, power: 5000, counter: 1000, life: 0, colors: ['Red'], keywords: ['Banish'] }
export const eventDef        : CardDef = { id: EVENT_ID, name: 'Evento Main', type: 'Event', cost: 1, power: 0, counter: 0, life: 0, colors: ['Red'], keywords: [] }
export const counterEventDef : CardDef = { id: COUNTER_EVENT_ID, name: 'Evento Counter', type: 'Event', cost: 1, power: 0, counter: 2000, life: 0, colors: ['Red'], keywords: [] }
export const stageDef        : CardDef = { id: STAGE_ID, name: 'Stage', type: 'Stage', cost: 2, power: 0, counter: 0, life: 0, colors: ['Red'], keywords: [] }
export const stage2Def       : CardDef = { id: STAGE_2_ID, name: 'Stage 2', type: 'Stage', cost: 1, power: 0, counter: 0, life: 0, colors: ['Red'], keywords: [] }

export const characterDefs: CardDef[] = Array.from({ length: 13 }, (_, i) => ({ id: `T-C${String(i + 1).padStart(2, '0')}`, name: `Personaje ${i + 1}`, type: 'Character' as const, cost: i % 6, power: 2000 + (i % 6) * 1000, counter: i % 2 ? 1000 : 2000, life: 0, colors: ['Red'], keywords: [] }))

export const defs: Record<string, CardDef> = Object.fromEntries([leaderDef, otherLeaderDef, foreignColorDef, blockerDef, noCounterDef, counter1kDef, counter2kDef, rushDef, doubleDef, banishDef, eventDef, counterEventDef, stageDef, stage2Def, ...characterDefs].map(def => [def.id, def]))

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
