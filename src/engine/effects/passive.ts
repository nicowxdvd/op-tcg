import type { EffectContext, GameState, Keyword, PlayerId } from '../types'
import { fieldCards, type FieldCard } from './targets'
import { isEligible } from './timing'

function stageCard(state: GameState, owner: PlayerId): FieldCard[] {
  const stage = state.players[owner].stage

  return stage ? [{ instanceId: stage.instanceId, defId: stage.defId, owner, rested: false, attachedDon: 0, isLeader: false }] : []

}


function auraSources(state: GameState, instanceId: string) {
  return (['p1', 'p2'] as const).flatMap(owner => [...fieldCards(state, owner), ...stageCard(state, owner)]).flatMap(source => (state.effects[source.defId] ?? []).flatMap((effect, index) => {
    const ctx: EffectContext = { state, source: source.instanceId, owner: source.owner }
    const applies            = effect.timing === 'passive' && effect.aura && isEligible(state, source, index, effect) && (effect.aura.affects ? effect.aura.affects(ctx, instanceId) : source.instanceId === instanceId)

    return applies ? [effect.aura!] : []

  }))

}


export function passivePower(state: GameState, instanceId: string): number {
  return auraSources(state, instanceId).reduce((sum, aura) => sum + (aura.power ?? 0), 0)

}


export function forcedTargets(state: GameState, defender: PlayerId): string[] {
  return fieldCards(state, defender).filter(source => (state.effects[source.defId] ?? []).some((effect, index) => effect.timing === 'passive' && effect.aura?.onlyTarget && isEligible(state, source, index, effect))).map(source => source.instanceId)

}


export function handCounter(state: GameState, owner: PlayerId, instanceId: string): number {
  const card = state.players[owner].hand.find(candidate => candidate.instanceId === instanceId)

  if (!card)
    throw new Error(`La carta ${instanceId} no está en la mano de ${owner}`)

  const source = { instanceId, defId: card.defId, owner, attachedDon: 0 }
  const extra  = (state.effects[card.defId] ?? []).reduce((sum, effect, index) => sum + (effect.timing === 'passive' && effect.handCounter && isEligible(state, source, index, effect) ? effect.handCounter : 0), 0)

  return state.defs[card.defId].counter + extra

}


export function fieldCost(state: GameState, instanceId: string): number {
  const found = fieldCards(state, 'p1').concat(fieldCards(state, 'p2')).find(candidate => candidate.instanceId === instanceId)

  if (!found)
    throw new Error(`La carta ${instanceId} no está en juego`)

  return state.defs[found.defId].cost + auraSources(state, instanceId).reduce((sum, aura) => sum + (aura.cost ?? 0), 0)

}


export function hasKeyword(state: GameState, instanceId: string, keyword: Keyword): boolean {
  const found = fieldCards(state, 'p1').concat(fieldCards(state, 'p2')).find(candidate => candidate.instanceId === instanceId)

  return !!found && (state.defs[found.defId].keywords.includes(keyword) || auraSources(state, instanceId).some(aura => aura.keyword === keyword))

}
