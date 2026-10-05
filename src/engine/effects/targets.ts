import type { CardDef, GameState, PlayerId } from '../types'

export interface FieldCard {
  instanceId: string
  defId: string
  owner: PlayerId
  rested: boolean
  attachedDon: number
  isLeader: boolean

}


export function fieldCards(state: GameState, owner: PlayerId): FieldCard[] {
  const player = state.players[owner]
  const leader = { instanceId: player.leader.instanceId, defId: player.leader.defId, owner, rested: player.leaderRested, attachedDon: player.leaderAttachedDon, isLeader: true }

  return [leader, ...player.characters.map(character => ({ instanceId: character.card.instanceId, defId: character.card.defId, owner, rested: character.rested, attachedDon: character.attachedDon, isLeader: false }))]

}


export function findFieldCard(state: GameState, instanceId: string): FieldCard | undefined {
  return [...fieldCards(state, 'p1'), ...fieldCards(state, 'p2')].find(candidate => candidate.instanceId === instanceId)

}


export function hasTrait(def: CardDef, trait: string): boolean {
  return new RegExp(`(^|\\s)${trait}(\\s|$)`).test(def.traits ?? '')

}
