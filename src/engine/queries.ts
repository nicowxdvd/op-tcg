import type { Action, GameState, PlayerId } from './types'
import { activateError } from './effects/activate'
import { modifierPower } from './effects/modifiers'
import { MAX_CHARACTERS, mulliganDecider, opponentOf } from './state'

export const DON_POWER = 1000

function attackActions(state: GameState, playerId: PlayerId): Action[] {
  if (state.turn <= 2)
    return []

  const player    = state.players[playerId]
  const rival     = state.players[opponentOf(playerId)]
  const attackers = [...(player.leaderRested ? [] : ['leader']), ...player.characters.filter(character => !character.rested && (character.playedTurn !== state.turn || state.defs[character.card.defId].keywords.includes('Rush'))).map(character => character.card.instanceId)]
  const targets   = ['leader', ...rival.characters.filter(character => character.rested).map(character => character.card.instanceId)]

  return attackers.flatMap((attacker): Action[] => targets.map(target => ({ type: 'Attack', player: playerId, attacker, target })))

}


function activateActions(state: GameState, playerId: PlayerId): Action[] {
  const player  = state.players[playerId]
  const sources = [player.leader.instanceId, ...player.characters.map(character => character.card.instanceId), ...(player.stage ? [player.stage.instanceId] : [])]
  const defOf   = (instanceId: string) => instanceId === player.leader.instanceId ? player.leader.defId : player.characters.find(character => character.card.instanceId === instanceId)?.card.defId ?? player.stage!.defId

  return sources.flatMap(source => (state.effects[defOf(source)] ?? []).flatMap((_, index): Action[] => activateError(state, playerId, source, index) === null ? [{ type: 'ActivateEffect', player: playerId, source, index }] : []))

}


function battleActions(state: GameState, playerId: PlayerId): Action[] {
  const battle = state.battle!

  if (playerId !== opponentOf(battle.attackerPlayer))
    return []

  const player = state.players[playerId]

  if (battle.step === 'block') {
    const blockers = player.characters.filter(character => !character.rested && state.defs[character.card.defId].keywords.includes('Blocker'))

    return [...blockers.map((character): Action => ({ type: 'DeclareBlock', player: playerId, blockerId: character.card.instanceId })), { type: 'PassBlock', player: playerId }]

  }

  const counters = player.hand.filter(card => state.defs[card.defId].type === 'Character' && state.defs[card.defId].counter > 0)

  return [...counters.map((card): Action => ({ type: 'UseCounter', player: playerId, instanceId: card.instanceId })), { type: 'PassCounter', player: playerId }]

}


export function getLegalActions(state: GameState, playerId: PlayerId): Action[] {
  if (state.pending)
    return state.pending.player === playerId ? [...state.pending.options.map((option): Action => ({ type: 'Choose', player: playerId, option })), ...(state.pending.optional ? [{ type: 'PassChoice', player: playerId } as Action] : [])] : []

  if (state.phase === 'mulligan')
    return mulliganDecider(state) === playerId ? [{ type: 'Mulligan', player: playerId, redraw: false }, { type: 'Mulligan', player: playerId, redraw: true }] : []
  if (state.phase !== 'main')
    return []
  if (state.battle)
    return battleActions(state, playerId)
  if (playerId !== state.active)
    return []

  const player    = state.players[playerId]
  const full      = player.characters.length >= MAX_CHARACTERS
  const playable  = player.hand.filter(card => state.defs[card.defId].type === 'Character' && state.defs[card.defId].cost <= player.donActive)
  const plays     = playable.flatMap((card): Action[] => full ? player.characters.map(character => ({ type: 'PlayCharacter', player: playerId, instanceId: card.instanceId, replaceId: character.card.instanceId })) : [{ type: 'PlayCharacter', player: playerId, instanceId: card.instanceId }])
  const others    = player.hand.filter(card => ((state.defs[card.defId].type === 'Event' && (state.effects[card.defId] ?? []).some(effect => effect.timing === 'main')) || state.defs[card.defId].type === 'Stage') && state.defs[card.defId].cost <= player.donActive)
  const spells    = others.map((card): Action => ({ type: state.defs[card.defId].type === 'Event' ? 'PlayEvent' : 'PlayStage', player: playerId, instanceId: card.instanceId }))
  const targets   = player.donActive > 0 ? ['leader', ...player.characters.map(character => character.card.instanceId)] : []
  const attaches  = targets.map((target): Action => ({ type: 'AttachDon', player: playerId, target }))

  return [...plays, ...spells, ...attaches, ...activateActions(state, playerId), ...attackActions(state, playerId), { type: 'PassPhase', player: playerId }]

}


function powerOf(state: GameState, defId: string, owner: PlayerId, attachedDon: number): number {
  return state.defs[defId].power + (owner === state.active ? attachedDon * DON_POWER : 0)

}


export function getPower(state: GameState, instanceId: string): number {
  for (const id of ['p1', 'p2'] as const) {
    const player    = state.players[id]
    const character = player.characters.find(candidate => candidate.card.instanceId === instanceId)

    if (player.leader.instanceId === instanceId)
      return powerOf(state, player.leader.defId, id, player.leaderAttachedDon) + modifierPower(state, instanceId)
    if (character)
      return powerOf(state, character.card.defId, id, character.attachedDon) + modifierPower(state, instanceId)
  }

  throw new Error(`La carta ${instanceId} no está en juego`)

}
