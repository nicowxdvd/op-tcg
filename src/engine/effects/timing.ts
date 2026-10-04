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


export function queueEffects(state: GameState, timing: Timing, source: EffectSource, events: GameEvent[]): GameState {
  let next = state

  for (const [index, effect] of (state.effects[source.defId] ?? []).entries()) {
    const key = `${source.defId}:${source.instanceId}:${index}`
    const ctx: EffectContext = { state: next, source: source.instanceId, owner: source.owner }

    if (effect.timing !== timing || (effect.donRequired ?? 0) > source.attachedDon || !turnMatches(next, source.owner, effect.turn))
      continue
    if ((effect.oncePerTurn && next.oncePerTurnUsed.includes(key)) || (effect.condition && !effect.condition(ctx)))
      continue

    events.push({ type: 'EffectTriggered', player: source.owner, source: source.instanceId, timing })

    next = { ...next, effectQueue: [...next.effectQueue, { source: source.instanceId, owner: source.owner, steps: effect.run(ctx) }], oncePerTurnUsed: effect.oncePerTurn ? [...next.oncePerTurnUsed, key] : next.oncePerTurnUsed }

  }

  return next

}
