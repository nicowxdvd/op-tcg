import { apply } from '../../src/engine/actions'
import { createGame } from '../../src/engine/state'
import { buildDeck, defs, LEADER_ID } from './fixtures'
import type { CardInstance, CharacterInPlay, GameState, PlayerId, PlayerState } from '../../src/engine/types'

export function other(id: PlayerId): PlayerId {
  return id === 'p1' ? 'p2' : 'p1'

}


export function newGame(seed = 5): GameState {
  return createGame({ seed, defs, decks: { p1: { leader: LEADER_ID, cards: buildDeck() }, p2: { leader: LEADER_ID, cards: buildDeck() } } })

}


export function startGame(seed = 5): GameState {
  const created = newGame(seed)
  const decided = apply(created, { type: 'Mulligan', player: created.first, redraw: false }).state

  return apply(decided, { type: 'Mulligan', player: other(created.first), redraw: false }).state

}


export function pass(state: GameState) {
  return apply(state, { type: 'PassPhase', player: state.active })

}


export function withPlayer(state: GameState, id: PlayerId, patch: Partial<PlayerState>): GameState {
  return { ...state, players: { ...state.players, [id]: { ...state.players[id], ...patch } } }

}


export function card(owner: PlayerId, defId: string, n: number): CardInstance {
  return { instanceId: `${owner}-t${n}`, defId, owner }

}


export function inPlay(instance: CardInstance, playedTurn = 1, attachedDon = 0): CharacterInPlay {
  return { card: instance, rested: false, attachedDon, playedTurn }

}
