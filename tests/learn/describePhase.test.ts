import { describe, expect, it } from 'vitest'
import type { GameState, Phase } from '../../src/engine'
import { describePhase } from '../../src/learn/describePhase'
import { PHASE_TEXTS } from '../../src/learn/texts'
import { newGame, startGame } from '../engine/helpers'

const other = (state: GameState) => state.active === 'p1' ? 'p2' : 'p1'

describe('describePhase', () => {

  it('explica el Mulligan y ofrece las dos jugadas', () => {
    const state = newGame()
    const info  = describePhase(state, state.first)

    expect(info.title).toBe('Mulligan')
    expect(info.actions).toEqual(['Quedarte con tu mano', 'Rebarajar tu mano'])

  })


  it('en el turno 1 explica que el primer jugador no roba y recibe 1 DON!!', () => {
    const state = startGame()
    const info  = describePhase(state, state.active)

    expect(state.turn).toBe(1)
    expect(info.explanation).toContain('no roba carta')
    expect(info.explanation).toContain('1 DON!!')
    expect(info.explanation).toContain('nadie puede atacar')

  })


  it.each(['refresh', 'draw', 'don', 'main', 'end'] as Phase[])('describe la fase %s', phase => {
    const state = { ...startGame(), phase, turn: 5 }
    const info  = describePhase(state, state.active)

    expect(info.title).toBe(PHASE_TEXTS[phase].title)
    expect(info.explanation).toContain(PHASE_TEXTS[phase].explanation)
    expect(info.explanation).not.toContain('no roba carta')

  })


  it('la fase Main lista las jugadas de getLegalActions', () => {
    const state = startGame()
    const info  = describePhase(state, state.active)

    expect(info.actions).toContain('Terminar el turno')
    expect(info.actions.some(line => line.startsWith('Adjuntar un DON!!'))).toBe(true)
    expect(info.actions.some(line => line.startsWith('Jugar un Character: '))).toBe(true)
    expect(info.actions.some(line => line.startsWith('Atacar'))).toBe(false)

  })


  it('a partir del turno 3 lista los ataques', () => {
    const state = { ...startGame(), turn: 3 }

    expect(describePhase(state, state.active).actions.some(line => line.startsWith('Atacar con: Leader Rojo'))).toBe(true)

  })


  it('el jugador sin jugadas ve que decide el rival', () => {
    const state = startGame()
    const info  = describePhase(state, other(state))

    expect(info.actions).toEqual([])
    expect(info.explanation).toContain('Ahora decide el rival.')

  })


  it.each([['block', 'No bloquear'], ['counter', 'No usar Counter']] as const)('explica el paso %s de la batalla', (step, pass) => {
    const base    = { ...startGame(), turn: 3 }
    const battle  = { attacker: 'leader', target: 'leader', attackerPlayer: base.active, step, counterPower: 0 }
    const state   = { ...base, battle }
    const info    = describePhase(state, other(state))

    expect(info.title).toBe(`Batalla: ${step === 'block' ? 'Block' : 'Counter'}`)
    expect(info.actions).toContain(pass)

  })


  it('el atacante espera durante la batalla', () => {
    const base  = { ...startGame(), turn: 3 }
    const state = { ...base, battle: { attacker: 'leader', target: 'leader', attackerPlayer: base.active, step: 'block' as const, counterPower: 0 } }

    expect(describePhase(state, state.active).actions).toEqual([])

  })


  it('describe la elección pendiente de un efecto', () => {
    const base  = startGame()
    const state = { ...base, pending: { player: base.active, kind: 'confirm' as const, options: [], optional: true, resume: { source: 'x', owner: base.active, then: [], otherwise: [], rest: [] } } }
    const info  = describePhase(state, base.active)

    expect(info.title).toBe('Elegir')
    expect(info.actions).toContain('No elegir nada')

  })


  it('anuncia al ganador al terminar la partida', () => {
    const state = { ...startGame(), phase: 'gameOver' as const, winner: 'p2' as const }

    expect(describePhase(state, 'p1').explanation).toBe('Ganó Jugador 2.')

  })

})
