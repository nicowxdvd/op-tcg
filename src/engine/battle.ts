import type { Action, ApplyResult, BattleState, GameEvent, GameState, PlayerId } from './types'
import { opponentOf, requireMain } from './state'
import { getPower, isBlockLocked } from './queries'
import { clearModifiers } from './effects/modifiers'
import { hasKeyword } from './effects/passive'
import { fireEffects } from './effects'

type AttackAction       = Extract<Action, { type: 'Attack' }>
type DeclareBlockAction = Extract<Action, { type: 'DeclareBlock' }>
type PassBlockAction    = Extract<Action, { type: 'PassBlock' }>
type UseCounterAction   = Extract<Action, { type: 'UseCounter' }>
type CounterEventAction = Extract<Action, { type: 'UseCounterEvent' }>
type RevealAction       = Extract<Action, { type: 'RevealTrigger' }>
type PassTriggerAction  = Extract<Action, { type: 'PassTrigger' }>
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
  if (character && character.playedTurn === state.turn && !hasKeyword(state, character.card.instanceId, 'Rush'))
    throw new Error(`El Character ${action.attacker} entró este turno y no puede atacar`)
  if (action.target !== 'leader' && !target)
    throw new Error(`El Character ${action.target} no está en juego del rival`)
  if (target && !target.rested)
    throw new Error(`Solo se ataca a un Character rival descansado (${action.target} está activo)`)

  const rested = fromLeader ? { ...player, leaderRested: true } : { ...player, characters: player.characters.map(candidate => candidate === character ? { ...candidate, rested: true } : candidate) }
  const battle = { attacker: action.attacker, target: action.target, attackerPlayer: action.player, step: 'block' as const, counterPower: 0 }

  const events: GameEvent[] = [{ type: 'AttackDeclared', player: action.player, attacker: action.attacker, target: action.target }]
  const source              = fromLeader ? { instanceId: player.leader.instanceId, defId: player.leader.defId, owner: action.player, attachedDon: player.leaderAttachedDon } : { instanceId: character!.card.instanceId, defId: character!.card.defId, owner: action.player, attachedDon: character!.attachedDon }

  return { state: fireEffects({ ...state, players: { ...state.players, [action.player]: rested }, battle }, 'whenAttacking', source, events), events }

}


export function declareBlock(state: GameState, action: DeclareBlockAction): ApplyResult {
  const battle  = requireStep(state, action.player, 'block')
  const player  = state.players[action.player]
  const blocker = player.characters.find(candidate => candidate.card.instanceId === action.blockerId)

  if (!blocker)
    throw new Error(`El Character ${action.blockerId} no está en juego`)
  if (!hasKeyword(state, blocker.card.instanceId, 'Blocker'))
    throw new Error(`El Character ${action.blockerId} no tiene Blocker`)
  if (isBlockLocked(state, blocker.card.instanceId))
    throw new Error(`El Character ${action.blockerId} no puede bloquear en esta batalla`)
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


export function useCounterEvent(state: GameState, action: CounterEventAction): ApplyResult {
  const battle = requireStep(state, action.player, 'counter')
  const player = state.players[action.player]
  const picked = player.hand.find(candidate => candidate.instanceId === action.instanceId)
  const def    = picked && state.defs[picked.defId]

  if (!picked || !def)
    throw new Error(`La carta ${action.instanceId} no está en la mano de ${action.player}`)
  if (def.type !== 'Event')
    throw new Error(`${def.name} no es un Event`)
  if (!(state.effects[picked.defId] ?? []).some(effect => effect.timing === 'counter'))
    throw new Error(`${def.name} no tiene efecto [Counter]`)
  if (player.donActive < def.cost)
    throw new Error(`DON!! insuficiente: cost ${def.cost}, activos ${player.donActive}`)

  const counterPower        = battle.counterPower + def.counter
  const events: GameEvent[] = [{ type: 'CounterUsed', player: action.player, instanceId: action.instanceId, counterPower }]
  const updated             = { ...player, hand: player.hand.filter(candidate => candidate !== picked), trash: [...player.trash, picked], donActive: player.donActive - def.cost, donRested: player.donRested + def.cost }
  const next                = { ...state, players: { ...state.players, [action.player]: updated }, battle: { ...battle, counterPower } }

  return { state: fireEffects(next, 'counter', { instanceId: picked.instanceId, defId: picked.defId, owner: action.player, attachedDon: 0 }, events), events }

}


function dealLifeDamage(state: GameState, battle: BattleState, hits: number, banish: boolean, events: GameEvent[]): GameState {
  const defender = opponentOf(battle.attackerPlayer)
  let next       = state

  for (let hit = 0; hit < hits; hit++) {
    const rival = next.players[defender]

    if (!rival.life.length) {
      events.push({ type: 'GameOver', winner: battle.attackerPlayer })

      return { ...next, phase: 'gameOver', winner: battle.attackerPlayer, battle: null }

    }

    const [top, ...rest] = rival.life
    const triggers       = !banish && (state.effects[top.defId] ?? []).some(effect => effect.timing === 'trigger')
    const hurt           = banish ? { ...rival, life: rest, trash: [...rival.trash, top] } : triggers ? { ...rival, life: rest } : { ...rival, life: rest, hand: [...rival.hand, top] }

    events.splice(events.length - 1, 0, { type: banish ? 'LifeBanished' : 'LifeTaken', player: defender, instanceId: top.instanceId })

    next = { ...next, players: { ...next.players, [defender]: hurt } }

    if (triggers) {
      events.pop()
      events.push({ type: 'TriggerAvailable', player: defender, instanceId: top.instanceId })

      return { ...next, battle: { ...battle, step: 'trigger', triggerCard: top, hitsLeft: hits - hit - 1 } }

    }

  }

  return { ...next, battle: null }

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

    return fireEffects({ ...state, players: { ...state.players, [defender]: knocked }, battle: null }, 'onKO', { instanceId: struck.card.instanceId, defId: struck.card.defId, owner: defender, attachedDon: struck.attachedDon }, events)

  }

  return dealLifeDamage(state, battle, hasKeyword(state, attackerId, 'DoubleAttack') ? 2 : 1, hasKeyword(state, attackerId, 'Banish'), events)

}


export function passCounter(state: GameState, action: PassCounterAction): ApplyResult {
  const battle = requireStep(state, action.player, 'counter')
  const events: GameEvent[] = [{ type: 'CounterPassed', player: action.player }]

  const resolved = resolveDamage(state, battle, events)

  return { state: resolved.battle ? resolved : clearModifiers(resolved, 'thisBattle'), events }

}


function continueBattle(state: GameState, events: GameEvent[]): GameState {
  const battle = state.battle!

  events.push({ type: 'BattleEnded', connected: true })

  const resolved = dealLifeDamage(state, battle, battle.hitsLeft ?? 0, false, events)

  return resolved.battle ? resolved : clearModifiers(resolved, 'thisBattle')

}


export function resumeTrigger(state: GameState, events: GameEvent[]): GameState {
  if (state.pending)
    return state
  if (state.phase === 'gameOver')
    return { ...state, battle: null }
  if (!state.battle || state.battle.step !== 'trigger' || state.battle.triggerCard)
    return state

  return continueBattle(state, events)

}


export function revealTrigger(state: GameState, action: RevealAction): ApplyResult {
  const battle   = requireStep(state, action.player, 'trigger')
  const card     = battle.triggerCard!
  const player   = state.players[action.player]
  const events: GameEvent[] = [{ type: 'TriggerRevealed', player: action.player, instanceId: card.instanceId }]
  const next     = { ...state, players: { ...state.players, [action.player]: { ...player, trash: [...player.trash, card] } }, battle: { ...battle, triggerCard: undefined } }
  const resolved = fireEffects(next, 'trigger', { instanceId: card.instanceId, defId: card.defId, owner: action.player, attachedDon: 0 }, events)

  return { state: resumeTrigger(resolved, events), events }

}


export function passTrigger(state: GameState, action: PassTriggerAction): ApplyResult {
  const battle = requireStep(state, action.player, 'trigger')
  const card   = battle.triggerCard!
  const player = state.players[action.player]
  const events: GameEvent[] = [{ type: 'TriggerPassed', player: action.player, instanceId: card.instanceId }]
  const next   = { ...state, players: { ...state.players, [action.player]: { ...player, hand: [...player.hand, card] } }, battle: { ...battle, triggerCard: undefined } }

  return { state: resumeTrigger(next, events), events }

}
