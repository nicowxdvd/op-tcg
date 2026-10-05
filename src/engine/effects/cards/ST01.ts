import type { EffectContext, EffectDef, EffectRegistry, EffectStep } from '../../types'
import { getPower } from '../../queries'
import { opponentOf } from '../../state'
import { CHOICE } from '../binding'
import { hasKeyword } from '../passive'
import { fieldCards, hasTrait, type FieldCard } from '../targets'

const STRAW_HAT = 'Straw Hat Crew'


function mine(ctx: EffectContext, accept: (id: string, defId: string) => boolean = () => true): string[] {
  return fieldCards(ctx.state, ctx.owner).filter(card => accept(card.instanceId, card.defId)).map(card => card.instanceId)

}


function rivalCharacters(ctx: EffectContext, accept: (card: FieldCard) => boolean): string[] {
  return fieldCards(ctx.state, opponentOf(ctx.owner)).filter(card => !card.isLeader && accept(card)).map(card => card.instanceId)

}


function pick(ctx: EffectContext, options: string[], then: EffectStep[]): EffectStep[] {
  return [{ op: 'choose', chooser: ctx.owner, kind: 'target', options, optional: true, then }]

}


function giveDon(amount: number) {
  return (ctx: EffectContext): EffectStep[] => pick(ctx, mine(ctx), [{ op: 'attachDon', player: ctx.owner, target: CHOICE, amount }])

}


function boost(amount: number, duration: 'thisTurn' | 'thisBattle', accept?: (id: string, defId: string) => boolean) {
  return (ctx: EffectContext): EffectStep[] => pick(ctx, mine(ctx, accept), [{ op: 'power', target: CHOICE, amount, duration }])

}


function koWhere(accept: (ctx: EffectContext, card: FieldCard) => boolean) {
  return (ctx: EffectContext): EffectStep[] => pick(ctx, rivalCharacters(ctx, card => accept(ctx, card)), [{ op: 'ko', target: CHOICE }])

}


const koPower6000 = koWhere((ctx, card) => getPower(ctx.state, card.instanceId) <= 6000)
const koBlocker3  = koWhere((ctx, card) => hasKeyword(ctx.state, card.instanceId, 'Blocker') && ctx.state.defs[card.defId].cost <= 3)

const giveOneDon: EffectDef = { timing: 'activateMain', oncePerTurn: true, run: giveDon(1) }

const blockerLockAttack = (minPower?: number): EffectDef => ({ timing: 'whenAttacking', donRequired: 2, run: ctx => [{ op: 'blockerLock', attacker: ctx.source, minPower, duration: 'thisBattle' }] })

export const ST01: EffectRegistry = {
  'ST01-001': [giveOneDon],
  'ST01-002': [blockerLockAttack(5000), { timing: 'trigger', run: ctx => [{ op: 'playSelf', player: ctx.owner, instanceId: ctx.source }] }],
  'ST01-003': [],
  'ST01-004': [{ timing: 'passive', donRequired: 2, aura: { keyword: 'Rush' }, run: () => [] }],
  'ST01-005': [{ timing: 'whenAttacking', donRequired: 1, run: ctx => pick(ctx, mine(ctx, id => id !== ctx.source), [{ op: 'power', target: CHOICE, amount: 1000, duration: 'thisTurn' }]) }],
  'ST01-006': [],
  'ST01-007': [giveOneDon],
  'ST01-008': [],
  'ST01-009': [],
  'ST01-010': [],
  'ST01-011': [{ timing: 'onPlay', run: giveDon(2) }],
  'ST01-012': [blockerLockAttack()],
  'ST01-013': [{ timing: 'passive', donRequired: 1, turn: 'yours', aura: { power: 1000 }, run: () => [] }],
  'ST01-014': [{ timing: 'counter', run: boost(3000, 'thisBattle') }, { timing: 'trigger', run: boost(1000, 'thisTurn') }],
  'ST01-015': [{ timing: 'main', run: koPower6000 }, { timing: 'trigger', run: koPower6000 }],
  'ST01-016': [{ timing: 'main', run: ctx => pick(ctx, mine(ctx, (_, defId) => hasTrait(ctx.state.defs[defId], STRAW_HAT)), [{ op: 'blockerLock', attacker: CHOICE, duration: 'thisTurn' }]) }, { timing: 'trigger', run: koBlocker3 }],
  // A Stage cannot be rested in the engine (restSelf is rejected for it) and it only readies in the Refresh Phase, so oncePerTurn stands in for the rest cost.
  'ST01-017': [{ timing: 'activateMain', oncePerTurn: true, run: ctx => boost(1000, 'thisTurn', (_, defId) => hasTrait(ctx.state.defs[defId], STRAW_HAT))(ctx) }]
}
