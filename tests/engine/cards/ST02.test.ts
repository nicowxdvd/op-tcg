import { describe, expect, it } from 'vitest'
import { apply } from '../../../src/engine/actions'
import { loadDefs } from '../../../src/data'
import { effectRegistry } from '../../../src/engine/effects/cards'
import { passivePower } from '../../../src/engine/effects/passive'
import { getLegalActions, getPower } from '../../../src/engine/queries'
import { defs as fixtureDefs } from '../fixtures'
import { card, inPlay, startGame, withPlayer } from '../helpers'
import type { CharacterInPlay, GameState, PlayerId, PlayerState } from '../../../src/engine/types'

const realDefs = loadDefs()

function field(defId: string, n: number, don = 0, rested = false, owner: PlayerId = 'p1'): CharacterInPlay {
  return { ...inPlay(card(owner, defId, n), 1, don), rested }

}


function stage(mine: Partial<PlayerState> = {}, rival: Partial<PlayerState> = {}): GameState {
  const start = startGame()
  const base  = { ...start, turn: 3, active: 'p1' as const, defs: { ...fixtureDefs, ...realDefs }, effects: effectRegistry }
  const own   = withPlayer(base, 'p1', { characters: [], donActive: 5, donRested: 0, ...mine })

  return withPlayer(own, 'p2', { characters: [], ...rival })

}


function ids(state: GameState, player: PlayerId): string[] {
  return state.players[player].characters.map(item => item.card.instanceId)

}


describe('ST02 vanilla and keyword-only cards', () => {

  it.each(['ST02-002', 'ST02-004', 'ST02-006', 'ST02-011', 'ST02-012'])('%s has no registered effect', id => {
    expect(effectRegistry[id]).toEqual([])

  })


  it.each(['ST02-004'])('%s gets Blocker from its card text', id => {
    expect(realDefs[id].keywords).toEqual(['Blocker'])

  })

})


describe('ST02-001 Eustass"Captain"Kid (Leader)', () => {

  const leader = { instanceId: 'p1-leader', defId: 'ST02-001', owner: 'p1' as const }
  const act    = { type: 'ActivateEffect' as const, player: 'p1' as const, source: 'p1-leader', index: 0 }

  function ready(patch: Partial<PlayerState> = {}): GameState {
    return stage({ leader, leaderRested: true, donActive: 3, donRested: 0, ...patch })

  }

  it('rests 3 DON!!, trashes 1 card from hand and sets the Leader as active', () => {
    const state   = ready()
    const pending = apply(state, act).state
    const target  = state.players.p1.hand[0].instanceId

    expect(pending.pending?.kind).toBe('trashFromHand')

    const done = apply(pending, { type: 'Choose', player: 'p1', option: target }).state

    expect(done.players.p1.leaderRested).toBe(false)
    expect(done.players.p1.donActive).toBe(0)
    expect(done.players.p1.donRested).toBe(3)
    expect(done.players.p1.hand).toHaveLength(state.players.p1.hand.length - 1)
    expect(done.players.p1.trash.map(item => item.instanceId)).toContain(target)

  })


  it('cannot be activated with fewer than 3 active DON!!', () => {
    expect(() => apply(ready({ donActive: 2 }), act)).toThrow(/DON!! insuficiente/)

  })


  it('cannot be activated with an empty hand, since the trash is a cost', () => {
    expect(() => apply(ready({ hand: [] }), act)).toThrow(/Mano insuficiente/)

  })


  it('can only be activated once per turn', () => {
    const first  = apply(ready({ donActive: 6 }), act).state
    const used   = apply(first, { type: 'Choose', player: 'p1', option: first.players.p1.hand[0].instanceId }).state
    const rested = withPlayer(used, 'p1', { leaderRested: true })

    expect(() => apply(rested, act)).toThrow(/no se puede activar ahora/)

  })

})


describe('ST02-003 Urouge', () => {

  const three = [field('ST02-003', 1, 1), field('ST02-002', 2), field('ST02-002', 3)]

  it('gains +2000 power with [DON!! x1] and 3 or more Characters', () => {
    const state = stage({ characters: three })

    expect(passivePower(state, 'p1-t1')).toBe(2000)
    expect(getPower(state, 'p1-t1')).toBe(realDefs['ST02-003'].power + 1000 + 2000)

  })


  it('gets nothing with only 2 Characters', () => {
    expect(passivePower(stage({ characters: three.slice(0, 2) }), 'p1-t1')).toBe(0)

  })


  it('gets nothing without the attached DON!!', () => {
    expect(passivePower(stage({ characters: [field('ST02-003', 1, 0), ...three.slice(1)] }), 'p1-t1')).toBe(0)

  })

})


describe('ST02-005 Killer', () => {

  function play(rival: CharacterInPlay[]): GameState {
    const state = stage({ hand: [card('p1', 'ST02-005', 10)], donActive: 3 }, { characters: rival })

    return apply(state, { type: 'PlayCharacter', player: 'p1', instanceId: 'p1-t10' }).state

  }

  it('[On Play] K.O.s an opponent rested Character with cost 3 or less', () => {
    const pending = play([field('ST02-002', 20, 0, true, 'p2'), field('ST02-002', 21, 0, false, 'p2')])

    expect(pending.pending?.options).toEqual(['p2-t20'])

    const done = apply(pending, { type: 'Choose', player: 'p1', option: 'p2-t20' }).state

    expect(ids(done, 'p2')).toEqual(['p2-t21'])
    expect(done.players.p2.trash.map(item => item.instanceId)).toEqual(['p2-t20'])

  })


  it('[On Play] has no target when the Characters are active or cost more than 3', () => {
    const state = play([field('ST02-002', 20, 0, false, 'p2'), field('ST02-006', 21, 0, true, 'p2')])

    expect(state.pending).toBeNull()
    expect(ids(state, 'p2')).toEqual(['p2-t20', 'p2-t21'])

  })


  it('[On Play] can be declined', () => {
    const pending = play([field('ST02-002', 20, 0, true, 'p2')])
    const done    = apply(pending, { type: 'PassChoice', player: 'p1' }).state

    expect(ids(done, 'p2')).toEqual(['p2-t20'])

  })


  function lifeHit(): GameState {
    const state    = stage({}, { life: [card('p2', 'ST02-005', 30), card('p2', 'ST02-002', 31)] })
    const attacker = withPlayer(state, 'p1', { characters: [field('ST02-002', 1)] })
    const attacked = apply(attacker, { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'leader' }).state
    const blocked  = apply(attacked, { type: 'PassBlock', player: 'p2' }).state

    return apply(blocked, { type: 'PassCounter', player: 'p2' }).state

  }

  it('[Trigger] plays this card when revealed from Life', () => {
    const done = apply(lifeHit(), { type: 'RevealTrigger', player: 'p2' }).state

    expect(ids(done, 'p2')).toEqual(['p2-t30'])
    expect(done.players.p2.trash).toEqual([])

  })


  it('[Trigger] does not play this card when the player passes', () => {
    const done = apply(lifeHit(), { type: 'PassTrigger', player: 'p2' }).state

    expect(ids(done, 'p2')).toEqual([])
    expect(done.players.p2.hand.map(item => item.instanceId)).toContain('p2-t30')

  })

})


describe('ST02-007 Jewelry Bonney', () => {

  const act  = { type: 'ActivateEffect' as const, player: 'p1' as const, source: 'p1-t1', index: 0 }
  const deck = (...defIds: string[]) => defIds.map((id, i) => card('p1', id, 40 + i))

  function ready(patch: Partial<PlayerState> = {}): GameState {
    return stage({ characters: [field('ST02-007', 1)], donActive: 1, deck: deck('ST02-002', 'ST02-003', 'ST02-006', 'ST02-002', 'ST02-002', 'ST02-005'), ...patch })

  }

  it('rests 1 DON!! and itself, then adds a Supernovas card from the top 5 to the hand', () => {
    const state   = ready()
    const pending = apply(state, act).state

    expect(pending.pending?.options).toEqual(['p1-t41'])

    const done = apply(pending, { type: 'Choose', player: 'p1', option: 'p1-t41' }).state
    const mine = done.players.p1

    expect(mine.characters[0].rested).toBe(true)
    expect(mine.donActive).toBe(0)
    expect(mine.hand.map(item => item.instanceId)).toContain('p1-t41')
    expect(mine.deck.map(item => item.instanceId)).toEqual(['p1-t45', 'p1-t40', 'p1-t42', 'p1-t43', 'p1-t44'])

  })


  it('does not offer a Supernovas card deeper than the top 5', () => {
    const state = ready({ deck: deck('ST02-002', 'ST02-002', 'ST02-006', 'ST02-002', 'ST02-002', 'ST02-005') })

    expect(apply(state, act).state.pending).toBeNull()
    expect(apply(state, act).state.players.p1.deck.map(item => item.instanceId)).toEqual(['p1-t45', 'p1-t40', 'p1-t41', 'p1-t42', 'p1-t43', 'p1-t44'])

  })


  it('can be declined, leaving all 5 cards at the bottom', () => {
    const pending = apply(ready(), act).state
    const done    = apply(pending, { type: 'PassChoice', player: 'p1' }).state

    expect(done.players.p1.hand).toHaveLength(ready().players.p1.hand.length)
    expect(done.players.p1.deck).toHaveLength(6)

  })


  it('cannot be activated without active DON!!', () => {
    expect(() => apply(ready({ donActive: 0 }), act)).toThrow(/DON!! insuficiente/)

  })


  it('cannot be activated when it is already rested', () => {
    expect(() => apply(ready({ characters: [field('ST02-007', 1, 0, true)] }), act)).toThrow(/ya está descansada/)

  })

})


describe('ST02-008 Scratchmen Apoo', () => {

  function attack(don: number, rivalDon = 4): GameState {
    const state = stage({ characters: [field('ST02-008', 1, don)] }, { donActive: rivalDon, donRested: 0 })

    return apply(state, { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'leader' }).state

  }

  it('[When Attacking] rests 1 opponent active DON!! with [DON!! x1]', () => {
    expect(attack(1).players.p2).toMatchObject({ donActive: 3, donRested: 1 })

  })


  it('does nothing without the attached DON!!', () => {
    expect(attack(0).players.p2).toMatchObject({ donActive: 4, donRested: 0 })

  })


  it('does nothing when the opponent has no active DON!!', () => {
    expect(attack(1, 0).players.p2).toMatchObject({ donActive: 0, donRested: 0 })

  })

})


describe('ST02-009 Trafalgar Law', () => {

  function play(mine: CharacterInPlay[]): GameState {
    const state = stage({ characters: mine, hand: [card('p1', 'ST02-009', 10)], donActive: 5 })

    return apply(state, { type: 'PlayCharacter', player: 'p1', instanceId: 'p1-t10' }).state

  }

  it('[On Play] sets a rested Supernovas or Heart Pirates Character with cost 5 or less as active', () => {
    const pending = play([field('ST02-012', 1, 0, true), field('ST02-003', 2, 0, true), field('ST02-006', 3, 0, true), field('ST02-013', 4, 0, true)])

    expect(pending.pending?.options).toEqual(['p1-t1', 'p1-t2'])

    const done = apply(pending, { type: 'Choose', player: 'p1', option: 'p1-t2' }).state

    expect(done.players.p1.characters.find(item => item.card.instanceId === 'p1-t2')?.rested).toBe(false)
    expect(done.players.p1.characters.find(item => item.card.instanceId === 'p1-t1')?.rested).toBe(true)

  })


  it('[On Play] has no target when none is rested, of the right type or cost 5 or less', () => {
    expect(play([field('ST02-012', 1, 0, false), field('ST02-006', 2, 0, true), field('ST02-013', 3, 0, true)]).pending).toBeNull()

  })

})


describe('ST02-010 Basil Hawkins', () => {

  function battle(don: number, target = 'p2-t20', used = false): GameState {
    const state = stage({ characters: [field('ST02-010', 1, don)] }, { characters: [field('ST02-002', 20, 0, true, 'p2')] })
    const key   = used ? { oncePerTurnUsed: ['ST02-010:p1-t1:0'] } : {}

    return apply({ ...state, ...key }, { type: 'Attack', player: 'p1', attacker: 'p1-t1', target }).state

  }

  it('sets itself as active when it battles an opponent Character', () => {
    expect(battle(1).players.p1.characters[0].rested).toBe(false)

  })


  it('stays rested without [DON!! x1]', () => {
    expect(battle(0).players.p1.characters[0].rested).toBe(true)

  })


  it('stays rested when it attacks the Leader and nobody blocks', () => {
    expect(battle(1, 'leader').players.p1.characters[0].rested).toBe(true)

  })


  it('stays rested when the once-per-turn use is already spent', () => {
    expect(battle(1, 'p2-t20', true).players.p1.characters[0].rested).toBe(true)

  })

})


describe('ST02-013 Eustass"Captain"Kid (Character)', () => {

  function endTurn(don: number): GameState {
    const state = stage({ characters: [field('ST02-013', 1, don, true)] })

    return apply(state, { type: 'PassPhase', player: 'p1' }).state

  }

  it('has Blocker from its card text', () => {
    expect(realDefs['ST02-013'].keywords).toEqual(['Blocker'])

  })


  it('[End of Your Turn] sets itself as active with [DON!! x1]', () => {
    expect(endTurn(1).players.p1.characters[0].rested).toBe(false)

  })


  it('stays rested without the attached DON!!', () => {
    expect(endTurn(0).players.p1.characters[0].rested).toBe(true)

  })

})


describe('ST02-014 X.Drake', () => {

  function board(drake: CharacterInPlay, extra: Partial<PlayerState> = {}): GameState {
    const leader = { instanceId: 'p1-leader', defId: 'ST02-001', owner: 'p1' as const }

    return stage({ leader, characters: [drake, field('ST02-003', 2), field('ST02-006', 3), field('ST02-002', 4)], ...extra })

  }

  const rested = () => field('ST02-014', 1, 1, true)

  it('while rested with [DON!! x1] on your turn, Supernovas and Navy Leaders and Characters gain +1000', () => {
    const state = board(rested())

    expect(passivePower(state, 'p1-t1')).toBe(1000)
    expect(passivePower(state, 'p1-t2')).toBe(1000)
    expect(passivePower(state, 'p1-t3')).toBe(1000)
    expect(passivePower(state, 'p1-leader')).toBe(1000)

  })


  it('does not affect other types or the opponent', () => {
    const state = withPlayer(board(rested()), 'p2', { characters: [field('ST02-003', 30, 0, false, 'p2')] })

    expect(passivePower(state, 'p1-t4')).toBe(0)
    expect(passivePower(state, 'p2-t30')).toBe(0)

  })


  it('does nothing while active', () => {
    expect(passivePower(board(field('ST02-014', 1, 1, false)), 'p1-t2')).toBe(0)

  })


  it('does nothing without the attached DON!!', () => {
    expect(passivePower(board(field('ST02-014', 1, 0, true)), 'p1-t2')).toBe(0)

  })


  it('does nothing on the opponent turn', () => {
    expect(passivePower({ ...board(rested()), active: 'p2' }, 'p1-t2')).toBe(0)

  })

})


describe('ST02-015 Scalpel and ST02-016 Repel', () => {

  function counter(defId: string, don = 3, rested = 2): GameState {
    const state    = stage({ characters: [field('ST02-002', 1)] }, { hand: [card('p2', defId, 10)], donActive: don, donRested: rested })
    const attacked = apply(state, { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'leader' }).state

    return apply(attacked, { type: 'PassBlock', player: 'p2' }).state

  }

  function use(state: GameState, option: string | null): GameState {
    const pending = apply(state, { type: 'UseCounterEvent', player: 'p2', instanceId: 'p2-t10' }).state

    return option ? apply(pending, { type: 'Choose', player: 'p2', option }).state : apply(pending, { type: 'PassChoice', player: 'p2' }).state

  }

  it.each([['ST02-015', 2000], ['ST02-016', 4000]])('%s [Counter] gives +%i power this battle, then sets 1 DON!! as active', (defId, amount) => {
    const before = counter(defId)
    const done   = use(before, 'p2-leader')
    const cost   = realDefs[defId].cost

    expect(getPower(done, 'p2-leader')).toBe(getPower(before, 'p2-leader') + amount)
    expect(done.players.p2.donActive).toBe(before.players.p2.donActive - cost + 1)
    expect(done.players.p2.donRested).toBe(before.players.p2.donRested + cost - 1)

  })


  it.each(['ST02-015', 'ST02-016'])('%s [Counter] only sets DON!! active when no target is chosen', defId => {
    const done = use(counter(defId), null)

    expect(getPower(done, 'p2-leader')).toBe(5000)
    expect(done.players.p2.donRested).toBe(2 + realDefs[defId].cost - 1)

  })


  it.each(['ST02-015', 'ST02-016'])('%s cannot be used as a Counter without enough active DON!!', defId => {
    const state = counter(defId, realDefs[defId].cost - 1)

    expect(getLegalActions(state, 'p2').some(action => action.type === 'UseCounterEvent')).toBe(false)

  })


  it('ST02-015 [Trigger] sets up to 2 DON!! as active', () => {
    const state    = stage({ characters: [field('ST02-002', 1)] }, { life: [card('p2', 'ST02-015', 30), card('p2', 'ST02-002', 31)], donActive: 0, donRested: 3 })
    const attacked = apply(state, { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'leader' }).state
    const blocked  = apply(attacked, { type: 'PassBlock', player: 'p2' }).state
    const waiting  = apply(blocked, { type: 'PassCounter', player: 'p2' }).state
    const done     = apply(waiting, { type: 'RevealTrigger', player: 'p2' }).state

    expect(done.players.p2).toMatchObject({ donActive: 2, donRested: 1 })

  })


  it('ST02-015 [Trigger] does nothing when the player passes', () => {
    const state    = stage({ characters: [field('ST02-002', 1)] }, { life: [card('p2', 'ST02-015', 30), card('p2', 'ST02-002', 31)], donActive: 0, donRested: 3 })
    const attacked = apply(state, { type: 'Attack', player: 'p1', attacker: 'p1-t1', target: 'leader' }).state
    const blocked  = apply(attacked, { type: 'PassBlock', player: 'p2' }).state
    const waiting  = apply(blocked, { type: 'PassCounter', player: 'p2' }).state
    const done     = apply(waiting, { type: 'PassTrigger', player: 'p2' }).state

    expect(done.players.p2).toMatchObject({ donActive: 0, donRested: 3 })

  })

})


describe('ST02-017 Straw Sword', () => {

  function play(rival: CharacterInPlay[]): GameState {
    const state = stage({ hand: [card('p1', 'ST02-017', 10)], donActive: 2 }, { characters: rival })

    return apply(state, { type: 'PlayEvent', player: 'p1', instanceId: 'p1-t10' }).state

  }

  it('[Main] rests up to 1 opponent Character', () => {
    const pending = play([field('ST02-002', 20, 0, false, 'p2'), field('ST02-006', 21, 0, false, 'p2')])

    expect(pending.pending?.options).toEqual(['p2-t20', 'p2-t21'])

    const done = apply(pending, { type: 'Choose', player: 'p1', option: 'p2-t21' }).state

    expect(done.players.p2.characters.map(item => item.rested)).toEqual([false, true])
    expect(done.players.p1.trash.map(item => item.instanceId)).toEqual(['p1-t10'])

  })


  it('[Main] does nothing when the opponent has no Characters', () => {
    const state = play([])

    expect(state.pending).toBeNull()
    expect(state.players.p1.donRested).toBe(2)

  })


  it('[Main] can be declined', () => {
    const done = apply(play([field('ST02-002', 20, 0, false, 'p2')]), { type: 'PassChoice', player: 'p1' }).state

    expect(done.players.p2.characters[0].rested).toBe(false)

  })

})
