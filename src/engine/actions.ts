import type { Action, ApplyResult, GameEvent, GameState, PlayerId } from './types'
import { shuffle } from './rng'
import { startTurn, endTurn } from './phases'
import { HAND_SIZE, MAX_CHARACTERS, opponentOf } from './state'

type MulliganAction = Extract<Action, { type: 'Mulligan' }>
type PlayAction     = Extract<Action, { type: 'PlayCharacter' }>
type AttachAction   = Extract<Action, { type: 'AttachDon' }>
type PassAction     = Extract<Action, { type: 'PassPhase' }>

function requireMain(state: GameState, player: PlayerId): void {
  if (state.phase !== 'main')
    throw new Error('Esta acción solo se puede hacer en la fase main')
  if (player !== state.active)
    throw new Error(`No es el turno de ${player}`)

}


function placeLife(state: GameState): GameState {
  const place = (player: PlayerId) => {
    const current = state.players[player]
    const amount  = state.defs[current.leader.defId].life

    return { ...current, life: current.deck.slice(0, amount), deck: current.deck.slice(amount) }

  }

  return { ...state, players: { p1: place('p1'), p2: place('p2') }, active: state.first, turn: 1 }

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
    events.push({ type: 'GameStarted', first: next.first })
    next = startTurn(placeLife(next), events)
  }

  return { state: next, events }

}


function passPhase(state: GameState, action: PassAction): ApplyResult {
  const events: GameEvent[] = []

  requireMain(state, action.player)

  return { state: endTurn(state, events), events }

}


function playCharacter(state: GameState, action: PlayAction): ApplyResult {
  requireMain(state, action.player)

  const player = state.players[action.player]
  const card   = player.hand.find(candidate => candidate.instanceId === action.instanceId)
  const def    = card && state.defs[card.defId]
  const full   = player.characters.length >= MAX_CHARACTERS

  if (!card || !def)
    throw new Error(`La carta ${action.instanceId} no está en la mano de ${action.player}`)
  if (def.type !== 'Character')
    throw new Error(`${def.name} no es un Character`)
  if (player.donActive < def.cost)
    throw new Error(`DON!! insuficiente: cost ${def.cost}, activos ${player.donActive}`)
  if (full && !action.replaceId)
    throw new Error(`Con ${MAX_CHARACTERS} Characters hay que elegir uno para reemplazar`)
  if (!full && action.replaceId)
    throw new Error(`Solo se reemplaza con ${MAX_CHARACTERS} Characters en juego`)

  const replaced = player.characters.find(character => character.card.instanceId === action.replaceId)

  if (action.replaceId && !replaced)
    throw new Error(`El Character ${action.replaceId} no está en juego`)

  const events: GameEvent[] = []

  if (replaced)
    events.push({ type: 'CharacterTrashed', player: action.player, instanceId: replaced.card.instanceId })

  events.push({ type: 'CharacterPlayed', player: action.player, instanceId: card.instanceId })

  const updated = { ...player, hand: player.hand.filter(candidate => candidate !== card), trash: replaced ? [...player.trash, replaced.card] : player.trash, characters: [...player.characters.filter(character => character !== replaced), { card, rested: false, attachedDon: 0, playedTurn: state.turn }], donActive: player.donActive - def.cost, donRested: player.donRested + def.cost + (replaced?.attachedDon ?? 0) }

  return { state: { ...state, players: { ...state.players, [action.player]: updated } }, events }

}


function attachDon(state: GameState, action: AttachAction): ApplyResult {
  requireMain(state, action.player)

  const player   = state.players[action.player]
  const isLeader = action.target === 'leader'

  if (player.donActive < 1)
    throw new Error('No hay DON!! activo para adjuntar')
  if (!isLeader && !player.characters.some(character => character.card.instanceId === action.target))
    throw new Error(`El Character ${action.target} no está en juego`)

  const base    = { ...player, donActive: player.donActive - 1 }
  const updated = isLeader ? { ...base, leaderAttachedDon: player.leaderAttachedDon + 1 } : { ...base, characters: player.characters.map(character => character.card.instanceId === action.target ? { ...character, attachedDon: character.attachedDon + 1 } : character) }

  return { state: { ...state, players: { ...state.players, [action.player]: updated } }, events: [{ type: 'DonAttached', player: action.player, target: action.target }] }

}


export function apply(state: GameState, action: Action): ApplyResult {
  switch (action.type) {
    case 'Mulligan':
      return mulligan(state, action)
    case 'PlayCharacter':
      return playCharacter(state, action)
    case 'AttachDon':
      return attachDon(state, action)
    case 'PassPhase':
      return passPhase(state, action)
    default:
      throw new Error(`Acción desconocida: ${(action as { type: string }).type}`)
  }

}
