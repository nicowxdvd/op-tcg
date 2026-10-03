import { describe, expect, it } from 'vitest'
import { apply, getLegalActions, getPower, mulliganDecider, opponentOf } from '../../src/engine'
import { nextInt } from '../../src/engine/rng'
import { LEADER_ID } from './fixtures'
import { card, inPlay, newGame, other, pass, startGame, withPlayer } from './helpers'
import type { Action, GameState, PlayerId, PlayerState } from '../../src/engine'

function stage(donActive: number): GameState {
  const start = startGame()
  const id    = start.first

  return withPlayer(start, id, { donActive, hand: [card(id, 'T-C04', 1), card(id, 'T-C01', 2), card(id, 'T-C02', 3), card(id, LEADER_ID, 4)], characters: [] })

}


function fullBoard(): GameState {
  const state = stage(10)
  const id    = state.first

  return withPlayer(state, id, { characters: [1, 2, 3, 4, 5].map(n => inPlay(card(id, 'T-C02', 10 + n))) })

}


function totalDon(player: PlayerState): number {
  return player.donDeck + player.donActive + player.donRested + player.leaderAttachedDon + player.characters.reduce((sum, c) => sum + c.attachedDon, 0)

}


function playout(seed: number): GameState {
  let state = newGame(seed)
  let rng   = seed + 1000

  for (let step = 0; step < 5000; step++) {
    if (state.phase === 'gameOver')
      return state

    const actor   = state.phase === 'mulligan' ? mulliganDecider(state) : state.active
    const actions = getLegalActions(state, actor)
    const rolled  = nextInt(rng, actions.length)

    expect(actions.length).toBeGreaterThan(0)
    expect(getLegalActions(state, opponentOf(actor))).toEqual([])

    for (const action of actions)
      expect(() => apply(state, action)).not.toThrow()

    rng   = rolled.seed
    state = apply(state, actions[rolled.value]).state

    for (const id of ['p1', 'p2'] as const) {
      expect(totalDon(state.players[id])).toBe(10)
      expect(state.players[id].characters.length).toBeLessThanOrEqual(5)
    }
  }

  throw new Error('La partida no terminó')

}


describe('getLegalActions', () => {

  it('en el mulligan solo decide el jugador que le toca', () => {
    const state  = newGame()
    const second = other(state.first)

    expect(getLegalActions(state, state.first)).toEqual([{ type: 'Mulligan', player: state.first, redraw: false }, { type: 'Mulligan', player: state.first, redraw: true }])
    expect(getLegalActions(state, second)).toEqual([])

    const after = apply(state, { type: 'Mulligan', player: state.first, redraw: false }).state

    expect(getLegalActions(after, state.first)).toEqual([])
    expect(getLegalActions(after, second)).toHaveLength(2)

  })


  it('en el Main lista las jugadas pagables, los DON!! adjuntables y pasar', () => {
    const state = stage(1)
    const id    = state.first

    expect(getLegalActions(state, id)).toEqual([
      { type: 'PlayCharacter', player: id, instanceId: `${id}-t2` },
      { type: 'PlayCharacter', player: id, instanceId: `${id}-t3` },
      { type: 'AttachDon', player: id, target: 'leader' },
      { type: 'PassPhase', player: id },
    ])

  })


  it('sin DON!! activo no ofrece adjuntar ni cartas con cost', () => {
    const state = stage(0)
    const id    = state.first

    expect(getLegalActions(state, id)).toEqual([{ type: 'PlayCharacter', player: id, instanceId: `${id}-t2` }, { type: 'PassPhase', player: id }])

  })


  it('ofrece adjuntar a cada Character en juego', () => {
    const state = withPlayer(stage(1), stage(1).first, { characters: [inPlay(card('p1', 'T-C02', 20)), inPlay(card('p1', 'T-C02', 21))] })
    const id    = state.first
    const attach = getLegalActions(state, id).filter(action => action.type === 'AttachDon')

    expect(attach.map(action => action.type === 'AttachDon' && action.target)).toEqual(['leader', 'p1-t20', 'p1-t21'])

  })


  it('con 5 Characters ofrece una jugada por cada replaceId posible', () => {
    const state = fullBoard()
    const id    = state.first
    const plays = getLegalActions(state, id).filter(action => action.type === 'PlayCharacter')

    expect(plays).toHaveLength(3 * 5)
    expect(plays.every(action => action.type === 'PlayCharacter' && action.replaceId !== undefined)).toBe(true)

  })


  it('devuelve vacío para el jugador que no es el activo', () => {
    const state = stage(5)

    expect(getLegalActions(state, other(state.first))).toEqual([])

  })


  it('devuelve vacío fuera del Main y con la partida terminada', () => {
    const state = stage(5)
    const over  = { ...state, phase: 'gameOver' as const }

    expect(getLegalActions({ ...state, phase: 'draw' }, state.first)).toEqual([])
    expect(getLegalActions(over, state.first)).toEqual([])
    expect(getLegalActions(over, other(state.first))).toEqual([])

  })


  it('cada acción devuelta se aplica sin error', () => {
    const states = [newGame(), startGame(), stage(0), stage(1), stage(10), fullBoard(), pass(startGame()).state]

    for (const state of states)
      for (const id of ['p1', 'p2'] as PlayerId[])
        for (const action of getLegalActions(state, id))
          expect(() => apply(state, action)).not.toThrow()

  })


  it('una acción fuera de la lista lanza error', () => {
    const state = stage(1)
    const id    = state.first
    const rival = other(id)
    const illegal: Action[] = [
      { type: 'PlayCharacter', player: id, instanceId: `${id}-t1` },
      { type: 'PlayCharacter', player: id, instanceId: `${id}-t4` },
      { type: 'PlayCharacter', player: id, instanceId: `${id}-t2`, replaceId: `${id}-t3` },
      { type: 'AttachDon', player: id, target: `${id}-t99` },
      { type: 'PassPhase', player: rival },
      { type: 'Mulligan', player: id, redraw: false },
    ]
    const legal = getLegalActions(state, id)

    for (const action of illegal) {
      expect(legal).not.toContainEqual(action)
      expect(() => apply(state, action)).toThrow()
    }

  })


  it('partidas al azar hasta el final solo usan acciones legales y conservan los DON!!', () => {
    for (const seed of [1, 2, 3]) {
      const end = playout(seed)

      expect(end.phase).toBe('gameOver')
      expect(end.winner).not.toBeNull()
    }

  })

})


describe('getPower', () => {

  it('devuelve el power base del Leader y de un Character', () => {
    const state = withPlayer(startGame(), 'p1', { characters: [inPlay(card('p1', 'T-C04', 1))] })

    expect(getPower(state, 'p1-leader')).toBe(5000)
    expect(getPower(state, 'p1-t1')).toBe(5000)

  })


  it('suma 1000 por cada DON!! adjunto en el turno del dueño', () => {
    const start = startGame()
    const id    = start.first
    const state = withPlayer(start, id, { leaderAttachedDon: 2, characters: [inPlay(card(id, 'T-C01', 1), 1, 3)] })

    expect(getPower(state, `${id}-leader`)).toBe(7000)
    expect(getPower(state, `${id}-t1`)).toBe(5000)

  })


  it('no suma el bono en el turno del rival', () => {
    const start  = startGame()
    const id     = start.first
    const staged = withPlayer(start, id, { leaderAttachedDon: 2, characters: [inPlay(card(id, 'T-C01', 1), 1, 3)] })
    const rival  = pass(staged).state

    expect(rival.active).toBe(other(id))
    expect(rival.players[id].leaderAttachedDon).toBe(2)
    expect(getPower(rival, `${id}-leader`)).toBe(5000)
    expect(getPower(rival, `${id}-t1`)).toBe(2000)

  })


  it('el DON!! adjunto con AttachDon se refleja en el power', () => {
    const state  = stage(2)
    const id     = state.first
    const board  = withPlayer(state, id, { characters: [inPlay(card(id, 'T-C01', 30))] })
    const first  = apply(board, { type: 'AttachDon', player: id, target: `${id}-t30` }).state
    const second = apply(first, { type: 'AttachDon', player: id, target: `${id}-t30` }).state

    expect(getPower(board, `${id}-t30`)).toBe(2000)
    expect(getPower(first, `${id}-t30`)).toBe(3000)
    expect(getPower(second, `${id}-t30`)).toBe(4000)

  })


  it('lanza error si la carta no está en juego', () => {
    const state = stage(1)
    const id    = state.first

    expect(() => getPower(state, `${id}-t1`)).toThrow(/no está en juego/)
    expect(() => getPower(state, 'p9-zzz')).toThrow(/no está en juego/)

  })

})
