import { describe, expect, it } from 'vitest'
import type { GameEvent } from '../../src/engine'
import { describeEvent } from '../../src/learn/describeEvent'
import { startGame, withPlayer } from '../engine/helpers'

const state = startGame()
const mine  = state.players[state.active].hand[0].instanceId
const rival = state.active === 'p1' ? 'p2' : 'p1'

const SAMPLES: { [K in GameEvent['type']]: Extract<GameEvent, { type: K }> } = {
  MulliganDecided: { type: 'MulliganDecided', player: 'p1', redraw: true },
  GameStarted: { type: 'GameStarted', first: 'p1' },
  PhaseChanged: { type: 'PhaseChanged', phase: 'main', turn: 1, active: 'p1' },
  CardDrawn: { type: 'CardDrawn', player: 'p1', instanceId: mine },
  DonAdded: { type: 'DonAdded', player: 'p1', amount: 2 },
  CharacterPlayed: { type: 'CharacterPlayed', player: 'p1', instanceId: mine },
  EventPlayed: { type: 'EventPlayed', player: 'p1', instanceId: mine },
  StagePlayed: { type: 'StagePlayed', player: 'p1', instanceId: mine },
  StageTrashed: { type: 'StageTrashed', player: 'p1', instanceId: mine },
  CharacterTrashed: { type: 'CharacterTrashed', player: 'p1', instanceId: mine },
  DonAttached: { type: 'DonAttached', player: 'p1', target: 'leader' },
  AttackDeclared: { type: 'AttackDeclared', player: 'p1', attacker: 'leader', target: 'leader' },
  BlockDeclared: { type: 'BlockDeclared', player: 'p1', blockerId: mine },
  BlockPassed: { type: 'BlockPassed', player: 'p1' },
  CounterUsed: { type: 'CounterUsed', player: 'p1', instanceId: mine, counterPower: 2000 },
  CounterPassed: { type: 'CounterPassed', player: 'p1' },
  LifeTaken: { type: 'LifeTaken', player: 'p1', instanceId: mine },
  LifeBanished: { type: 'LifeBanished', player: 'p1', instanceId: mine },
  CharacterKOd: { type: 'CharacterKOd', player: 'p1', instanceId: mine },
  EffectTriggered: { type: 'EffectTriggered', player: 'p1', source: mine, timing: 'onPlay' },
  CharacterRested: { type: 'CharacterRested', target: mine },
  CharacterActivated: { type: 'CharacterActivated', target: mine },
  CardSearched: { type: 'CardSearched', player: 'p1', instanceId: mine },
  CardToLife: { type: 'CardToLife', player: 'p1', instanceId: mine },
  CardToHand: { type: 'CardToHand', player: 'p1', instanceId: mine },
  ChoiceRequested: { type: 'ChoiceRequested', player: 'p1', kind: 'target', options: [mine] },
  ChoiceMade: { type: 'ChoiceMade', player: 'p1', option: mine },
  ChoicePassed: { type: 'ChoicePassed', player: 'p1' },
  EffectActivated: { type: 'EffectActivated', player: 'p1', source: mine, index: 0 },
  CardDiscarded: { type: 'CardDiscarded', player: 'p1', instanceId: mine },
  DonRested: { type: 'DonRested', player: 'p1', amount: 1 },
  DonActivated: { type: 'DonActivated', player: 'p1', amount: 1 },
  PowerModified: { type: 'PowerModified', target: mine, amount: 1000, duration: 'thisTurn' },
  TriggerAvailable: { type: 'TriggerAvailable', player: 'p1', instanceId: mine },
  TriggerRevealed: { type: 'TriggerRevealed', player: 'p1', instanceId: mine },
  TriggerPassed: { type: 'TriggerPassed', player: 'p1', instanceId: mine },
  BattleEnded: { type: 'BattleEnded', connected: true },
  GameOver: { type: 'GameOver', winner: 'p1' }
}

describe('describeEvent', () => {

  it.each(Object.values(SAMPLES))('describe el evento $type', event => {
    const line = describeEvent(event, state)

    expect(line).not.toBe(event.type)
    expect(line.length).toBeGreaterThan(0)

  })


  it('muestra los power comparados en un ataque', () => {
    const turn3  = withPlayer({ ...state, turn: 3 }, state.active, { leaderAttachedDon: 1 })
    const attack = describeEvent({ type: 'AttackDeclared', player: state.active, attacker: 'leader', target: 'leader' }, turn3)

    expect(attack).toBe('Leader Rojo ataca al Leader rival, 6000 contra 5000')

  })


  it('un ataque a un Character nombra al objetivo', () => {
    const line = describeEvent({ type: 'AttackDeclared', player: state.active, attacker: 'leader', target: mine }, state)

    expect(line).toContain('Leader Rojo ataca a ')
    expect(line).not.toContain('Leader rival')

  })


  it('no revela el nombre de la carta robada', () => {
    const name = state.defs[state.players[state.active].hand[0].defId].name

    expect(describeEvent({ type: 'CardDrawn', player: state.active, instanceId: mine }, state)).not.toContain(name)

  })


  it('devuelve el nombre del evento si no tiene descripción', () => {
    const unknown = { type: 'EventoNuevo' } as unknown as GameEvent

    expect(describeEvent(unknown, state)).toBe('EventoNuevo')

  })


  it('usa Jugador 1 y Jugador 2 según el jugador del evento', () => {
    expect(describeEvent({ type: 'BlockPassed', player: rival }, state)).toBe(`Jugador ${rival === 'p1' ? 1 : 2} no bloquea`)

  })

})
