import type { Action, GameState, PlayerId } from '../engine/types'
import { getLegalActions, getPower } from '../engine'
import { findFieldCard } from '../engine/effects/targets'
import { nextInt } from '../engine/rng'
import { opponentOf } from '../engine/state'
import { characterScore, isLethal, lifeAtRisk, pickBlocker, pickCounter, shouldRedraw, wantsAttack, type Rng } from './heuristics'

type AttackAction = Extract<Action, { type: 'Attack' }>
type ChooseAction = Extract<Action, { type: 'Choose' }>
type AttachAction = Extract<Action, { type: 'AttachDon' }>

const PASS_TYPES  = ['PassPhase', 'PassBlock', 'PassCounter', 'PassChoice', 'PassTrigger']
const BENEFIT_OPS = ['power', 'attachDon', 'activate', 'activateDon']


function pickBest<T>(items: T[], score: (item: T) => number, rng: Rng): T {
  const best = Math.max(...items.map(score))
  const tied = items.filter(item => score(item) === best)

  return tied[nextInt(rng, tied.length).value]

}


function summary(state: GameState, player: PlayerId): string {
  return `jugador ${player}, fase ${state.phase}, turno ${state.turn}, activo ${state.active}, batalla ${state.battle?.step ?? 'no'}, decisión ${state.pending?.kind ?? 'no'}`

}


function passAction(legal: Action[]): Action {
  return legal.find(action => PASS_TYPES.includes(action.type)) ?? legal[0]

}


function chooseOption(state: GameState, player: PlayerId, legal: Action[], rng: Rng): Action {
  const pending    = state.pending!
  const options    = legal.filter((action): action is ChooseAction => action.type === 'Choose')
  const beneficial = pending.resume.then.some(step => BENEFIT_OPS.includes(step.op) && !('amount' in step && step.amount < 0))
  const found      = options.flatMap(action => {
    const card = findFieldCard(state, action.option)

    return card ? [{ action, card }] : []

  })
  const rivals     = found.filter(entry => entry.card.owner !== player)
  const own        = found.filter(entry => entry.card.owner === player)
  const power      = (entry: (typeof found)[number]) => getPower(state, entry.card.instanceId)

  if (rivals.length && !beneficial)
    return pickBest(rivals, power, rng).action
  if (own.length)
    return pickBest(own, entry => beneficial ? power(entry) : -power(entry), rng).action
  if (options.length)
    return options[nextInt(rng, options.length).value]

  return passAction(legal)

}


function chooseBattle(state: GameState, player: PlayerId, legal: Action[]): Action {
  const battle = state.battle!

  if (battle.step === 'trigger')
    return legal.find(action => action.type === 'RevealTrigger') ?? passAction(legal)

  if (battle.step === 'block') {
    const blocker = pickBlocker(state, legal, battle)

    return legal.find(action => action.type === 'DeclareBlock' && action.blockerId === blocker) ?? passAction(legal)

  }

  const counter = lifeAtRisk(state, battle) || isLethal(state, battle) ? pickCounter(state, player, battle) : null

  return legal.find(action => action.type === 'UseCounter' && action.instanceId === counter) ?? passAction(legal)

}


function chooseMain(state: GameState, player: PlayerId, legal: Action[], rng: Rng): Action {
  const self    = state.players[player]
  const rival   = state.players[opponentOf(player)]
  const powerOf = (id: string) => getPower(state, id === 'leader' ? self.leader.instanceId : id)
  const costOf  = (defId: string) => state.defs[defId].cost

  const plays = legal.flatMap(action => {
    if (action.type !== 'PlayCharacter')
      return []

    const card     = self.hand.find(candidate => candidate.instanceId === action.instanceId)!
    const replaced = action.replaceId ? self.characters.find(character => character.card.instanceId === action.replaceId)!.card : null

    return !replaced || costOf(card.defId) > costOf(replaced.defId) ? [{ action, gain: characterScore(state, card) * 1000000 - (replaced ? characterScore(state, replaced) : 0) }] : []

  })

  if (plays.length)
    return pickBest(plays, play => play.gain, rng).action

  const allAttacks = legal.filter((action): action is AttackAction => action.type === 'Attack')
  const attackers  = new Set(allAttacks.map(action => action.attacker))
  const boostable  = legal.filter((action): action is AttachAction => action.type === 'AttachDon' && attackers.has(action.target))

  if (boostable.length)
    return pickBest(boostable, action => powerOf(action.target), rng)

  const attacks = allAttacks.filter(action => wantsAttack(state, player, action.attacker, action.target) && (action.target === 'leader' || powerOf(action.attacker) >= powerOf(action.target)))
  const kills   = attacks.filter(action => action.target !== 'leader')

  if (kills.length)
    return pickBest(kills, action => costOf(rival.characters.find(character => character.card.instanceId === action.target)!.card.defId) * 1000000 - powerOf(action.attacker), rng)
  if (attacks.length)
    return pickBest(attacks, action => powerOf(action.attacker), rng)

  return passAction(legal)

}


export function chooseAction(state: GameState, player: PlayerId, rng: Rng): Action {
  const legal = getLegalActions(state, player)

  if (!legal.length)
    throw new Error(`La IA no tiene acciones legales (${summary(state, player)})`)
  if (state.pending)
    return chooseOption(state, player, legal, rng)
  if (state.phase === 'mulligan')
    return legal.find(action => action.type === 'Mulligan' && action.redraw === shouldRedraw(state, player)) ?? legal[0]
  if (state.battle)
    return chooseBattle(state, player, legal)

  return chooseMain(state, player, legal, rng)

}
