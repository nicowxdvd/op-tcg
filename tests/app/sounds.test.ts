import { describe, expect, it } from 'vitest'
import { soundFor, soundsFor } from '../../src/app/sounds'

describe('sounds', () => {
  it('asigna un sonido a cada evento relevante', () => {
    expect(soundFor({ type: 'CardDrawn', player: 'p1', instanceId: 'a' })).toBe('draw')
    expect(soundFor({ type: 'CharacterPlayed', player: 'p1', instanceId: 'a' })).toBe('play')
    expect(soundFor({ type: 'EventPlayed', player: 'p1', instanceId: 'a' })).toBe('play')
    expect(soundFor({ type: 'AttackDeclared', player: 'p1', attacker: 'leader', target: 'leader' })).toBe('attack')
    expect(soundFor({ type: 'LifeTaken', player: 'p2', instanceId: 'a' })).toBe('damage')
    expect(soundFor({ type: 'CharacterKOd', player: 'p2', instanceId: 'a' })).toBe('damage')
    expect(soundFor({ type: 'GameOver', winner: 'p1' })).toBe('victory')

  })


  it('los eventos sin sonido devuelven null', () => {
    expect(soundFor({ type: 'BlockPassed', player: 'p1' })).toBeNull()

  })


  it('soundsFor no repite sonidos dentro de un mismo lote', () => {
    const draw = { type: 'CardDrawn' as const, player: 'p1' as const, instanceId: 'a' }

    expect(soundsFor([draw, draw, { type: 'BlockPassed', player: 'p1' }, { type: 'GameOver', winner: 'p1' }])).toEqual(['draw', 'victory'])

  })

})
