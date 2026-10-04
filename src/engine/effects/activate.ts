import type { Action, ApplyResult, EffectDef, EffectStep, GameEvent, GameState, PlayerId } from '../types'
import { requireMain, requireNoBattle } from '../state'
import { resolveQueue } from './index'
import { effectKey, isEligible, type EffectSource } from './timing'

type ActivateAction = Extract<Action, { type: 'ActivateEffect' }>

interface FoundSource {
  source: EffectSource
  rested: boolean
  restable: boolean

}


function findSource(state: GameState, id: PlayerId, instanceId: string): FoundSource | undefined {
  const player    = state.players[id]
  const character = player.characters.find(candidate => candidate.card.instanceId === instanceId)

  if (player.leader.instanceId === instanceId)
    return { source: { instanceId, defId: player.leader.defId, owner: id, attachedDon: player.leaderAttachedDon }, rested: player.leaderRested, restable: true }
  if (character)
    return { source: { instanceId, defId: character.card.defId, owner: id, attachedDon: character.attachedDon }, rested: character.rested, restable: true }
  if (player.stage?.instanceId === instanceId)
    return { source: { instanceId, defId: player.stage.defId, owner: id, attachedDon: 0 }, rested: false, restable: false }

}


function costError(state: GameState, id: PlayerId, found: FoundSource, effect: EffectDef): string | null {
  const player = state.players[id]
  const cost   = effect.cost

  if (cost?.restSelf && !found.restable)
    return 'Esta carta no se puede descansar como costo'
  if (cost?.restSelf && found.rested)
    return 'La carta ya está descansada'
  if ((cost?.restDon ?? 0) > player.donActive)
    return `DON!! insuficiente: costo ${cost!.restDon}, activos ${player.donActive}`
  if ((cost?.trashFromHand ?? 0) > player.hand.length)
    return `Mano insuficiente: hay que trashear ${cost!.trashFromHand}, hay ${player.hand.length}`

  return null

}


export function activateError(state: GameState, id: PlayerId, instanceId: string, index: number): string | null {
  const found  = findSource(state, id, instanceId)
  const effect = found && state.effects[found.source.defId]?.[index]

  if (!found || !effect)
    return `La carta ${instanceId} no tiene el efecto ${index} en juego`
  if (effect.timing !== 'activateMain')
    return `El efecto ${index} de ${instanceId} no es [Activate: Main]`
  if (!isEligible(state, found.source, index, effect))
    return `El efecto ${index} de ${instanceId} no se puede activar ahora`

  return costError(state, id, found, effect)

}


export function activateEffect(state: GameState, action: ActivateAction): ApplyResult {
  requireMain(state, action.player)
  requireNoBattle(state)

  const error = activateError(state, action.player, action.source, action.index)

  if (error)
    throw new Error(error)

  const found               = findSource(state, action.player, action.source)!
  const effect              = state.effects[found.source.defId][action.index]
  const cost                = effect.cost
  const player              = state.players[action.player]
  const events: GameEvent[] = [{ type: 'EffectActivated', player: action.player, source: action.source, index: action.index }]
  const paid                = cost?.restDon ? { ...state, players: { ...state.players, [action.player]: { ...player, donActive: player.donActive - cost.restDon, donRested: player.donRested + cost.restDon } } } : state
  const steps: EffectStep[] = [...(cost?.restSelf ? [{ op: 'rest', target: action.source } as EffectStep] : []), ...(cost?.trashFromHand ? [{ op: 'trashFromHand', player: action.player, amount: cost.trashFromHand } as EffectStep] : []), ...effect.run({ state: paid, source: action.source, owner: action.player })]

  if (cost?.restDon)
    events.push({ type: 'DonRested', player: action.player, amount: cost.restDon })

  const queued = { ...paid, effectQueue: [...paid.effectQueue, { source: action.source, owner: action.player, steps }], oncePerTurnUsed: effect.oncePerTurn ? [...paid.oncePerTurnUsed, effectKey(found.source, action.index)] : paid.oncePerTurnUsed }

  return { state: resolveQueue(queued, events), events }

}
