import type { EffectContext, EffectDef, GameEvent, GameState, PlayerId, Timing } from '../types'

export interface EffectSource {
  instanceId: string
  defId: string
  owner: PlayerId
  attachedDon: number

}


function turnMatches(state: GameState, owner: PlayerId, turn: EffectDef['turn']): boolean {
  if (turn === 'yours')
    return state.active === owner
  if (turn === 'opponents')
    return state.active !== owner

  return true

}


export function effectKey(source: EffectSource, index: number): string {
  return `${source.defId}:${source.instanceId}:${index}`

}


export function isEligible(state: GameState, source: EffectSource, index: number, effect: EffectDef): boolean {
  const ctx: EffectContext = { state, source: source.instanceId, owner: source.owner }

  if ((effect.donRequired ?? 0) > source.attachedDon || !turnMatches(state, source.owner, effect.turn))
    return false
  if (effect.oncePerTurn && state.oncePerTurnUsed.includes(effectKey(source, index)))
    return false

  return !effect.condition || effect.condition(ctx)

}


export function queueEffects(state: GameState, timing: Timing, source: EffectSource, events: GameEvent[]): GameState {
  let next = state

  for (const [index, effect] of (state.effects[source.defId] ?? []).entries()) {
    if (effect.timing !== timing || !isEligible(next, source, index, effect))
      continue

    const ctx: EffectContext = { state: next, source: source.instanceId, owner: source.owner }

    events.push({ type: 'EffectTriggered', player: source.owner, source: source.instanceId, timing })

    next = { ...next, effectQueue: [...next.effectQueue, { source: source.instanceId, owner: source.owner, steps: effect.run(ctx) }], oncePerTurnUsed: effect.oncePerTurn ? [...next.oncePerTurnUsed, effectKey(source, index)] : next.oncePerTurnUsed }

  }

  return next

}
