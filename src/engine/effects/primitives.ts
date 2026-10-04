import type { EffectStep, GameEvent, GameState, PlayerId, QueuedEffect } from '../types'
import { opponentOf } from '../state'
import { addModifier } from './modifiers'

function drawCards(state: GameState, player: PlayerId, amount: number, events: GameEvent[]): GameState {
  let next = state

  for (let i = 0; i < amount; i++) {
    const current = next.players[player]

    if (!current.deck.length) {
      events.push({ type: 'GameOver', winner: opponentOf(player) })

      return { ...next, phase: 'gameOver', winner: opponentOf(player) }

    }

    const [top, ...rest] = current.deck

    events.push({ type: 'CardDrawn', player, instanceId: top.instanceId })

    next = { ...next, players: { ...next.players, [player]: { ...current, hand: [...current.hand, top], deck: rest } } }

  }

  return next

}


export function executeStep(state: GameState, step: EffectStep, queued: QueuedEffect, events: GameEvent[]): GameState {
  switch (step.op) {
    case 'draw':
      return drawCards(state, step.player, step.amount, events)
    case 'power':
      events.push({ type: 'PowerModified', target: step.target, amount: step.amount, duration: step.duration })

      return addModifier(state, { target: step.target, power: step.amount, duration: step.duration, sourceId: queued.source })
    default:
      throw new Error(`Primitiva no implementada: ${step.op}`)
  }

}
