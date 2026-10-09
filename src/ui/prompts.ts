import type { Action, GameState, PlayerId } from '../engine'

export interface PromptSpec {
  title: string
  subtitle?: string
  hint?: string
  options: { label: string; action: Action }[]

}


export function nameOf(state: GameState, instanceId: string): string {
  for (const id of ['p1', 'p2'] as const) {
    const player = state.players[id]
    const found  = [player.leader, ...player.hand, ...player.deck, ...player.life, ...player.trash, ...player.characters.map(character => character.card), ...(player.stage ? [player.stage] : [])].find(card => card.instanceId === instanceId)

    if (found)
      return state.defs[found.defId].name
  }

  return instanceId

}


export function describeAction(state: GameState, action: Action): string {
  switch (action.type) {
    case 'ChooseFirst':
      return action.goFirst ? 'Primero' : 'Segundo'
    case 'Mulligan':
      return action.redraw ? 'Mulligan' : 'Quedarse'
    case 'Choose':
      return nameOf(state, action.option)
    case 'PassChoice':
      return 'Skip'
    case 'DeclareBlock':
      return `Block with ${nameOf(state, action.blockerId)}`
    case 'PassBlock':
      return 'No block'
    case 'UseCounter':
      return `Counter: ${nameOf(state, action.instanceId)}`
    case 'UseCounterEvent':
      return `Counter Event: ${nameOf(state, action.instanceId)}`
    case 'PassCounter':
      return 'No counter'
    case 'RevealTrigger':
      return 'Reveal Trigger'
    case 'PassTrigger':
      return 'Skip Trigger'
    case 'ActivateEffect':
      return `Activate ${nameOf(state, action.source)} (effect ${action.index + 1})`
    case 'PlayCharacter':
      return action.replaceId ? `Replace ${nameOf(state, action.replaceId)}` : `Play ${nameOf(state, action.instanceId)}`
    default:
      return action.type
  }

}


export function buildPrompt(state: GameState, legal: Action[], viewer: PlayerId): PromptSpec | null {
  if (legal.length === 0)
    return null

  const options = (actions: Action[]) => actions.map(action => ({ label: describeAction(state, action), action }))

  if (state.phase === 'mulligan')
    return { title: 'Tu mano inicial — ¿quedártela o rebarajar?', subtitle: viewer === state.first ? 'Vas primero' : 'Vas segundo', hint: 'Mulligan = rebaraja y roba 5 nuevas (una sola vez).', options: options([...legal].sort((a, b) => Number(a.type === 'Mulligan' && a.redraw) - Number(b.type === 'Mulligan' && b.redraw))) }
  if (state.pending)
    return { title: `${viewer.toUpperCase()}: choose (${state.pending.kind})`, options: options(legal) }
  if (state.battle && state.battle.attackerPlayer !== viewer && state.battle.step !== 'counter') {
    const titles = { block: 'Block step', trigger: 'Trigger step' }

    return { title: `${viewer.toUpperCase()}: ${titles[state.battle.step]}`, options: options(legal) }

  }

  return null

}
