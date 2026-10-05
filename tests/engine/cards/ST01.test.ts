import { describe, expect, it } from 'vitest'
import { apply } from '../../../src/engine/actions'
import { loadDeck, loadDefs } from '../../../src/data'
import { effectRegistry } from '../../../src/engine/effects/cards'
import { hasKeyword } from '../../../src/engine/effects/passive'
import { getLegalActions, getPower } from '../../../src/engine/queries'
import { createGame } from '../../../src/engine/state'
import { card, inPlay, other, withPlayer } from '../helpers'
import type { Action, GameState, PlayerId, PlayerState } from '../../../src/engine/types'

const defs   = loadDefs()
const LEADER = 'p1-leader'

function stage(mine: Partial<PlayerState> = {}, rival: Partial<PlayerState> = {}): GameState {
  const created = createGame({ seed: 5, defs, effects: effectRegistry, decks: { p1: loadDeck('st01'), p2: loadDeck('st02') } })
  const decided = apply(created, { type: 'Mulligan', player: created.first, redraw: false }).state
  const started = apply(decided, { type: 'Mulligan', player: other(created.first), redraw: false }).state
  const base    = withPlayer({ ...started, turn: 3, active: 'p1', phase: 'main' }, 'p1', { characters: [], hand: [], donActive: 0, donRested: 0, ...mine })

  return withPlayer(base, 'p2', { characters: [], hand: [], donActive: 0, donRested: 0, ...rival })

}


function char(owner: PlayerId, defId: string, n: number, don = 0) {
  return inPlay(card(owner, defId, n), 1, don)

}


function act(state: GameState, action: Action): GameState {
  return apply(state, action).state

}


function activate(state: GameState, source: string, index = 0): GameState {
  return act(state, { type: 'ActivateEffect', player: 'p1', source, index })

}


function choose(state: GameState, option: string): GameState {
  return act(state, { type: 'Choose', player: state.pending!.player, option })

}


function attack(state: GameState, attacker = LEADER): GameState {
  return act(state, { type: 'Attack', player: 'p1', attacker: attacker === LEADER ? 'leader' : attacker, target: 'leader' })

}


function toTrigger(state: GameState): GameState {
  return act(act(attack(state), { type: 'PassBlock', player: 'p2' }), { type: 'PassCounter', player: 'p2' })

}


function blockers(state: GameState): string[] {
  return getLegalActions(state, 'p2').flatMap(action => action.type === 'DeclareBlock' ? [action.blockerId] : [])

}


const rivalBlockers = [char('p2', 'ST01-006', 1), char('p2', 'ST02-013', 2)]
const filler        = card('p2', 'ST01-003', 90)

describe('vanilla and keyword-only cards', () => {

  it('have an empty effect list', () => {
    for (const id of ['ST01-003', 'ST01-006', 'ST01-008', 'ST01-009', 'ST01-010'])
      expect(effectRegistry[id]).toEqual([])

  })


  it('Chopper gets Blocker from its keyword', () => {
    expect(defs['ST01-006'].keywords).toEqual(['Blocker'])

  })

})


describe('ST01-001 Monkey.D.Luffy leader', () => {

  it('gives 1 rested DON!! to the Leader', () => {
    const result = choose(activate(stage({ donRested: 2 }), LEADER), LEADER)

    expect(result.players.p1).toMatchObject({ leaderAttachedDon: 1, donRested: 1 })

  })


  it('gives 1 rested DON!! to a Character', () => {
    const result = choose(activate(stage({ donRested: 2, characters: [char('p1', 'ST01-003', 1)] }), LEADER), 'p1-t1')

    expect(result.players.p1.characters[0].attachedDon).toBe(1)

  })


  it('can be used only once per turn', () => {
    const used = choose(activate(stage({ donRested: 2 }), LEADER), LEADER)

    expect(() => activate(used, LEADER)).toThrow(/no se puede activar/)

  })


  it('moves nothing without rested DON!!', () => {
    const result = choose(activate(stage({ donActive: 2 }), LEADER), LEADER)

    expect(result.players.p1).toMatchObject({ leaderAttachedDon: 0, donActive: 2 })

  })

})


describe('ST01-002 Usopp', () => {

  const attacking = (don: number) => stage({ characters: [char('p1', 'ST01-002', 1, don)] }, { characters: rivalBlockers })

  it('with DON!! x2 when attacking, Blockers with 5000 power or more cannot block', () => {
    expect(blockers(attack(attacking(2), 'p1-t1'))).toEqual(['p2-t1'])

  })


  it('with fewer than 2 DON!! attached does not lock any Blocker', () => {
    expect(blockers(attack(attacking(1), 'p1-t1'))).toEqual(['p2-t1', 'p2-t2'])

  })


  it('[Trigger] plays itself from the life', () => {
    const start  = stage({}, { life: [card('p2', 'ST01-002', 91), filler] })
    const result = act(toTrigger(start), { type: 'RevealTrigger', player: 'p2' })

    expect(result.players.p2.characters.map(item => item.card.instanceId)).toEqual(['p2-t91'])

  })


  it('[Trigger] does not play the card when the Trigger is declined', () => {
    const start  = stage({}, { life: [card('p2', 'ST01-002', 91), filler] })
    const result = act(toTrigger(start), { type: 'PassTrigger', player: 'p2' })

    expect(result.players.p2.characters).toEqual([])
    expect(result.players.p2.hand.map(item => item.instanceId)).toEqual(['p2-t91'])

  })

})


describe('ST01-004 Sanji', () => {

  it('with DON!! x2 gains Rush and can attack the turn it is played', () => {
    const state = stage({ characters: [{ ...char('p1', 'ST01-004', 1, 2), playedTurn: 3 }] }, { characters: [{ ...char('p2', 'ST01-003', 1), rested: true }] })

    expect(hasKeyword(state, 'p1-t1', 'Rush')).toBe(true)
    expect(getLegalActions(state, 'p1')).toContainEqual({ type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'p2-t1' })

  })


  it('with 1 DON!! attached has no Rush and cannot attack the turn it is played', () => {
    const state = stage({ characters: [{ ...char('p1', 'ST01-004', 1, 1), playedTurn: 3 }] }, { characters: [{ ...char('p2', 'ST01-003', 1), rested: true }] })

    expect(hasKeyword(state, 'p1-t1', 'Rush')).toBe(false)
    expect(getLegalActions(state, 'p1').some(action => action.type === 'Attack' && action.attacker === 'p1-t1')).toBe(false)

  })

})


describe('ST01-005 Jinbe', () => {

  const attacking = (don: number) => stage({ characters: [char('p1', 'ST01-005', 1, don), char('p1', 'ST01-003', 2)] })

  it('with DON!! x1 when attacking, gives +1000 to another Leader or Character', () => {
    const waiting = attack(attacking(1), 'p1-t1')
    const result  = choose(waiting, 'p1-t2')

    expect(waiting.pending?.options).toEqual([LEADER, 'p1-t2'])
    expect(getPower(result, 'p1-t2')).toBe(4000)

  })


  it('can give the +1000 to the Leader', () => {
    expect(getPower(choose(attack(attacking(1), 'p1-t1'), LEADER), LEADER)).toBe(6000)

  })


  it('without DON!! attached asks for nothing', () => {
    expect(attack(attacking(0), 'p1-t1').pending).toBeNull()

  })

})


describe('ST01-007 Nami', () => {

  it('gives 1 rested DON!! to a Character', () => {
    const state  = stage({ donRested: 1, characters: [char('p1', 'ST01-007', 1), char('p1', 'ST01-003', 2)] })
    const result = choose(activate(state, 'p1-t1'), 'p1-t2')

    expect(result.players.p1.characters[1].attachedDon).toBe(1)
    expect(result.players.p1.donRested).toBe(0)

  })


  it('can be used only once per turn', () => {
    const used = choose(activate(stage({ donRested: 2, characters: [char('p1', 'ST01-007', 1)] }), 'p1-t1'), LEADER)

    expect(() => activate(used, 'p1-t1')).toThrow(/no se puede activar/)

  })


  it('does nothing when the player declines the target', () => {
    const state  = stage({ donRested: 1, characters: [char('p1', 'ST01-007', 1)] })
    const result = act(activate(state, 'p1-t1'), { type: 'PassChoice', player: 'p1' })

    expect(result.players.p1).toMatchObject({ leaderAttachedDon: 0, donRested: 1 })

  })

})


describe('ST01-011 Brook', () => {

  const play = (): GameState => act(stage({ donActive: 2, hand: [card('p1', 'ST01-011', 1)] }), { type: 'PlayCharacter', player: 'p1', instanceId: 'p1-t1' })

  it('[On Play] gives up to 2 rested DON!! to the Leader', () => {
    expect(choose(play(), LEADER).players.p1).toMatchObject({ leaderAttachedDon: 2, donRested: 0 })

  })


  it('[On Play] gives nothing when the player declines the target', () => {
    const result = act(play(), { type: 'PassChoice', player: 'p1' })

    expect(result.players.p1).toMatchObject({ leaderAttachedDon: 0, donRested: 2 })

  })

})


describe('ST01-012 Monkey.D.Luffy character', () => {

  const attacking = (don: number) => stage({ characters: [char('p1', 'ST01-012', 1, don)] }, { characters: rivalBlockers })

  it('has Rush from its keyword', () => {
    expect(defs['ST01-012'].keywords).toEqual(['Rush'])

  })


  it('with DON!! x2 when attacking, the opponent cannot activate any Blocker', () => {
    expect(blockers(attack(attacking(2), 'p1-t1'))).toEqual([])

  })


  it('with 1 DON!! attached the opponent can still block', () => {
    expect(blockers(attack(attacking(1), 'p1-t1'))).toEqual(['p2-t1', 'p2-t2'])

  })


  it('the lock ends with the battle', () => {
    const done = act(act(attack(attacking(2), 'p1-t1'), { type: 'PassBlock', player: 'p2' }), { type: 'PassCounter', player: 'p2' })

    expect(done.restrictions).toEqual([])

  })

})


describe('ST01-013 Roronoa Zoro', () => {

  it('with DON!! x1 on your turn gains +1000 power on top of the DON!! bonus', () => {
    expect(getPower(stage({ characters: [char('p1', 'ST01-013', 1, 1)] }), 'p1-t1')).toBe(7000)

  })


  it('without DON!! attached gains nothing', () => {
    expect(getPower(stage({ characters: [char('p1', 'ST01-013', 1, 0)] }), 'p1-t1')).toBe(5000)

  })


  it('on the opponent\'s turn gains nothing even with DON!! attached', () => {
    const state = { ...stage({ characters: [char('p1', 'ST01-013', 1, 1)] }), active: 'p2' as const }

    expect(getPower(state, 'p1-t1')).toBe(5000)

  })

})


describe('ST01-014 Guard Point', () => {

  const defending = (don: number) => stage({}, { donActive: don, hand: [card('p2', 'ST01-014', 1)] })
  const counter   = { type: 'UseCounterEvent', player: 'p2', instanceId: 'p2-t1' } as const

  it('[Counter] gives +3000 power to the Leader during the battle and stops the attack', () => {
    const waiting = act(attack(defending(1)), { type: 'PassBlock', player: 'p2' })
    const chosen  = choose(act(waiting, counter), 'p2-leader')
    const lifeNow = defending(1).players.p2.life.length
    const result  = act(chosen, { type: 'PassCounter', player: 'p2' })

    expect(getPower(chosen, 'p2-leader')).toBe(8000)
    expect(result.players.p2.life).toHaveLength(lifeNow)
    expect(result.modifiers).toEqual([])

  })


  it('[Counter] the boost is lost when the player declines the target', () => {
    const waiting = act(attack(defending(1)), { type: 'PassBlock', player: 'p2' })
    const passed  = act(act(waiting, counter), { type: 'PassChoice', player: 'p2' })

    expect(getPower(passed, 'p2-leader')).toBe(5000)

  })


  it('[Counter] cannot be played without DON!! for its cost', () => {
    const waiting = act(attack(defending(0)), { type: 'PassBlock', player: 'p2' })

    expect(getLegalActions(waiting, 'p2')).not.toContainEqual(counter)

  })


  it('[Trigger] gives +1000 power to a Leader or Character during the turn', () => {
    const start  = stage({}, { life: [card('p2', 'ST01-014', 91), filler] })
    const result = choose(act(toTrigger(start), { type: 'RevealTrigger', player: 'p2' }), 'p2-leader')

    expect(result.modifiers).toEqual([{ target: 'p2-leader', power: 1000, duration: 'thisTurn', sourceId: 'p2-t91' }])

  })


  it('[Trigger] does nothing when the Trigger is declined', () => {
    const start  = stage({}, { life: [card('p2', 'ST01-014', 91), filler] })
    const result = act(toTrigger(start), { type: 'PassTrigger', player: 'p2' })

    expect(result.modifiers).toEqual([])

  })

})


describe('ST01-015 Gum-Gum Jet Pistol', () => {

  const rival = [char('p2', 'ST02-011', 1), char('p2', 'ST02-013', 2), char('p2', 'ST02-006', 3)]
  const hand  = [card('p1', 'ST01-015', 50)]

  it('[Main] K.O.s an opponent Character with 6000 power or less', () => {
    const waiting = act(stage({ donActive: 4, hand, characters: [char('p1', 'ST01-003', 4)] }, { characters: rival }), { type: 'PlayEvent', player: 'p1', instanceId: 'p1-t50' })
    const result  = choose(waiting, 'p2-t3')

    expect(waiting.pending?.options).toEqual(['p2-t1', 'p2-t3'])
    expect(result.players.p2.characters.map(item => item.card.instanceId)).toEqual(['p2-t1', 'p2-t2'])
    expect(result.players.p2.trash.map(item => item.instanceId)).toEqual(['p2-t3'])

  })


  it('[Main] has no target when every opponent Character has more than 6000 power', () => {
    const result = act(stage({ donActive: 4, hand }, { characters: [rival[1]] }), { type: 'PlayEvent', player: 'p1', instanceId: 'p1-t50' })

    expect(result.pending).toBeNull()
    expect(result.players.p2.characters).toHaveLength(1)

  })


  it('[Trigger] activates the Main effect against the attacker\'s Characters', () => {
    const start  = stage({ characters: [char('p1', 'ST01-010', 4), char('p1', 'ST02-013', 5)] }, { life: [card('p2', 'ST01-015', 91), filler] })
    const waiting = act(toTrigger(start), { type: 'RevealTrigger', player: 'p2' })
    const result  = choose(waiting, 'p1-t4')

    expect(waiting.pending?.options).toEqual(['p1-t4'])
    expect(result.players.p1.characters.map(item => item.card.instanceId)).toEqual(['p1-t5'])

  })


  it('[Trigger] does nothing when the Trigger is declined', () => {
    const start  = stage({ characters: [char('p1', 'ST01-010', 4)] }, { life: [card('p2', 'ST01-015', 91), filler] })
    const result = act(toTrigger(start), { type: 'PassTrigger', player: 'p2' })

    expect(result.players.p1.characters).toHaveLength(1)

  })

})


describe('ST01-016 Diable Jambe', () => {

  const mine = [char('p1', 'ST01-003', 1), char('p1', 'ST01-008', 2)]
  const play = (extra: Partial<PlayerState> = {}) => act(stage({ donActive: 1, hand: [card('p1', 'ST01-016', 50)], characters: mine, ...extra }, { characters: rivalBlockers }), { type: 'PlayEvent', player: 'p1', instanceId: 'p1-t50' })

  it('[Main] offers only {Straw Hat Crew} Leader or Characters', () => {
    expect(play().pending?.options).toEqual([LEADER, 'p1-t2'])

  })


  it('[Main] the chosen attacker cannot be blocked this turn', () => {
    const locked = attack(choose(play(), 'p1-t2'), 'p1-t2')

    expect(locked.battle?.attacker).toBe('p1-t2')
    expect(blockers(locked)).toEqual([])

  })


  it('[Main] does not affect other attackers', () => {
    expect(blockers(attack(choose(play(), 'p1-t2')))).toEqual(['p2-t1', 'p2-t2'])

  })


  it('[Main] applies nothing when the player declines the target', () => {
    expect(act(play(), { type: 'PassChoice', player: 'p1' }).restrictions).toEqual([])

  })


  it('[Trigger] K.O.s an opponent Blocker with cost 3 or less', () => {
    const start   = stage({ characters: [char('p1', 'ST01-006', 4), char('p1', 'ST01-003', 5), char('p1', 'ST02-013', 6)] }, { life: [card('p2', 'ST01-016', 91), filler] })
    const waiting = act(toTrigger(start), { type: 'RevealTrigger', player: 'p2' })
    const result  = choose(waiting, 'p1-t4')

    expect(waiting.pending?.options).toEqual(['p1-t4'])
    expect(result.players.p1.characters.map(item => item.card.instanceId)).toEqual(['p1-t5', 'p1-t6'])

  })


  it('[Trigger] has no target without a Blocker of cost 3 or less', () => {
    const start  = stage({ characters: [char('p1', 'ST01-003', 5), char('p1', 'ST02-013', 6)] }, { life: [card('p2', 'ST01-016', 91), filler] })
    const result = act(toTrigger(start), { type: 'RevealTrigger', player: 'p2' })

    expect(result.pending).toBeNull()
    expect(result.players.p1.characters).toHaveLength(2)

  })

})


describe('ST01-017 Thousand Sunny', () => {

  const sunny = (extra: Partial<PlayerState> = {}) => stage({ stage: card('p1', 'ST01-017', 7), characters: [char('p1', 'ST01-003', 1), char('p1', 'ST01-008', 2)], ...extra })

  it('offers only {Straw Hat Crew} Leader or Characters and gives +1000 this turn', () => {
    const waiting = activate(sunny(), 'p1-t7')
    const result  = choose(waiting, 'p1-t2')

    expect(waiting.pending?.options).toEqual([LEADER, 'p1-t2'])
    expect(getPower(result, 'p1-t2')).toBe(6000)
    expect(result.modifiers[0].duration).toBe('thisTurn')

  })


  it('can be used only once per turn', () => {
    const used = choose(activate(sunny(), 'p1-t7'), LEADER)

    expect(() => activate(used, 'p1-t7')).toThrow(/no se puede activar/)

  })


  it('cannot be activated on the opponent\'s turn', () => {
    expect(() => act({ ...sunny(), active: 'p2' }, { type: 'ActivateEffect', player: 'p1', source: 'p1-t7', index: 0 })).toThrow(/turno/)

  })


  it('gives nothing when the player declines the target', () => {
    expect(act(activate(sunny(), 'p1-t7'), { type: 'PassChoice', player: 'p1' }).modifiers).toEqual([])

  })

})
