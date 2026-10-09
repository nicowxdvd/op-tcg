import { getPower } from '../engine'
import type { GameEvent, GameState, PlayerId } from '../engine'
import { nameOf } from '../ui/prompts'
import { DURATION_NAMES, PHASE_NAMES, TIMING_NAMES } from './texts'

type Describers = { [K in GameEvent['type']]: (event: Extract<GameEvent, { type: K }>, state: GameState) => string }


function who(player: PlayerId): string {
  return player === 'p1' ? 'Jugador 1' : 'Jugador 2'

}


function cardName(state: GameState, player: PlayerId, id: 'leader' | string): string {
  return id === 'leader' ? nameOf(state, state.players[player].leader.instanceId) : nameOf(state, id)

}


function powerOf(state: GameState, player: PlayerId, id: 'leader' | string): number | null {
  try {
    return getPower(state, id === 'leader' ? state.players[player].leader.instanceId : id)
  }
  catch {
    return null
  }

}


function attack(event: Extract<GameEvent, { type: 'AttackDeclared' }>, state: GameState): string {
  const rival    = event.player === 'p1' ? 'p2' : 'p1'
  const attacker = cardName(state, event.player, event.attacker)
  const target   = event.target === 'leader' ? 'al Leader rival' : `a ${cardName(state, rival, event.target)}`
  const mine     = powerOf(state, event.player, event.attacker)
  const theirs   = powerOf(state, rival, event.target)

  return mine !== null && theirs !== null ? `${attacker} ataca ${target}, ${mine} contra ${theirs}` : `${attacker} ataca ${target}`

}


const DESCRIBERS: Describers = {
  FirstChosen: event => `${who(event.player)} elige jugar ${event.first === event.player ? 'primero' : 'segundo'}`,
  MulliganDecided: event => `${who(event.player)} ${event.redraw ? 'rebaraja su mano' : 'se queda con su mano'}`,
  GameStarted: event => `Empieza la partida: juega primero ${who(event.first)}`,
  PhaseChanged: event => `Turno ${event.turn} de ${who(event.active)}: fase ${PHASE_NAMES[event.phase]}`,
  CardDrawn: event => `${who(event.player)} roba una carta`,
  DonAdded: event => `${who(event.player)} recibe ${event.amount} DON!!`,
  CharacterPlayed: (event, state) => `${who(event.player)} juega el Character ${nameOf(state, event.instanceId)}`,
  EventPlayed: (event, state) => `${who(event.player)} juega el Event ${nameOf(state, event.instanceId)}`,
  StagePlayed: (event, state) => `${who(event.player)} juega el Stage ${nameOf(state, event.instanceId)}`,
  StageTrashed: (event, state) => `${nameOf(state, event.instanceId)} de ${who(event.player)} va al Trash`,
  CharacterTrashed: (event, state) => `${nameOf(state, event.instanceId)} de ${who(event.player)} va al Trash`,
  DonAttached: (event, state) => `${who(event.player)} adjunta 1 DON!! a ${cardName(state, event.player, event.target)}`,
  AttackDeclared: attack,
  BlockDeclared: (event, state) => `${who(event.player)} bloquea con ${nameOf(state, event.blockerId)}`,
  BlockPassed: event => `${who(event.player)} no bloquea`,
  CounterUsed: (event, state) => `${who(event.player)} usa ${nameOf(state, event.instanceId)} como Counter: +${event.counterPower} de power`,
  CounterPassed: event => `${who(event.player)} no usa Counter`,
  LifeTaken: event => `${who(event.player)} pierde 1 Life: la carta pasa a su mano`,
  LifeBanished: event => `${who(event.player)} pierde 1 Life por Banish: la carta va al Trash`,
  CharacterKOd: (event, state) => `${nameOf(state, event.instanceId)} de ${who(event.player)} es K.O.`,
  EffectTriggered: (event, state) => `Se activa el efecto ${TIMING_NAMES[event.timing]} de ${nameOf(state, event.source)}`,
  CharacterRested: (event, state) => `${nameOf(state, event.target)} pasa a reposo`,
  CharacterActivated: (event, state) => `${nameOf(state, event.target)} pasa a activo`,
  CardSearched: (event, state) => `${who(event.player)} busca en su mazo y toma ${nameOf(state, event.instanceId)}`,
  CardToLife: event => `${who(event.player)} pone una carta en su Life`,
  CardToHand: event => `Una carta pasa a la mano de ${who(event.player)}`,
  ChoiceRequested: event => `${who(event.player)} debe elegir una opción`,
  ChoiceMade: (event, state) => `${who(event.player)} elige ${nameOf(state, event.option)}`,
  ChoicePassed: event => `${who(event.player)} no elige nada`,
  EffectActivated: (event, state) => `${who(event.player)} activa el efecto ${event.index + 1} de ${nameOf(state, event.source)}`,
  CardDiscarded: (event, state) => `${who(event.player)} descarta ${nameOf(state, event.instanceId)} al Trash`,
  DonRested: event => `${who(event.player)} pone ${event.amount} DON!! en reposo`,
  DonActivated: event => `${who(event.player)} pone ${event.amount} DON!! en activo`,
  PowerModified: (event, state) => `${nameOf(state, event.target)} ${event.amount >= 0 ? 'gana' : 'pierde'} ${Math.abs(event.amount)} de power ${DURATION_NAMES[event.duration]}`,
  TriggerAvailable: event => `${who(event.player)} puede revelar un [Trigger]`,
  TriggerRevealed: (event, state) => `${who(event.player)} revela el [Trigger] de ${nameOf(state, event.instanceId)}`,
  TriggerPassed: event => `${who(event.player)} no revela el [Trigger]`,
  BattleEnded: event => event.connected ? 'La batalla termina: el ataque conecta' : 'La batalla termina: el ataque no conecta',
  GameOver: event => `Fin de la partida: gana ${who(event.winner)}`
}


export function describeEvent(event: GameEvent, state: GameState): string {
  const describe = DESCRIBERS[event.type] as ((event: GameEvent, state: GameState) => string) | undefined

  return describe ? describe(event, state) : event.type

}
