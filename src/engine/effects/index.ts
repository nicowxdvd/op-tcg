import type { EffectStep, GameEvent, GameState, Timing } from '../types'
import { CHOICE } from './binding'
import { MAX_CHARACTERS } from '../state'
import { executeStep } from './primitives'
import { hasTrait } from './targets'
import { queueEffects, type EffectSource } from './timing'

type SearchStep = Extract<EffectStep, { op: 'search' }>
type TrashStep  = Extract<EffectStep, { op: 'trashFromHand' }>
type PlayStep   = Extract<EffectStep, { op: 'playSelf' }>

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
