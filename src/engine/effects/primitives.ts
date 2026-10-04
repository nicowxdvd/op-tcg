import type { CardType, CharacterInPlay, EffectStep, GameEvent, GameState, PlayerId, PlayerState, QueuedEffect } from '../types'
import { opponentOf } from '../state'
import { addModifier } from './modifiers'
import { queueEffects } from './timing'

function drawCards(state: GameState, player: PlayerId, amount: number, events: GameEvent[]): GameState {
  let next = state

  for (let i = 0; i < amount; i++) {
    const current = next.players[player]

    if (!current.deck.length) {
      events.push({ type: 'GameOver', winner: opponentOf(player) })

      return { ...next, phase: 'gameOver', winner: opponentOf(player) }

    }

    const [top, ...rest] = current.deck

    events.push({ type: 'CardDrawn', player, instanceId: top.instanceId })

    next = { ...next, players: { ...next.players, [player]: { ...current, hand: [...current.hand, top], deck: rest } } }

  }

  return next

}


function setPlayer(state: GameState, id: PlayerId, player: PlayerState): GameState {
  return { ...state, players: { ...state.players, [id]: player } }

}


function findCharacter(state: GameState, instanceId: string): { id: PlayerId; character: CharacterInPlay } | undefined {
  for (const id of ['p1', 'p2'] as const) {
    const character = state.players[id].characters.find(candidate => candidate.card.instanceId === instanceId)

    if (character)
      return { id, character }

  }

}


function knockOut(state: GameState, target: string, events: GameEvent[]): GameState {
  const found = findCharacter(state, target)

  if (!found)
    return state

  const { id, character } = found
  const player            = state.players[id]

  events.push({ type: 'CharacterKOd', player: id, instanceId: target })

  const next = setPlayer(state, id, { ...player, characters: player.characters.filter(candidate => candidate !== character), trash: [...player.trash, character.card], donRested: player.donRested + character.attachedDon })

  return queueEffects(next, 'onKO', { instanceId: target, defId: character.card.defId, owner: id, attachedDon: character.attachedDon }, events)

}


function setRested(state: GameState, target: string, rested: boolean, events: GameEvent[]): GameState {
  for (const id of ['p1', 'p2'] as const) {
    const player   = state.players[id]
    const isLeader = player.leader.instanceId === target

    if (!isLeader && !player.characters.some(candidate => candidate.card.instanceId === target))
      continue

    events.push({ type: rested ? 'CharacterRested' : 'CharacterActivated', target })

    return setPlayer(state, id, isLeader ? { ...player, leaderRested: rested } : { ...player, characters: player.characters.map(candidate => candidate.card.instanceId === target ? { ...candidate, rested } : candidate) })

  }

  return state

}


function search(state: GameState, id: PlayerId, amount: number, type: CardType | undefined, pick: string | null | undefined, events: GameEvent[]): GameState {
  const player = state.players[id]
  const top    = player.deck.slice(0, amount)
  const found  = pick ? top.find(candidate => candidate.instanceId === pick && (!type || state.defs[candidate.defId].type === type)) : undefined

  if (pick && !found)
    throw new Error(`La carta ${pick} no está entre las ${amount} del tope o no cumple el tipo`)

  const rest   = top.filter(candidate => candidate !== found)

  if (found)
    events.push({ type: 'CardSearched', player: id, instanceId: found.instanceId })

  return setPlayer(state, id, { ...player, deck: [...player.deck.slice(amount), ...rest], hand: found ? [...player.hand, found] : player.hand })

}


function toLife(state: GameState, id: PlayerId, instanceId: string, events: GameEvent[]): GameState {
  const player   = state.players[id]
  const fromHand = player.hand.find(candidate => candidate.instanceId === instanceId)
  const fromDeck = player.deck[0]?.instanceId === instanceId ? player.deck[0] : undefined
  const moved    = fromHand ?? fromDeck

  if (!moved)
    throw new Error(`La carta ${instanceId} no está en la mano ni en el tope del mazo de ${id}`)

  events.push({ type: 'CardToLife', player: id, instanceId })

  return setPlayer(state, id, { ...player, hand: fromHand ? player.hand.filter(candidate => candidate !== moved) : player.hand, deck: fromDeck ? player.deck.slice(1) : player.deck, life: [moved, ...player.life] })

}


function discard(state: GameState, id: PlayerId, instanceId: string, events: GameEvent[]): GameState {
  const player = state.players[id]
  const moved  = player.hand.find(candidate => candidate.instanceId === instanceId)

  if (!moved)
    throw new Error(`La carta ${instanceId} no está en la mano de ${id}`)

  events.push({ type: 'CardDiscarded', player: id, instanceId })

  return setPlayer(state, id, { ...player, hand: player.hand.filter(candidate => candidate !== moved), trash: [...player.trash, moved] })

}


function toHand(state: GameState, id: PlayerId, instanceId: string, events: GameEvent[]): GameState {
  const player    = state.players[id]
  const inLife    = player.life.find(candidate => candidate.instanceId === instanceId)
  const inTrash   = player.trash.find(candidate => candidate.instanceId === instanceId)
  const character = player.characters.find(candidate => candidate.card.instanceId === instanceId)
  const moved     = inLife ?? inTrash ?? character?.card

  if (!moved)
    throw new Error(`La carta ${instanceId} no está en la Life, el trash ni el área de ${id}`)

  events.push({ type: 'CardToHand', player: id, instanceId })

  return setPlayer(state, id, { ...player, life: player.life.filter(candidate => candidate !== moved), trash: player.trash.filter(candidate => candidate !== moved), characters: player.characters.filter(candidate => candidate !== character), donRested: player.donRested + (character?.attachedDon ?? 0), hand: [...player.hand, moved] })

}


export function executeStep(state: GameState, step: EffectStep, queued: QueuedEffect, events: GameEvent[]): GameState {
  switch (step.op) {
    case 'draw':
      return drawCards(state, step.player, step.amount, events)
    case 'power':
      events.push({ type: 'PowerModified', target: step.target, amount: step.amount, duration: step.duration })

      return addModifier(state, { target: step.target, power: step.amount, duration: step.duration, sourceId: queued.source })
    case 'ko':
      return knockOut(state, step.target, events)
    case 'rest':
      return setRested(state, step.target, true, events)
    case 'activate':
      return setRested(state, step.target, false, events)
    case 'search':
      return search(state, step.player, step.amount, step.type, step.pick, events)
    case 'toLife':
      return toLife(state, step.player, step.instanceId, events)
    case 'discard':
      return discard(state, step.player, step.instanceId, events)
    case 'toHand':
      return toHand(state, step.player, step.instanceId, events)
    default:
      throw new Error(`Primitiva no implementada: ${step.op}`)
  }

}
