import type { ChoiceKind, Duration, Phase, Timing } from '../engine'

export interface PhaseText {
  title: string
  explanation: string

}

export type BattleStep = 'block' | 'counter' | 'trigger'

export const PHASE_NAMES: Record<Phase, string> = { mulligan: 'Mulligan', refresh: 'Refresh', draw: 'Draw', don: 'DON!!', main: 'Main', end: 'End', gameOver: 'Fin' }

export const PHASE_TEXTS: Record<Phase, PhaseText> = {
  mulligan: { title: 'Mulligan', explanation: 'Puedes quedarte con tu mano de 5 cartas o rebarajarla una sola vez para robar otras 5.' },
  refresh: { title: 'Refresh', explanation: 'Los DON!! adjuntos vuelven al área de costo y todas tus cartas se ponen activas.' },
  draw: { title: 'Draw', explanation: 'Robas 1 carta del mazo. Si no te quedan cartas para robar, pierdes la partida.' },
  don: { title: 'DON!!', explanation: 'Pasas 2 DON!! del mazo de DON!! al área de costo, activos.' },
  main: { title: 'Main', explanation: 'Juega cartas pagando su costo con DON!! activos, adjunta DON!! (+1000 de power en tu turno), activa efectos y ataca. Un Character no ataca el turno en que entra, salvo con Rush.' },
  end: { title: 'End', explanation: 'Termina tu turno y empieza el del rival.' },
  gameOver: { title: 'Fin de la partida', explanation: 'La partida terminó.' }
}

export const FIRST_TURN_TEXTS = {
  draw: 'Turno 1: el primer jugador no roba carta.',
  don: 'Turno 1: el primer jugador recibe solo 1 DON!!.',
  attack: 'En los dos primeros turnos de la partida nadie puede atacar.'
} as const

export const WAIT_TEXT = 'Ahora decide el rival.'

export const BATTLE_STEP_TEXTS: Record<BattleStep, PhaseText> = {
  block: { title: 'Batalla: Block', explanation: 'El defensor puede descansar un Blocker para que ese Character reciba el ataque en lugar del objetivo.' },
  counter: { title: 'Batalla: Counter', explanation: 'El defensor puede descartar Characters de su mano con valor Counter o jugar Events [Counter] para sumar power. El ataque conecta si el power del atacante es igual o mayor.' },
  trigger: { title: 'Batalla: Trigger', explanation: 'La carta de Life dañada tiene [Trigger]: su dueño puede revelarla y activar el efecto en lugar de ponerla en su mano.' }
}

export const CHOICE_TEXTS: Record<ChoiceKind, string> = {
  target: 'Elige el objetivo del efecto.',
  option: 'Elige una de las opciones del efecto.',
  trashFromHand: 'Elige una carta de tu mano para enviarla al Trash.',
  orderDeck: 'Elige el orden de las cartas del mazo.',
  confirm: 'Confirma si quieres usar el efecto.'
}

export const TIMING_NAMES: Record<Timing, string> = {
  onPlay: '[On Play]',
  whenAttacking: '[When Attacking]',
  onKO: '[On K.O.]',
  activateMain: '[Activate: Main]',
  endOfYourTurn: '[End of Your Turn]',
  trigger: '[Trigger]',
  counter: '[Counter]',
  main: '[Main]',
  passive: 'pasivo',
  onBattle: 'de batalla'
}

export const DURATION_NAMES: Record<Duration, string> = { thisTurn: 'este turno', thisBattle: 'esta batalla', permanent: 'de forma permanente' }

export const KEYWORD_TEXTS: Record<string, string> = {
  'Rush': 'Rush: este Character puede atacar el mismo turno en que entra al juego.',
  'Blocker': 'Blocker: cuando el rival declara un ataque, puedes descansar este Character para que reciba el ataque.',
  'Double Attack': 'Double Attack: si este ataque conecta con tu rival, le quita 2 cartas de Life en lugar de 1.',
  'Banish': 'Banish: la carta de Life que pierde el rival va al Trash y su [Trigger] no se activa.',
  'On Play': '[On Play]: el efecto se activa cuando juegas esta carta desde la mano.',
  'When Attacking': '[When Attacking]: el efecto se activa cuando esta carta declara un ataque.',
  'On K.O.': '[On K.O.]: el efecto se activa cuando este Character es K.O.',
  'Trigger': '[Trigger]: si esta carta sale de tu Life por un daño, puedes revelarla y activar su efecto en lugar de ponerla en tu mano.',
  'Counter': '[Counter]: en el Counter step puedes jugar este Event pagando su costo para sumar power a tu Leader o Character.',
  'DON!! xN': '[DON!! xN]: el efecto solo funciona si esta carta tiene N o más DON!! adjuntos.',
  'Once Per Turn': '[Once Per Turn]: el efecto se puede activar una sola vez por turno.',
  'Activate: Main': '[Activate: Main]: puedes activar este efecto durante tu Main phase.',
  'Main': '[Main]: este Event se juega durante tu Main phase.',
  'Your Turn': '[Your Turn]: el efecto solo se aplica durante tu turno.',
  "Opponent's Turn": "[Opponent's Turn]: el efecto solo se aplica durante el turno del rival.",
  'End of Your Turn': '[End of Your Turn]: el efecto se activa al final de tu turno.'
}
