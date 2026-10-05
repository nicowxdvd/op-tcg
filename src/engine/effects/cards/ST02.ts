import type { EffectContext, EffectDef, EffectRegistry, EffectStep } from '../../types'
import { opponentOf } from '../../state'
import { CHOICE } from '../binding'
import { fieldCards, findFieldCard, hasTrait, type FieldCard } from '../targets'

function pick(ctx: EffectContext, options: string[], then: EffectStep[]): EffectStep[] {
  return [{ op: 'choose', chooser: ctx.owner, kind: 'target', options, optional: true, then }]

}


function boostUpTo1(ctx: EffectContext, amount: number): EffectStep[] {
  return pick(ctx, fieldCards(ctx.state, ctx.owner).map(candidate => candidate.instanceId), [{ op: 'power', target: CHOICE, amount, duration: 'thisBattle' }])

}


function setDonActive(ctx: EffectContext, amount: number): EffectStep {
  return { op: 'activateDon', player: ctx.owner, amount }

}


function ownTrait(ctx: EffectContext, candidate: string, traits: string[]): boolean {
  const found = fieldCards(ctx.state, ctx.owner).find(card => card.instanceId === candidate)

  return !!found && traits.some(trait => hasTrait(ctx.state.defs[found.defId], trait))

}


function characters(ctx: EffectContext, owner: 'mine' | 'rival', accept: (card: FieldCard) => boolean = () => true): string[] {
  return fieldCards(ctx.state, owner === 'mine' ? ctx.owner : opponentOf(ctx.owner)).filter(card => !card.isLeader && accept(card)).map(card => card.instanceId)

}


const koRestedCost3: EffectDef = { timing: 'onPlay', run: ctx => pick(ctx, characters(ctx, 'rival', card => card.rested && ctx.state.defs[card.defId].cost <= 3), [{ op: 'ko', target: CHOICE }]) }
const playOnTrigger: EffectDef = { timing: 'trigger', run: ctx => [{ op: 'playSelf', player: ctx.owner, instanceId: ctx.source }] }
const readyLaw     : EffectDef = { timing: 'onPlay', run: ctx => pick(ctx, characters(ctx, 'mine', card => card.rested && ctx.state.defs[card.defId].cost <= 5 && ['Supernovas', 'Heart Pirates'].some(trait => hasTrait(ctx.state.defs[card.defId], trait))), [{ op: 'activate', target: CHOICE }]) }
const restRival    : EffectDef = { timing: 'main', run: ctx => pick(ctx, characters(ctx, 'rival'), [{ op: 'rest', target: CHOICE }]) }

export const ST02: EffectRegistry = {
  'ST02-001': [{ timing: 'activateMain', oncePerTurn: true, cost: { restDon: 3, trashFromHand: 1 }, run: ctx => [{ op: 'activate', target: ctx.source }] }],
  'ST02-002': [],
  'ST02-003': [{ timing: 'passive', donRequired: 1, condition: ctx => ctx.state.players[ctx.owner].characters.length >= 3, aura: { power: 2000 }, run: () => [] }],
  'ST02-004': [],
  'ST02-005': [koRestedCost3, playOnTrigger],
  'ST02-006': [],
  'ST02-007': [{ timing: 'activateMain', cost: { restDon: 1, restSelf: true }, run: ctx => [{ op: 'search', player: ctx.owner, amount: 5, trait: 'Supernovas' }] }],
  'ST02-008': [{ timing: 'whenAttacking', donRequired: 1, run: ctx => [{ op: 'restDon', player: opponentOf(ctx.owner), amount: 1 }] }],
  'ST02-009': [readyLaw],
  'ST02-010': [{ timing: 'onBattle', donRequired: 1, turn: 'yours', oncePerTurn: true, run: ctx => [{ op: 'activate', target: ctx.source }] }],
  'ST02-011': [],
  'ST02-012': [],
  'ST02-013': [{ timing: 'endOfYourTurn', donRequired: 1, run: ctx => [{ op: 'activate', target: ctx.source }] }],
  'ST02-014': [{ timing: 'passive', donRequired: 1, turn: 'yours', condition: ctx => !!findFieldCard(ctx.state, ctx.source)?.rested, aura: { power: 1000, affects: (ctx, candidate) => ownTrait(ctx, candidate, ['Supernovas', 'Navy']) }, run: () => [] }],
  'ST02-015': [{ timing: 'counter', run: ctx => [...boostUpTo1(ctx, 2000), setDonActive(ctx, 1)] }, { timing: 'trigger', run: ctx => [setDonActive(ctx, 2)] }],
  'ST02-016': [{ timing: 'counter', run: ctx => [...boostUpTo1(ctx, 4000), setDonActive(ctx, 1)] }],
  'ST02-017': [restRival]
}
