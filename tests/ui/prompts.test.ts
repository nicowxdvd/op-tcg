import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { getLegalActions } from '../../src/engine'
import { BLOCKER_ID, COUNTER_1K_ID, LEADER_ID } from '../engine/fixtures'
import { card, inPlay, newGame, other, startGame, withPlayer } from '../engine/helpers'
import { buildPrompt, describeAction } from '../../src/ui/prompts'


function attacked() {
  const start    = startGame()
  const attacker = start.first
  const defender = other(attacker)
  const base     = withPlayer({ ...start, turn: 3, active: attacker }, defender, { hand: [card(defender, COUNTER_1K_ID, 1)], life: [card(defender, LEADER_ID, 50)], characters: [inPlay(card(defender, BLOCKER_ID, 80))] })
  const state    = apply(base, { type: 'Attack', player: attacker, attacker: 'leader', target: 'leader' }).state

  return { state, attacker, defender }

}


describe('buildPrompt', () => {

  it('offers keep or redraw during the mulligan', () => {
    const state  = newGame(5)
    const player = state.first
    const prompt = buildPrompt(state, getLegalActions(state, player), player)

    expect(prompt?.options.map(option => option.label).sort()).toEqual(['Keep hand', 'Redraw hand'])

  })

  it('returns null when the player has no legal actions', () => {
    const { state, attacker } = attacked()

    expect(buildPrompt(state, getLegalActions(state, attacker), attacker)).toBeNull()

  })

  it('returns null in the main phase without a battle', () => {
    const state = { ...startGame(), turn: 3 }

    expect(buildPrompt(state, getLegalActions(state, state.active), state.active)).toBeNull()

  })

  it('offers Block and No block to the defender at the block step', () => {
    const { state, defender } = attacked()
    const prompt              = buildPrompt(state, getLegalActions(state, defender), defender)

    expect(prompt?.title).toContain('Block step')
    expect(prompt?.options.map(option => option.label)).toContain('No block')
    expect(prompt?.options.some(option => option.label.startsWith('Block with'))).toBe(true)

  })

  it('returns null at the counter step, which the hand handles', () => {
    const { state, defender } = attacked()
    const counter             = apply(state, { type: 'PassBlock', player: defender }).state

    expect(buildPrompt(counter, getLegalActions(counter, defender), defender)).toBeNull()

  })

})


describe('describeAction', () => {

  it('names Trigger decisions', () => {
    const { state, defender } = attacked()

    expect(describeAction(state, { type: 'RevealTrigger', player: defender })).toBe('Reveal Trigger')
    expect(describeAction(state, { type: 'PassTrigger', player: defender })).toBe('Skip Trigger')

  })

})
