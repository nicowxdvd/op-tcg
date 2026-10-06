import type { Action, GameState } from '../engine'
import { describeAction } from './prompts'

export interface HandAction {
  kind: 'play' | 'counter'
  action: Action
  label: string

}

export interface HandSelection {
  instanceId: string
  actions: HandAction[]

}


export function handActionsFor(state: GameState, legal: Action[], instanceId: string): HandAction[] {
  const result: HandAction[] = []

  for (const action of legal) {
    if (!('instanceId' in action) || action.instanceId !== instanceId)
      continue

    if (action.type === 'PlayCharacter' || action.type === 'PlayEvent' || action.type === 'PlayStage')
      result.push({ kind: 'play', action, label: describeAction(state, action) })
    else if (action.type === 'UseCounter' || action.type === 'UseCounterEvent')
      result.push({ kind: 'counter', action, label: describeAction(state, action) })

  }

  return result

}
