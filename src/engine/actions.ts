import type { Action, ApplyResult, GameEvent, GameState, PlayerId } from './types'
import { shuffle } from './rng'
import { HAND_SIZE } from './state'

type MulliganAction = Extract<Action, { type: 'Mulligan' }>

export function opponentOf(player: PlayerId): PlayerId {
  return player === 'p1' ? 'p2' : 'p1'

}


function placeLife(state: GameState): GameState {
  const place = (player: PlayerId) => {
    const current = state.players[player]
    const amount  = state.defs[current.leader.defId].life

    return { ...current, life: current.deck.slice(0, amount), deck: current.deck.slice(amount) }

  }

  return { ...state, players: { p1: place('p1'), p2: place('p2') }, active: state.first, turn: 1, phase: 'refresh' }

}


function mulligan(state: GameState, action: MulliganAction): ApplyResult {
  const expected = state.players[state.first].mulliganDone ? opponentOf(state.first) : state.first

  if (state.phase !== 'mulligan')
    throw new Error('El mulligan solo se decide en la fase mulligan')
  if (action.player !== expected)
    throw new Error(`Le toca decidir el mulligan a ${expected}, no a ${action.player}`)

  let seed   = state.seed
  let player = state.players[action.player]

  if (action.redraw) {
    const shuffled = shuffle([...player.hand, ...player.deck], seed)

    seed   = shuffled.seed
    player = { ...player, hand: shuffled.items.slice(0, HAND_SIZE), deck: shuffled.items.slice(HAND_SIZE) }
  }

  const events: GameEvent[] = [{ type: 'MulliganDecided', player: action.player, redraw: action.redraw }]
  let next: GameState       = { ...state, seed, players: { ...state.players, [action.player]: { ...player, mulliganDone: true } } }

  if (next.players.p1.mulliganDone && next.players.p2.mulliganDone) {
    next = placeLife(next)
    events.push({ type: 'GameStarted', first: next.first }, { type: 'PhaseChanged', phase: next.phase, turn: next.turn, active: next.active })
  }

  return { state: next, events }

}


export function apply(state: GameState, action: Action): ApplyResult {
  switch (action.type) {
    case 'Mulligan':
      return mulligan(state, action)
    default:
      throw new Error(`Acción no soportada todavía: ${action.type}`)
  }

}
