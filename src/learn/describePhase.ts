import { getLegalActions } from '../engine'
import type { Action, GameState, PlayerId } from '../engine'
import { nameOf } from '../ui/prompts'
import { BATTLE_STEP_TEXTS, CHOICE_TEXTS, FIRST_TURN_TEXTS, PHASE_TEXTS, WAIT_TEXT } from './texts'

export interface PhaseDescription {
  title: string
  explanation: string
  actions: string[]

}


function names(state: GameState, player: PlayerId, ids: string[]): string {
  return [...new Set(ids)].map(id => id === 'leader' ? nameOf(state, state.players[player].leader.instanceId) : nameOf(state, id)).join(', ')

}


function ids(actions: Action[], pick: (action: Action) => string | null): string[] {
  return actions.flatMap(action => pick(action) ?? [])

}


function describeActions(state: GameState, player: PlayerId, legal: Action[]): string[] {
  const of      = (type: Action['type']) => legal.filter(action => action.type === type)
  const idsOf   = (type: Action['type']) => ids(of(type), action => 'instanceId' in action ? action.instanceId : null)
  const lines: [boolean, string][] = [
    [of('Mulligan').some(action => action.type === 'Mulligan' && !action.redraw), 'Quedarte con tu mano'],
    [of('Mulligan').some(action => action.type === 'Mulligan' && action.redraw), 'Rebarajar tu mano'],
    [of('PlayCharacter').length > 0, `Jugar un Character: ${names(state, player, idsOf('PlayCharacter'))}`],
    [of('PlayEvent').length > 0, `Jugar un Event: ${names(state, player, idsOf('PlayEvent'))}`],
    [of('PlayStage').length > 0, `Jugar un Stage: ${names(state, player, idsOf('PlayStage'))}`],
    [of('AttachDon').length > 0, 'Adjuntar un DON!! a tu Leader o a un Character (+1000 de power en tu turno)'],
    [of('ActivateEffect').length > 0, `Activar el efecto de: ${names(state, player, ids(of('ActivateEffect'), action => action.type === 'ActivateEffect' ? action.source : null))}`],
    [of('Attack').length > 0, `Atacar con: ${names(state, player, ids(of('Attack'), action => action.type === 'Attack' ? action.attacker : null))}`],
    [of('DeclareBlock').length > 0, `Bloquear con: ${names(state, player, ids(of('DeclareBlock'), action => action.type === 'DeclareBlock' ? action.blockerId : null))}`],
    [of('PassBlock').length > 0, 'No bloquear'],
    [of('UseCounter').length > 0, `Usar Counter de la mano: ${names(state, player, idsOf('UseCounter'))}`],
    [of('UseCounterEvent').length > 0, `Jugar un Event [Counter]: ${names(state, player, idsOf('UseCounterEvent'))}`],
    [of('PassCounter').length > 0, 'No usar Counter'],
    [of('RevealTrigger').length > 0, 'Revelar el [Trigger]'],
    [of('PassTrigger').length > 0, 'No revelar el [Trigger]'],
    [of('Choose').length > 0, `Elegir: ${names(state, player, ids(of('Choose'), action => action.type === 'Choose' ? action.option : null))}`],
    [of('PassChoice').length > 0, 'No elegir nada'],
    [of('PassPhase').length > 0, state.phase === 'main' ? 'Terminar el turno' : 'Pasar de fase']
  ]

  return lines.filter(([present]) => present).map(([, line]) => line)

}


function firstTurnNotes(state: GameState): string[] {
  if (state.turn === 1 && state.active === state.first)
    return [FIRST_TURN_TEXTS.draw, FIRST_TURN_TEXTS.don]

  return []

}


export function describePhase(state: GameState, player: PlayerId): PhaseDescription {
  const legal   = getLegalActions(state, player)
  const actions = describeActions(state, player, legal)
  const wait    = legal.length === 0 && state.phase !== 'gameOver' ? [WAIT_TEXT] : []

  if (state.phase === 'gameOver')
    return { ...PHASE_TEXTS.gameOver, explanation: state.winner ? `Ganó ${state.winner === 'p1' ? 'Jugador 1' : 'Jugador 2'}.` : PHASE_TEXTS.gameOver.explanation, actions }
  if (state.pending)
    return { title: 'Elegir', explanation: [CHOICE_TEXTS[state.pending.kind], ...wait].join(' '), actions }
  if (state.battle)
    return { ...BATTLE_STEP_TEXTS[state.battle.step], explanation: [BATTLE_STEP_TEXTS[state.battle.step].explanation, ...wait].join(' '), actions }

  const notes = [...firstTurnNotes(state), ...(state.phase === 'main' && state.turn <= 2 ? [FIRST_TURN_TEXTS.attack] : [])]

  return { ...PHASE_TEXTS[state.phase], explanation: [PHASE_TEXTS[state.phase].explanation, ...notes, ...wait].join(' '), actions }

}
