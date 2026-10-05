import type { CardType, CharacterInPlay, EffectStep, GameEvent, GameState, PlayerId, PlayerState, QueuedEffect } from '../types'
import { MAX_CHARACTERS, opponentOf } from '../state'
import { addModifier } from './modifiers'
import { hasTrait } from './targets'
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


function search(state: GameState, id: PlayerId, amount: number, type: CardType | undefined, trait: string | undefined, pick: string | null | undefined, events: GameEvent[]): GameState {
  const player = state.players[id]
  const top    = player.deck.slice(0, amount)
  const found  = pick ? top.find(candidate => candidate.instanceId === pick && (!type || state.defs[candidate.defId].type === type) && (!trait || hasTrait(state.defs[candidate.defId], trait))) : undefined

  if (pick && !found)
    throw new Error(`La carta ${pick} no está entre las ${amount} del tope o no cumple el filtro`)

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


function attachDon(state: GameState, id: PlayerId, target: string, amount: number, events: GameEvent[]): GameState {
  const player   = state.players[id]
  const isLeader = player.leader.instanceId === target
  const attached = player.characters.find(candidate => candidate.card.instanceId === target)

  if (!isLeader && !attached)
    throw new Error(`La carta ${target} no está en el área de ${id}`)

  const moved = Math.min(amount, player.donRested)
  const base  = { ...player, donRested: player.donRested - moved }

  for (let i = 0; i < moved; i++)
    events.push({ type: 'DonAttached', player: id, target })

  return setPlayer(state, id, isLeader ? { ...base, leaderAttachedDon: player.leaderAttachedDon + moved } : { ...base, characters: player.characters.map(candidate => candidate === attached ? { ...candidate, attachedDon: candidate.attachedDon + moved } : candidate) })

}


function restDon(state: GameState, id: PlayerId, amount: number, events: GameEvent[]): GameState {
  const player = state.players[id]
  const moved  = Math.min(amount, player.donActive)

  if (!moved)
    return state

  events.push({ type: 'DonRested', player: id, amount: moved })

  return setPlayer(state, id, { ...player, donActive: player.donActive - moved, donRested: player.donRested + moved })

}


function activateDon(state: GameState, id: PlayerId, amount: number, events: GameEvent[]): GameState {
  const player = state.players[id]
  const moved  = Math.min(amount, player.donRested)

  if (!moved)
    return state

  events.push({ type: 'DonActivated', player: id, amount: moved })

  return setPlayer(state, id, { ...player, donRested: player.donRested - moved, donActive: player.donActive + moved })

}


function playSelf(state: GameState, id: PlayerId, instanceId: string, replace: string | undefined, events: GameEvent[]): GameState {
  const player = state.players[id]
  const card   = player.trash.find(candidate => candidate.instanceId === instanceId)

  if (!card || state.defs[card.defId].type !== 'Character')
    return state

  const replaced = player.characters.find(candidate => candidate.card.instanceId === replace)

  if (player.characters.length >= MAX_CHARACTERS && !replaced)
    throw new Error(`Con ${MAX_CHARACTERS} Characters hay que elegir uno para reemplazar`)

  if (replaced)
    events.push({ type: 'CharacterTrashed', player: id, instanceId: replaced.card.instanceId })

  events.push({ type: 'CharacterPlayed', player: id, instanceId })

  const trash = [...player.trash.filter(candidate => candidate !== card), ...(replaced ? [replaced.card] : [])]
  const next  = setPlayer(state, id, { ...player, trash, characters: [...player.characters.filter(candidate => candidate !== replaced), { card, rested: false, attachedDon: 0, playedTurn: state.turn }], donRested: player.donRested + (replaced?.attachedDon ?? 0) })

  return queueEffects(next, 'onPlay', { instanceId, defId: card.defId, owner: id, attachedDon: 0 }, events)

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
      return search(state, step.player, step.amount, step.type, step.trait, step.pick, events)
    case 'toLife':
      return toLife(state, step.player, step.instanceId, events)
    case 'discard':
      return discard(state, step.player, step.instanceId, events)
    case 'toHand':
      return toHand(state, step.player, step.instanceId, events)
    case 'attachDon':
      return attachDon(state, step.player, step.target, step.amount, events)
    case 'restDon':
      return restDon(state, step.player, step.amount, events)
    case 'activateDon':
      return activateDon(state, step.player, step.amount, events)
    case 'blockerLock':
      return { ...state, restrictions: [...state.restrictions, { attacker: step.attacker, minPower: step.minPower, duration: step.duration, sourceId: queued.source }] }
    case 'playSelf':
      return playSelf(state, step.player, step.instanceId, step.replace, events)
    default:
      throw new Error(`Primitiva no implementada: ${step.op}`)
  }

}
