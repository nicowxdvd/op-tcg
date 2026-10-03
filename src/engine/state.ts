import type { CardDef, CardInstance, GameState, PlayerId, PlayerState } from './types'
import { nextInt, shuffle } from './rng'

export interface DeckConfig {
  leader: string
  cards: string[]

}

export interface GameConfig {
  seed: number
  defs: Record<string, CardDef>
  decks: Record<PlayerId, DeckConfig>

}

export const DECK_SIZE      = 50
export const MAX_COPIES     = 4
export const DON_TOTAL      = 10
export const HAND_SIZE      = 5
export const MAX_CHARACTERS = 5

interface BuiltPlayer {
  state: PlayerState
  seed: number

}


export function opponentOf(player: PlayerId): PlayerId {
  return player === 'p1' ? 'p2' : 'p1'

}


export function mulliganDecider(state: GameState): PlayerId {
  return state.players[state.first].mulliganDone ? opponentOf(state.first) : state.first

}


export function validateDeck(defs: Record<string, CardDef>, deck: DeckConfig, player: PlayerId): void {
  const leader = defs[deck.leader]
  const copies: Record<string, number> = {}

  if (!leader || leader.type !== 'Leader')
    throw new Error(`${player}: Leader inválido (${deck.leader})`)
  if (deck.cards.length !== DECK_SIZE)
    throw new Error(`${player}: el mazo tiene ${deck.cards.length} cartas, debe tener ${DECK_SIZE}`)

  for (const id of deck.cards) {
    const def = defs[id]

    if (!def)
      throw new Error(`${player}: carta desconocida (${id})`)
    if (def.type === 'Leader')
      throw new Error(`${player}: el mazo no puede incluir Leaders (${id})`)
    if (!def.colors.every(color => leader.colors.includes(color)))
      throw new Error(`${player}: la carta ${id} no comparte color con el Leader ${leader.id}`)

    copies[id] = (copies[id] ?? 0) + 1

    if (copies[id] > MAX_COPIES)
      throw new Error(`${player}: más de ${MAX_COPIES} copias de ${id}`)
  }

}


function buildPlayer(player: PlayerId, deck: DeckConfig, seed: number): BuiltPlayer {
  const cards    = deck.cards.map((defId, i): CardInstance => ({ instanceId: `${player}-${i}`, defId, owner: player }))
  const shuffled = shuffle(cards, seed)
  const leader   = { instanceId: `${player}-leader`, defId: deck.leader, owner: player }
  const state    = { leader, deck: shuffled.items.slice(HAND_SIZE), hand: shuffled.items.slice(0, HAND_SIZE), life: [], trash: [], characters: [], leaderRested: false, leaderAttachedDon: 0, donDeck: DON_TOTAL, donActive: 0, donRested: 0, mulliganDone: false }

  return { state, seed: shuffled.seed }

}


export function createGame(config: GameConfig): GameState {
  validateDeck(config.defs, config.decks.p1, 'p1')
  validateDeck(config.defs, config.decks.p2, 'p2')

  const roll  = nextInt(config.seed, 2)
  const first = roll.value === 0 ? 'p1' : 'p2'
  const p1    = buildPlayer('p1', config.decks.p1, roll.seed)
  const p2    = buildPlayer('p2', config.decks.p2, p1.seed)

  return { seed: p2.seed, defs: config.defs, players: { p1: p1.state, p2: p2.state }, first, active: first, turn: 1, phase: 'mulligan', winner: null, battle: null }

}
