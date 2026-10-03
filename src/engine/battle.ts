import type { Action, ApplyResult, BattleState, GameState, PlayerId } from './types'
import { opponentOf, requireMain } from './state'

type AttackAction       = Extract<Action, { type: 'Attack' }>
type DeclareBlockAction = Extract<Action, { type: 'DeclareBlock' }>
type PassBlockAction    = Extract<Action, { type: 'PassBlock' }>


function requireBlockStep(state: GameState, player: PlayerId): BattleState {
  if (!state.battle || state.battle.step !== 'block')
    throw new Error('No hay una batalla en el paso block')
  if (player !== opponentOf(state.battle.attackerPlayer))
    throw new Error(`En el paso block decide ${opponentOf(state.battle.attackerPlayer)}, no ${player}`)

  return state.battle

}

export function attack(state: GameState, action: AttackAction): ApplyResult {
  requireMain(state, action.player)

  const player     = state.players[action.player]
  const rival      = state.players[opponentOf(action.player)]
  const fromLeader = action.attacker === 'leader'
  const character  = player.characters.find(candidate => candidate.card.instanceId === action.attacker)
  const target     = rival.characters.find(candidate => candidate.card.instanceId === action.target)

  if (state.battle)
    throw new Error('Ya hay una batalla en curso')
  if (state.turn <= 2)
    throw new Error('Nadie ataca en su primer turno')
  if (!fromLeader && !character)
    throw new Error(`El Character ${action.attacker} no está en juego`)
  if (fromLeader ? player.leaderRested : character!.rested)
    throw new Error(`El atacante ${action.attacker} está descansado`)
  if (character && character.playedTurn === state.turn)
    throw new Error(`El Character ${action.attacker} entró este turno y no puede atacar`)
  if (action.target !== 'leader' && !target)
    throw new Error(`El Character ${action.target} no está en juego del rival`)
  if (target && !target.rested)
    throw new Error(`Solo se ataca a un Character rival descansado (${action.target} está activo)`)

  const rested = fromLeader ? { ...player, leaderRested: true } : { ...player, characters: player.characters.map(candidate => candidate === character ? { ...candidate, rested: true } : candidate) }
  const battle = { attacker: action.attacker, target: action.target, attackerPlayer: action.player, step: 'block' as const, counterPower: 0 }

  return { state: { ...state, players: { ...state.players, [action.player]: rested }, battle }, events: [{ type: 'AttackDeclared', player: action.player, attacker: action.attacker, target: action.target }] }

}


export function declareBlock(state: GameState, action: DeclareBlockAction): ApplyResult {
  const battle  = requireBlockStep(state, action.player)
  const player  = state.players[action.player]
  const blocker = player.characters.find(candidate => candidate.card.instanceId === action.blockerId)

  if (!blocker)
    throw new Error(`El Character ${action.blockerId} no está en juego`)
  if (!state.defs[blocker.card.defId].keywords.includes('Blocker'))
    throw new Error(`El Character ${action.blockerId} no tiene Blocker`)
  if (blocker.rested)
    throw new Error(`El Character ${action.blockerId} está descansado y no puede bloquear`)

  const rested = { ...player, characters: player.characters.map(candidate => candidate === blocker ? { ...candidate, rested: true } : candidate) }

  return { state: { ...state, players: { ...state.players, [action.player]: rested }, battle: { ...battle, target: action.blockerId, step: 'counter' } }, events: [{ type: 'BlockDeclared', player: action.player, blockerId: action.blockerId }] }

}


export function passBlock(state: GameState, action: PassBlockAction): ApplyResult {
  const battle = requireBlockStep(state, action.player)

  return { state: { ...state, battle: { ...battle, step: 'counter' } }, events: [{ type: 'BlockPassed', player: action.player }] }

}
