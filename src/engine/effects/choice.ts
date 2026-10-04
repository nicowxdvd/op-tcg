import type { Action, ApplyResult, EffectStep, GameEvent, GameState, PendingChoice, PlayerId } from '../types'
import { finishTurn } from '../phases'
import { bind } from './binding'
import { resolveQueue } from './index'

type ChooseAction     = Extract<Action, { type: 'Choose' }>
type PassChoiceAction = Extract<Action, { type: 'PassChoice' }>

function requirePending(state: GameState, player: PlayerId): PendingChoice {
  if (!state.pending)
    throw new Error('No hay una decisión pendiente')
  if (state.pending.player !== player)
    throw new Error(`La decisión pendiente es de ${state.pending.player}, no de ${player}`)

  return state.pending

}


function resume(state: GameState, pending: PendingChoice, steps: EffectStep[], events: GameEvent[]): ApplyResult {
  const queued   = { source: pending.resume.source, owner: pending.resume.owner, steps }
  const resolved = resolveQueue({ ...state, pending: null, effectQueue: [queued, ...state.effectQueue] }, events)
  const finished = resolved.phase === 'end' && !resolved.pending

  return { state: finished ? finishTurn(resolved, events) : resolved, events }

}


export function choose(state: GameState, action: ChooseAction): ApplyResult {
  const pending = requirePending(state, action.player)

  if (!pending.options.includes(action.option))
    throw new Error(`La opción ${action.option} no está entre las permitidas`)

  return resume(state, pending, [...bind(pending.resume.then, action.option), ...pending.resume.rest], [{ type: 'ChoiceMade', player: action.player, option: action.option }])

}


export function passChoice(state: GameState, action: PassChoiceAction): ApplyResult {
  const pending = requirePending(state, action.player)

  if (!pending.optional)
    throw new Error('La decisión pendiente no es opcional')

  return resume(state, pending, [...pending.resume.otherwise, ...pending.resume.rest], [{ type: 'ChoicePassed', player: action.player }])

}
