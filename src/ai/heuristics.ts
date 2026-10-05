import type { Action, BattleState, CardInstance, GameState, PlayerId } from '../engine/types'
import { getPower } from '../engine'
import { hasKeyword } from '../engine/effects/passive'
import { opponentOf } from '../engine/state'

export type Rng = number

export const MULLIGAN_MAX_COST = 3
export const SAFE_LIFE         = 3
export const COUNTER_LIFE      = 2


export function shouldRedraw(state: GameState, player: PlayerId): boolean {
  return !state.players[player].hand.some(card => state.defs[card.defId].type === 'Character' && state.defs[card.defId].cost <= MULLIGAN_MAX_COST)

}


export function characterScore(state: GameState, card: CardInstance): number {
  const def = state.defs[card.defId]

  return def.cost * 100000 + def.power + def.counter

}


export function attackerId(state: GameState, battle: BattleState): string {
  return battle.attacker === 'leader' ? state.players[battle.attackerPlayer].leader.instanceId : battle.attacker

}


export function targetId(state: GameState, battle: BattleState): string {
  return battle.target === 'leader' ? state.players[opponentOf(battle.attackerPlayer)].leader.instanceId : battle.target

}


export function connects(state: GameState, battle: BattleState): boolean {
  return getPower(state, attackerId(state, battle)) >= getPower(state, targetId(state, battle)) + battle.counterPower

}


export function hitsOf(state: GameState, battle: BattleState): number {
  return hasKeyword(state, attackerId(state, battle), 'DoubleAttack') ? 2 : 1

}


export function isLethal(state: GameState, battle: BattleState): boolean {
  if (battle.target !== 'leader')
    return false

  return connects(state, battle) && state.players[opponentOf(battle.attackerPlayer)].life.length < hitsOf(state, battle)

}


export function lifeAtRisk(state: GameState, battle: BattleState): boolean {
  if (battle.target !== 'leader' || !connects(state, battle))
    return false

  return state.players[opponentOf(battle.attackerPlayer)].life.length - hitsOf(state, battle) <= COUNTER_LIFE

}


export function powerNeeded(state: GameState, battle: BattleState): number {
  return getPower(state, attackerId(state, battle)) - getPower(state, targetId(state, battle)) - battle.counterPower + 1

}


export function counterCards(state: GameState, player: PlayerId): { instanceId: string; counter: number }[] {
  return state.players[player].hand.flatMap(card => state.defs[card.defId].type === 'Character' && state.defs[card.defId].counter > 0 ? [{ instanceId: card.instanceId, counter: state.defs[card.defId].counter }] : [])

}


export function pickCounter(state: GameState, player: PlayerId, battle: BattleState): string | null {
  const needed = powerNeeded(state, battle)
  const cards  = counterCards(state, player).sort((a, b) => a.counter - b.counter)

  if (needed <= 0 || cards.reduce((sum, card) => sum + card.counter, 0) < needed)
    return null

  return (cards.find(card => card.counter >= needed) ?? cards[cards.length - 1]).instanceId

}


export function pickBlocker(state: GameState, actions: Action[], battle: BattleState): string | null {
  const blockers = actions.flatMap(action => action.type === 'DeclareBlock' ? [action.blockerId] : []).sort((a, b) => getPower(state, a) - getPower(state, b))
  const safe     = blockers.find(blocker => getPower(state, blocker) > getPower(state, attackerId(state, battle)))

  return safe ?? (isLethal(state, battle) ? blockers[0] ?? null : null)

}


export function wantsAttack(state: GameState, player: PlayerId, attacker: string, target: string): boolean {
  const attackerPower = getPower(state, attacker === 'leader' ? state.players[player].leader.instanceId : attacker)
  const targetPower   = getPower(state, target === 'leader' ? state.players[opponentOf(player)].leader.instanceId : target)

  return attackerPower >= targetPower || state.players[player].life.length >= SAFE_LIFE

}
