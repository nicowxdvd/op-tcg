import type { Duration, GameState, Modifier } from '../types'

export function addModifier(state: GameState, modifier: Modifier): GameState {
  return { ...state, modifiers: [...state.modifiers, modifier] }

}


export function modifierPower(state: GameState, instanceId: string): number {
  return state.modifiers.filter(modifier => modifier.target === instanceId).reduce((sum, modifier) => sum + modifier.power, 0)

}


export function clearModifiers(state: GameState, duration: Duration): GameState {
  return { ...state, modifiers: state.modifiers.filter(modifier => modifier.duration !== duration) }

}
