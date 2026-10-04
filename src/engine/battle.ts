import type { Action, ApplyResult, BattleState, GameEvent, GameState, PlayerId } from './types'
import { opponentOf, requireMain } from './state'
import { getPower } from './queries'

type AttackAction       = Extract<Action, { type: 'Attack' }>
type DeclareBlockAction = Extract<Action, { type: 'DeclareBlock' }>
type PassBlockAction    = Extract<Action, { type: 'PassBlock' }>
type UseCounterAction   = Extract<Action, { type: 'UseCounter' }>
type PassCounterAction  = Extract<Action, { type: 'PassCounter' }>


function requireStep(state: GameState, player: PlayerId, step: BattleState['step']): BattleState {
  if (!state.battle || state.battle.step !== step)
    throw new Error(`No hay una batalla en el paso ${step}`)
  if (player !== opponentOf(state.battle.attackerPlayer))
    throw new Error(`En el paso ${step} decide ${opponentOf(state.battle.attackerPlayer)}, no ${player}`)

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
  if (character && character.playedTurn === state.turn && !state.defs[character.card.defId].keywords.includes('Rush'))
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
  const battle  = requireStep(state, action.player, 'block')
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
  const battle = requireStep(state, action.player, 'block')

  return { state: { ...state, battle: { ...battle, step: 'counter' } }, events: [{ type: 'BlockPassed', player: action.player }] }

}


export function useCounter(state: GameState, action: UseCounterAction): ApplyResult {
  const battle = requireStep(state, action.player, 'counter')
  const player = state.players[action.player]
  const picked = player.hand.find(candidate => candidate.instanceId === action.instanceId)
  const def    = picked && state.defs[picked.defId]

  if (!picked || !def)
    throw new Error(`La carta ${action.instanceId} no está en la mano de ${action.player}`)
  if (def.type !== 'Character')
    throw new Error(`${def.name} no es un Character`)
  if (def.counter <= 0)
    throw new Error(`${def.name} no tiene counter`)

  const updated      = { ...player, hand: player.hand.filter(candidate => candidate !== picked), trash: [...player.trash, picked] }
  const counterPower = battle.counterPower + def.counter

  return { state: { ...state, players: { ...state.players, [action.player]: updated }, battle: { ...battle, counterPower } }, events: [{ type: 'CounterUsed', player: action.player, instanceId: action.instanceId, counterPower }] }

}


function dealLifeDamage(state: GameState, battle: BattleState, events: GameEvent[]): GameState {
  const defender = opponentOf(battle.attackerPlayer)
  const keywords = state.defs[attackerDefId(state, battle)].keywords
  const banish   = keywords.includes('Banish')
  const hits     = keywords.includes('DoubleAttack') ? 2 : 1
  let next       = state

  for (let hit = 0; hit < hits; hit++) {
    const rival = next.players[defender]

    if (!rival.life.length) {
      events.push({ type: 'GameOver', winner: battle.attackerPlayer })

      return { ...next, phase: 'gameOver', winner: battle.attackerPlayer, battle: null }

    }

    const [top, ...rest] = rival.life
    const hurt           = banish ? { ...rival, life: rest, trash: [...rival.trash, top] } : { ...rival, life: rest, hand: [...rival.hand, top] }

    events.splice(events.length - 1, 0, { type: banish ? 'LifeBanished' : 'LifeTaken', player: defender, instanceId: top.instanceId })

    next = { ...next, players: { ...next.players, [defender]: hurt } }

  }

  return { ...next, battle: null }

}


function attackerDefId(state: GameState, battle: BattleState): string {
  const player = state.players[battle.attackerPlayer]

  return battle.attacker === 'leader' ? player.leader.defId : player.characters.find(candidate => candidate.card.instanceId === battle.attacker)!.card.defId

}


function resolveDamage(state: GameState, battle: BattleState, events: GameEvent[]): GameState {
  const defender   = opponentOf(battle.attackerPlayer)
  const rival      = state.players[defender]
  const toLeader   = battle.target === 'leader'
  const struck     = rival.characters.find(candidate => candidate.card.instanceId === battle.target)
  const targetId   = toLeader ? rival.leader.instanceId : battle.target
  const attackerId = battle.attacker === 'leader' ? state.players[battle.attackerPlayer].leader.instanceId : battle.attacker

  if (!toLeader && !struck) {
    events.push({ type: 'BattleEnded', connected: false })

    return { ...state, battle: null }

  }

  const connected = getPower(state, attackerId) >= getPower(state, targetId) + battle.counterPower

  events.push({ type: 'BattleEnded', connected })

  if (!connected)
    return { ...state, battle: null }

  if (struck) {
    events.splice(events.length - 1, 0, { type: 'CharacterKOd', player: defender, instanceId: struck.card.instanceId })

    const knocked = { ...rival, characters: rival.characters.filter(candidate => candidate !== struck), trash: [...rival.trash, struck.card], donRested: rival.donRested + struck.attachedDon }

    return { ...state, players: { ...state.players, [defender]: knocked }, battle: null }

  }

  return dealLifeDamage(state, battle, events)

}


export function passCounter(state: GameState, action: PassCounterAction): ApplyResult {
  const battle = requireStep(state, action.player, 'counter')
  const events: GameEvent[] = [{ type: 'CounterPassed', player: action.player }]

  return { state: resolveDamage(state, battle, events), events }

}
