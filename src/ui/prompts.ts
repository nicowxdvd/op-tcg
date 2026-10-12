import type { Action, GameState, PlayerId } from '../engine'
import { CHOICE_TEXTS } from '../learn/texts'

export interface PromptSpec {
  title: string
  subtitle?: string
  hint?: string
  options: { label: string; action: Action }[]

}


function findCard(state: GameState, instanceId: string) {
  for (const id of ['p1', 'p2'] as const) {
    const player = state.players[id]
    const found  = [player.leader, ...player.hand, ...player.deck, ...player.life, ...player.trash, ...player.characters.map(character => character.card), ...(player.stage ? [player.stage] : [])].find(card => card.instanceId === instanceId)

    if (found)
      return found
  }

  return null

}


export function nameOf(state: GameState, instanceId: string): string {
  const found = findCard(state, instanceId)

  return found ? state.defs[found.defId].name : instanceId

}


export function codeOf(state: GameState, instanceId: string): string {
  const found = findCard(state, instanceId)

  return found ? state.defs[found.defId].id : instanceId

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
      return 'Omitir'
    case 'DeclareBlock':
      return `Bloquear con ${nameOf(state, action.blockerId)}`
    case 'PassBlock':
      return 'No bloquear'
    case 'UseCounter':
      return `Counter: ${nameOf(state, action.instanceId)}`
    case 'UseCounterEvent':
      return `Event [Counter]: ${nameOf(state, action.instanceId)}`
    case 'PassCounter':
      return 'No usar Counter'
    case 'RevealTrigger':
      return 'Revelar Trigger'
    case 'PassTrigger':
      return 'Omitir Trigger'
    case 'ActivateEffect':
      return `Activar ${nameOf(state, action.source)} (efecto ${action.index + 1})`
    case 'PlayCharacter':
      return action.replaceId ? `Reemplazar a ${nameOf(state, action.replaceId)}` : `Jugar ${nameOf(state, action.instanceId)}`
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
    return { title: CHOICE_TEXTS[state.pending.kind], options: options(legal) }
  if (state.battle && state.battle.attackerPlayer !== viewer && state.battle.step !== 'counter') {
    const titles = { block: 'Paso de bloqueo', trigger: 'Paso de Trigger' }

    return { title: titles[state.battle.step], options: options(legal) }

  }

  return null

}
