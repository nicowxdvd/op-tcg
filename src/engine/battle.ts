import type { Action, ApplyResult, GameState } from './types'
import { opponentOf, requireMain } from './state'

type AttackAction = Extract<Action, { type: 'Attack' }>

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
