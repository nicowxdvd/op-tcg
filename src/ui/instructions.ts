import type { Action, GameState, PlayerId } from '../engine'

export interface Instruction {
  title: string
  text: string

}

const PHASES: Record<GameState['phase'], string> = { mulligan: 'Mulligan', refresh: 'Refresh', draw: 'Draw', don: 'DON!!', main: 'Main', end: 'End', gameOver: 'Fin' }


export function phaseLabel(state: GameState): string {
  return `Turno ${state.turn} · ${PHASES[state.phase]}`

}


export function instructionFor(state: GameState, legal: Action[], viewer: PlayerId): Instruction | null {
  if (state.winner)
    return { title: 'FIN', text: state.winner === viewer ? 'Ganaste la partida.' : 'Perdiste la partida.' }
  if (legal.length === 0)
    return { title: 'ESPERA', text: 'Juega el rival.' }
  if (state.phase === 'mulligan')
    return { title: 'ACTÚA TÚ', text: 'Mulligan: quedarse con la mano o rebarajar.' }
  if (state.pending)
    return { title: 'ACTÚA TÚ', text: 'Elige una opción para resolver el efecto.' }

  if (state.battle) {
    const steps = { block: 'Elige un Blocker o no bloquees.', counter: 'Usa un Counter o no respondas.', trigger: 'Revela el Trigger o sáltalo.' }

    return { title: 'ACTÚA TÚ', text: steps[state.battle.step] }

  }

  return { title: 'ACTÚA TÚ', text: 'Fase principal: juega cartas, adjunta DON!! y ataca.' }

}
