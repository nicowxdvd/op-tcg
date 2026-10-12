import type { EffectContext, EffectStep, GameEvent, GameState, QueuedEffect, Timing } from '../types'
import { CHOICE } from './binding'
import { MAX_CHARACTERS } from '../state'
import { executeStep } from './primitives'
import { fieldCards, findFieldCard, hasTrait } from './targets'
import { isEligible, queueEffects, type EffectSource } from './timing'

type SearchStep = Extract<EffectStep, { op: 'search' }>
type TrashStep  = Extract<EffectStep, { op: 'trashFromHand' }>
type PlayStep   = Extract<EffectStep, { op: 'playSelf' }>
type PlayFrom   = Extract<EffectStep, { op: 'playFrom' }>
type FromTrash  = Extract<EffectStep, { op: 'fromTrash' }>
type ToBottom   = Extract<EffectStep, { op: 'trashToBottom' }>
type Removal    = Extract<EffectStep, { op: 'ko' | 'toHand' | 'toBottom' }>

export type { EffectSource } from './timing'


function expandTrash(state: GameState, step: TrashStep): EffectStep[] {
  const options = state.players[step.player].hand.map(candidate => candidate.instanceId)
  const more    = step.amount > 1 ? [{ ...step, amount: step.amount - 1 }] : []

  if (!options.length)
    return []

  return [{ op: 'choose', chooser: step.player, kind: 'trashFromHand', options, optional: false, then: [{ op: 'discard', player: step.player, instanceId: CHOICE }, ...more] }]

}


function expandSearch(state: GameState, step: SearchStep): EffectStep[] {
  const top     = state.players[step.player].deck.slice(0, step.amount)
  const options = top.filter(candidate => (!step.type || state.defs[candidate.defId].type === step.type) && (!step.trait || hasTrait(state.defs[candidate.defId], step.trait))).map(candidate => candidate.instanceId)

  if (!options.length)
    return [{ ...step, pick: null }]

  return [{ op: 'choose', chooser: step.player, kind: 'target', options, optional: true, then: [{ ...step, pick: CHOICE }], otherwise: [{ ...step, pick: null }] }]

}


function expandPlay(state: GameState, step: PlayStep): EffectStep[] {
  const options = state.players[step.player].characters.map(candidate => candidate.card.instanceId)

  if (options.length < MAX_CHARACTERS)
    return [{ ...step, replace: '' }]

  return [{ op: 'choose', chooser: step.player, kind: 'target', options, optional: false, then: [{ ...step, replace: CHOICE }] }]

}


function expandPlayFrom(state: GameState, step: PlayFrom): EffectStep[] {
  const player = state.players[step.player]
  const filter = step.filter ?? {}
  const played = (step.played ?? []).map(instanceId => player.characters.find(candidate => candidate.card.instanceId === instanceId)?.card.defId).filter((defId): defId is string => !!defId)
  const spent  = played.reduce((sum, defId) => sum + state.defs[defId].cost, 0)
  const names  = played.map(defId => state.defs[defId].name)
  const limit  = Math.min(filter.maxCost ?? Infinity, (filter.maxTotalCost ?? Infinity) - spent)

  if (step.amount <= 0)
    return []

  const options = (step.from === 'hand' ? player.hand : player.trash).filter(candidate => {
    const def = state.defs[candidate.defId]

    return def.type === 'Character' && def.cost <= limit && (!filter.trait || hasTrait(def, filter.trait)) && !(filter.distinctNames && names.includes(def.name))

  }).map(candidate => candidate.instanceId)

  if (!options.length)
    return []

  return [{ op: 'choose', chooser: step.player, kind: 'target', options, optional: true, then: [{ op: 'playSelf', player: step.player, instanceId: CHOICE }, { ...step, amount: step.amount - 1, played: [...(step.played ?? []), CHOICE] }] }]

}


function expandFromTrash(state: GameState, step: FromTrash): EffectStep[] {
  const filter  = step.filter ?? {}
  const options = state.players[step.player].trash.filter(candidate => {
    const def = state.defs[candidate.defId]

    return (!filter.type || def.type === filter.type) && (!filter.color || def.colors.includes(filter.color)) && (filter.maxCost === undefined || def.cost <= filter.maxCost) && (!filter.name || def.name === filter.name) && (!filter.trait || hasTrait(def, filter.trait))

  }).map(candidate => candidate.instanceId)

  if (!options.length)
    return []

  return [{ op: 'choose', chooser: step.player, kind: 'target', options, optional: true, then: [{ op: 'toHand', player: step.player, instanceId: CHOICE }] }]

}


function expandTrashBottom(state: GameState, step: ToBottom): EffectStep[] {
  const options = state.players[step.player].trash.map(candidate => candidate.instanceId)
  const more    = step.amount > 1 ? [{ ...step, amount: step.amount - 1 }] : []

  if (!options.length || step.amount <= 0)
    return []

  return [{ op: 'choose', chooser: step.player, kind: 'target', options, optional: false, then: [{ op: 'trashToBottom', player: step.player, amount: 1, pick: CHOICE }, ...more] }]

}


function removedId(step: Removal): string {
  return step.op === 'toHand' ? step.instanceId : step.target

}


function expandReplacement(state: GameState, step: Removal, queued: QueuedEffect): EffectStep[] | null {
  const targetId = removedId(step)
  const found    = findFieldCard(state, targetId)

  if (!found || found.isLeader || found.owner === queued.owner)
    return null

  for (const source of fieldCards(state, found.owner))
    for (const [index, effect] of (state.effects[source.defId] ?? []).entries()) {
      if (effect.timing !== 'passive' || !effect.replacement || !isEligible(state, source, index, effect))
        continue

      const ctx: EffectContext = { state, source: source.instanceId, owner: found.owner, target: targetId }

      return [{ op: 'choose', chooser: found.owner, kind: 'confirm', options: [targetId], optional: true, then: effect.replacement(ctx), otherwise: [{ ...step, force: true }] }]

    }

  return null

}


export function resolveQueue(state: GameState, events: GameEvent[]): GameState {
  let next = state

  while (next.effectQueue.length) {
    const [queued, ...rest] = next.effectQueue
    let steps               = queued.steps

    next = { ...next, effectQueue: rest }

    while (steps.length) {
      const [step, ...others] = steps

      if (step.op === 'search' && step.pick === undefined) {
        steps = [...expandSearch(next, step), ...others]

        continue

      }

      if (step.op === 'playSelf' && step.replace === undefined) {
        steps = [...expandPlay(next, step), ...others]

        continue

      }

      if (step.op === 'playFrom') {
        steps = [...expandPlayFrom(next, step), ...others]

        continue

      }

      if (step.op === 'fromTrash') {
        steps = [...expandFromTrash(next, step), ...others]

        continue

      }

      if ((step.op === 'ko' || step.op === 'toHand' || step.op === 'toBottom') && !step.force) {
        const replaced = expandReplacement(next, step, queued)

        if (replaced) {
          steps = [...replaced, ...others]

          continue

        }

      }

      if (step.op === 'trashToBottom' && step.pick === undefined) {
        steps = [...expandTrashBottom(next, step), ...others]

        continue

      }

      if (step.op === 'trashFromHand') {
        steps = [...expandTrash(next, step), ...others]

        continue

      }

      if (step.op === 'choose') {
        if (!step.options.length) {
          steps = others

          continue

        }

        events.push({ type: 'ChoiceRequested', player: step.chooser, kind: step.kind, options: step.options })

        return { ...next, pending: { player: step.chooser, kind: step.kind, options: step.options, optional: step.optional, resume: { source: queued.source, owner: queued.owner, then: step.then, otherwise: step.otherwise ?? [], rest: others } } }

      }

      next  = executeStep(next, step, queued, events)
      steps = others

      if (next.phase === 'gameOver')
        return { ...next, effectQueue: [] }

    }

  }

  return next

}


export function fireEffects(state: GameState, timing: Timing, source: EffectSource, events: GameEvent[]): GameState {
  return resolveQueue(queueEffects(state, timing, source, events), events)

}
