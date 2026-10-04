import { describe, expect, it } from 'vitest'
import { activateError, apply, createGame, getLegalActions, mulliganDecider, opponentOf } from '../../src/engine'
import { nextInt } from '../../src/engine/rng'
import { BANISH_ID, buildDeckWith, COUNTER_EVENT_ID, defs, DOUBLE_ID, EVENT_ID, LEADER_ID, RUSH_ID, STAGE_2_ID, STAGE_ID } from './fixtures'
import type { EffectRegistry, GameState, PlayerId, PlayerState } from '../../src/engine'

const draw = (ctx: { owner: PlayerId }) => [{ op: 'draw' as const, player: ctx.owner, amount: 1 }]

const effects: EffectRegistry = {
  'T-C04': [{ timing: 'whenAttacking', run: ctx => [{ op: 'power', target: ctx.source, amount: 1000, duration: 'thisBattle' }] }],
  'T-C05': [{ timing: 'onPlay', run: draw }, { timing: 'trigger', run: draw }, { timing: 'activateMain', oncePerTurn: true, cost: { restDon: 1 }, run: ctx => [{ op: 'power', target: ctx.source, amount: 1000, duration: 'thisTurn' }] }],
  'T-C06': [{ timing: 'onKO', run: ctx => [{ op: 'choose', chooser: ctx.owner, kind: 'option', options: ['draw'], optional: true, then: draw(ctx) }] }],
  'T-C07': [{ timing: 'activateMain', cost: { restSelf: true, trashFromHand: 1 }, run: draw }, { timing: 'trigger', run: draw }],
  'T-C08': [{ timing: 'endOfYourTurn', run: draw }],
  [EVENT_ID]: [{ timing: 'main', run: ctx => [{ op: 'search', player: ctx.owner, amount: 3, type: 'Character' }] }],
  [COUNTER_EVENT_ID]: [{ timing: 'counter', run: draw }],
  [STAGE_ID]: [{ timing: 'onPlay', run: draw }],
}

const overrides = Object.fromEntries([RUSH_ID, DOUBLE_ID, BANISH_ID, EVENT_ID, COUNTER_EVENT_ID, STAGE_ID, STAGE_2_ID, RUSH_ID, DOUBLE_ID, BANISH_ID, EVENT_ID, COUNTER_EVENT_ID, STAGE_ID, STAGE_2_ID].map((id, i) => [i, id]))

function totalDon(player: PlayerState): number {
  return player.donDeck + player.donActive + player.donRested + player.leaderAttachedDon + player.characters.reduce((sum, character) => sum + character.attachedDon, 0)

}


function deciderOf(state: GameState): PlayerId {
  if (state.phase === 'mulligan')
    return mulliganDecider(state)
  if (state.pending)
    return state.pending.player

  return state.battle ? opponentOf(state.battle.attackerPlayer) : state.active

}


function playout(seed: number): { state: GameState; seen: Set<string> } {
  const deck = { leader: LEADER_ID, cards: buildDeckWith(overrides) }
  const seen = new Set<string>()
  let state  = createGame({ seed, defs, decks: { p1: deck, p2: deck }, effects })
  let rng    = seed + 1000

  for (let step = 0; step < 5000; step++) {
    if (state.phase === 'gameOver')
      return { state, seen }

    const actor   = deciderOf(state)
    const actions = getLegalActions(state, actor)
    const rolled  = nextInt(rng, actions.length)

    expect(actions.length).toBeGreaterThan(0)
    expect(getLegalActions(state, opponentOf(actor))).toEqual([])

    for (const action of actions) {
      seen.add(action.type)
      expect(() => apply(state, action)).not.toThrow()
    }

    rng   = rolled.seed
    state = apply(state, actions[rolled.value]).state

    for (const id of ['p1', 'p2'] as const) {
      expect(totalDon(state.players[id])).toBe(10)
      expect(state.players[id].characters.length).toBeLessThanOrEqual(5)
    }

    expect(state.pending === null || state.pending.options.length > 0).toBe(true)
  }

  throw new Error('La partida no terminó')

}


describe('getLegalActions con efectos', () => {

  it('partidas al azar con efectos solo usan acciones legales y no se cuelgan', () => {
    const seen = new Set<string>()

    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const end = playout(seed)

      end.seen.forEach(type => seen.add(type))

      expect(end.state.phase).toBe('gameOver')
      expect(end.state.winner).not.toBeNull()
      expect(end.state.pending).toBeNull()
    }

    for (const type of ['PlayEvent', 'PlayStage', 'ActivateEffect', 'Choose', 'UseCounterEvent', 'RevealTrigger', 'PassTrigger'])
      expect(seen.has(type)).toBe(true)

  })


  it('acciones fuera de la lista lanzan error', () => {
    const deck  = { leader: LEADER_ID, cards: buildDeckWith(overrides) }
    const start = createGame({ seed: 1, defs, decks: { p1: deck, p2: deck }, effects })

    expect(() => apply(start, { type: 'Choose', player: 'p1', option: 'x' })).toThrow(/No hay una decisión pendiente/)
    expect(() => apply(start, { type: 'RevealTrigger', player: 'p1' })).toThrow(/paso trigger/)
    expect(() => apply(start, { type: 'ActivateEffect', player: 'p1', source: 'p1-leader', index: 0 })).toThrow()
    expect(() => apply(start, { type: 'PlayEvent', player: 'p1', instanceId: 'p1-0' })).toThrow()

  })


  it('activateError explica por qué una activación no es posible', () => {
    const deck  = { leader: LEADER_ID, cards: buildDeckWith(overrides) }
    const start = createGame({ seed: 1, defs, decks: { p1: deck, p2: deck }, effects })

    expect(activateError(start, 'p1', 'p1-leader', 0)).toMatch(/no tiene el efecto/)

  })

})
