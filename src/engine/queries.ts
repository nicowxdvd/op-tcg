import type { Action, GameState, PlayerId } from './types'
import { MAX_CHARACTERS, mulliganDecider } from './state'

export const DON_POWER = 1000

export function getLegalActions(state: GameState, playerId: PlayerId): Action[] {
  if (state.phase === 'mulligan')
    return mulliganDecider(state) === playerId ? [{ type: 'Mulligan', player: playerId, redraw: false }, { type: 'Mulligan', player: playerId, redraw: true }] : []
  if (state.phase !== 'main' || playerId !== state.active)
    return []

  const player   = state.players[playerId]
  const full     = player.characters.length >= MAX_CHARACTERS
  const playable = player.hand.filter(card => state.defs[card.defId].type === 'Character' && state.defs[card.defId].cost <= player.donActive)
  const plays    = playable.flatMap((card): Action[] => full ? player.characters.map(character => ({ type: 'PlayCharacter', player: playerId, instanceId: card.instanceId, replaceId: character.card.instanceId })) : [{ type: 'PlayCharacter', player: playerId, instanceId: card.instanceId }])
  const targets  = player.donActive > 0 ? ['leader', ...player.characters.map(character => character.card.instanceId)] : []
  const attaches = targets.map((target): Action => ({ type: 'AttachDon', player: playerId, target }))

  return [...plays, ...attaches, { type: 'PassPhase', player: playerId }]

}


function powerOf(state: GameState, defId: string, owner: PlayerId, attachedDon: number): number {
  return state.defs[defId].power + (owner === state.active ? attachedDon * DON_POWER : 0)

}


export function getPower(state: GameState, instanceId: string): number {
  for (const id of ['p1', 'p2'] as const) {
    const player    = state.players[id]
    const character = player.characters.find(candidate => candidate.card.instanceId === instanceId)

    if (player.leader.instanceId === instanceId)
      return powerOf(state, player.leader.defId, id, player.leaderAttachedDon)
    if (character)
      return powerOf(state, character.card.defId, id, character.attachedDon)
  }

  throw new Error(`La carta ${instanceId} no está en juego`)

}
