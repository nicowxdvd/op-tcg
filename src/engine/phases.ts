import type { GameEvent, GameState, Phase, PlayerId, PlayerState } from './types'
import { opponentOf } from './state'

function enter(state: GameState, phase: Phase, events: GameEvent[]): GameState {
  events.push({ type: 'PhaseChanged', phase, turn: state.turn, active: state.active })

  return { ...state, phase }

}


function setPlayer(state: GameState, id: PlayerId, player: PlayerState): GameState {
  return { ...state, players: { ...state.players, [id]: player } }

}


function refresh(state: GameState): GameState {
  const player   = state.players[state.active]
  const attached = player.leaderAttachedDon + player.characters.reduce((sum, character) => sum + character.attachedDon, 0)

  return setPlayer(state, state.active, { ...player, donActive: player.donActive + player.donRested + attached, donRested: 0, leaderRested: false, leaderAttachedDon: 0, characters: player.characters.map(character => ({ ...character, rested: false, attachedDon: 0 })) })

}


function draw(state: GameState, events: GameEvent[]): GameState {
  const id     = state.active
  const player = state.players[id]

  if (id === state.first && state.turn === 1)
    return state

  if (!player.deck.length) {
    events.push({ type: 'GameOver', winner: opponentOf(id) })

    return { ...state, phase: 'gameOver', winner: opponentOf(id) }
  }

  const [card, ...rest] = player.deck

  events.push({ type: 'CardDrawn', player: id, instanceId: card.instanceId })

  return setPlayer(state, id, { ...player, hand: [...player.hand, card], deck: rest })

}


function giveDon(state: GameState, events: GameEvent[]): GameState {
  const id     = state.active
  const player = state.players[id]
  const amount = Math.min(id === state.first && state.turn === 1 ? 1 : 2, player.donDeck)

  if (amount === 0)
    return state

  events.push({ type: 'DonAdded', player: id, amount })

  return setPlayer(state, id, { ...player, donDeck: player.donDeck - amount, donActive: player.donActive + amount })

}


export function startTurn(state: GameState, events: GameEvent[]): GameState {
  let next = refresh(enter(state, 'refresh', events))

  next = draw(enter(next, 'draw', events), events)

  if (next.phase === 'gameOver')
    return next

  next = giveDon(enter(next, 'don', events), events)

  return enter(next, 'main', events)

}


export function endTurn(state: GameState, events: GameEvent[]): GameState {
  const ended = enter(state, 'end', events)

  return startTurn({ ...ended, active: opponentOf(ended.active), turn: ended.turn + 1 }, events)

}
