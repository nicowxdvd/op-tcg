import type { EffectContext, GameState, Keyword } from '../types'
import { fieldCards } from './targets'
import { isEligible } from './timing'

function auraSources(state: GameState, instanceId: string) {
  return (['p1', 'p2'] as const).flatMap(owner => fieldCards(state, owner)).flatMap(source => (state.effects[source.defId] ?? []).flatMap((effect, index) => {
    const ctx: EffectContext = { state, source: source.instanceId, owner: source.owner }
    const applies            = effect.timing === 'passive' && effect.aura && isEligible(state, source, index, effect) && (effect.aura.affects ? effect.aura.affects(ctx, instanceId) : source.instanceId === instanceId)

    return applies ? [effect.aura!] : []

  }))

}


export function passivePower(state: GameState, instanceId: string): number {
  return auraSources(state, instanceId).reduce((sum, aura) => sum + (aura.power ?? 0), 0)

}


export function hasKeyword(state: GameState, instanceId: string, keyword: Keyword): boolean {
  const found = fieldCards(state, 'p1').concat(fieldCards(state, 'p2')).find(candidate => candidate.instanceId === instanceId)

  return !!found && (state.defs[found.defId].keywords.includes(keyword) || auraSources(state, instanceId).some(aura => aura.keyword === keyword))

}
