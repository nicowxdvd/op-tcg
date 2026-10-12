import { describe, expect, it } from 'vitest'
import { describeEntry } from '../../src/learn/logEntry'
import type { LogContext } from '../../src/learn/logEntry'
import { startGame } from '../engine/helpers'

const state   = startGame()
const context: LogContext = { names: { p1: 'Tú', p2: 'IA · Normal' }, self: 'p1' }
const mine    = state.players.p1.hand[0].instanceId
const def     = state.defs[state.players.p1.hand[0].defId]

describe('describeEntry', () => {

  it('el Refresh abre un separador de turno con el nombre en mayúsculas', () => {
    expect(describeEntry({ type: 'PhaseChanged', phase: 'refresh', turn: 2, active: 'p2' }, state, context)).toEqual({ kind: 'turn', text: 'TURNO 2 · IA · NORMAL' })

  })


  it('las demás fases no escriben nada en el log', () => {
    expect(describeEntry({ type: 'PhaseChanged', phase: 'main', turn: 2, active: 'p2' }, state, context)).toBeNull()

  })


  it('jugar una carta lleva actor propio y chip con código y nombre', () => {
    expect(describeEntry({ type: 'CharacterPlayed', player: 'p1', instanceId: mine }, state, context)).toEqual({
      kind: 'line',
      icon: 'person',
      segments: [{ kind: 'self', text: 'Tú' }, { kind: 'text', text: 'jugó' }, { kind: 'card', text: `${def.id} ${def.name}` }]
    })

  })


  it('el rival usa el tipo actor', () => {
    const entry = describeEntry({ type: 'DonAdded', player: 'p2', amount: 2 }, state, context)

    expect(entry).toMatchObject({ kind: 'line', segments: [{ kind: 'actor', text: 'IA · Normal' }, { kind: 'text', text: '+2 DON!!' }] })

  })


  it('el timing de un efecto va sin corchetes', () => {
    const entry = describeEntry({ type: 'EffectTriggered', player: 'p1', source: mine, timing: 'endOfYourTurn' }, state, context)

    expect(entry).toMatchObject({ kind: 'line', segments: [{ kind: 'card' }, { kind: 'timing', text: 'End of Your Turn' }] })

  })


  it('un evento sin formato propio cambia Jugador 1/2 por los nombres', () => {
    const entry = describeEntry({ type: 'BlockPassed', player: 'p2' }, state, context)

    expect(entry).toMatchObject({ kind: 'line', segments: [{ kind: 'actor', text: 'IA · Normal' }, { kind: 'text' }] })
    expect(JSON.stringify(entry)).not.toContain('Jugador')

  })

})
