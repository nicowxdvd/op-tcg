import { describe, expect, it } from 'vitest'
import { apply } from '../../src/engine/actions'
import { getLegalActions } from '../../src/engine'
import { BLOCKER_ID, COUNTER_1K_ID, LEADER_ID } from '../engine/fixtures'
import { card, inPlay, newGame, other, startGame, withPlayer } from '../engine/helpers'
import { CHOICE_TEXTS } from '../../src/learn/texts'
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

    expect(prompt?.options.map(option => option.label).sort()).toEqual(['Mulligan', 'Quedarse'])

  })

  it('returns null when the player has no legal actions', () => {
    const { state, attacker } = attacked()

    expect(buildPrompt(state, getLegalActions(state, attacker), attacker)).toBeNull()

  })

  it('returns null in the main phase without a battle', () => {
    const state = { ...startGame(), turn: 3 }

    expect(buildPrompt(state, getLegalActions(state, state.active), state.active)).toBeNull()

  })

  it('offers Bloquear and No bloquear to the defender at the block step', () => {
    const { state, defender } = attacked()
    const prompt              = buildPrompt(state, getLegalActions(state, defender), defender)

    expect(prompt?.title).toBe('Paso de bloqueo')
    expect(prompt?.options.map(option => option.label)).toContain('No bloquear')
    expect(prompt?.options.some(option => option.label.startsWith('Bloquear con'))).toBe(true)

  })

  it('titles a pending choice with the text of its kind', () => {
    const start  = startGame()
    const player = start.first
    const state  = { ...start, turn: 3, active: player, pending: { player, kind: 'confirm' as const, options: [], optional: true, resume: { source: 'x', owner: player, then: [], otherwise: [], rest: [] } } }
    const prompt = buildPrompt(state, getLegalActions(state, player), player)

    expect(prompt?.title).toBe(CHOICE_TEXTS.confirm)

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

    expect(describeAction(state, { type: 'RevealTrigger', player: defender })).toBe('Revelar Trigger')
    expect(describeAction(state, { type: 'PassTrigger', player: defender })).toBe('Omitir Trigger')

  })

})
