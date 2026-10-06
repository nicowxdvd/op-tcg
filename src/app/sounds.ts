import type { GameEvent } from '../engine'

export type SoundName = 'draw' | 'play' | 'attack' | 'damage' | 'victory'


export function soundFor(event: GameEvent): SoundName | null {
  switch (event.type) {
    case 'CardDrawn':
      return 'draw'
    case 'CharacterPlayed':
    case 'EventPlayed':
    case 'StagePlayed':
      return 'play'
    case 'AttackDeclared':
      return 'attack'
    case 'LifeTaken':
    case 'LifeBanished':
    case 'CharacterKOd':
      return 'damage'
    case 'GameOver':
      return 'victory'
    default:
      return null
  }

}


export function soundsFor(events: GameEvent[]): SoundName[] {
  const names = events.map(soundFor).filter((name): name is SoundName => name !== null)

  return [...new Set(names)]

}
