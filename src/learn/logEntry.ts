import type { GameEvent, GameState, PlayerId } from '../engine'
import { codeOf, nameOf } from '../ui/prompts'
import { describeEvent } from './describeEvent'
import { TIMING_NAMES } from './texts'

export type SegmentKind = 'actor' | 'self' | 'card' | 'timing' | 'dim' | 'text'

export interface Segment {
  kind: SegmentKind
  text: string

}

export type LogEntry = { kind: 'turn'; text: string } | { kind: 'line'; icon: 'person' | 'play'; segments: Segment[] }

export interface LogContext {
  names: Record<PlayerId, string>
  self: PlayerId

}


function actor(context: LogContext, player: PlayerId): Segment {
  return { kind: player === context.self ? 'self' : 'actor', text: context.names[player] }

}


function card(state: GameState, instanceId: string): Segment {
  return { kind: 'card', text: `${codeOf(state, instanceId)} ${nameOf(state, instanceId)}` }

}


function target(state: GameState, player: PlayerId, id: 'leader' | string): Segment {
  return card(state, id === 'leader' ? state.players[player].leader.instanceId : id)

}


function text(value: string): Segment {
  return { kind: 'text', text: value }

}


function line(segments: Segment[], icon: 'person' | 'play' = 'person'): LogEntry {
  return { kind: 'line', icon, segments }

}


function fromText(plain: string, context: LogContext): LogEntry {
  const parts = plain.split(/(Jugador [12])/).filter(part => part !== '')

  return line(parts.map(part => /^Jugador [12]$/.test(part) ? actor(context, part === 'Jugador 1' ? 'p1' : 'p2') : text(part)))

}


export function describeEntry(event: GameEvent, state: GameState, context: LogContext): LogEntry | null {
  switch (event.type) {
    case 'PhaseChanged':
      return event.phase === 'refresh' ? { kind: 'turn', text: `TURNO ${event.turn} · ${context.names[event.active].toUpperCase()}` } : null
    case 'GameStarted':
      return line([actor(context, event.first), text('empieza')], 'play')
    case 'CardDrawn':
      return line([actor(context, event.player), text('robó 1')])
    case 'DonAdded':
      return line([actor(context, event.player), text(`+${event.amount} DON!!`)])
    case 'CharacterPlayed':
    case 'EventPlayed':
    case 'StagePlayed':
      return line([actor(context, event.player), text('jugó'), card(state, event.instanceId)])
    case 'AttackDeclared': {
      const rival = event.player === 'p1' ? 'p2' : 'p1'

      return line([actor(context, event.player), text('atacó con'), target(state, event.player, event.attacker), text('a'), target(state, rival, event.target)])

    }
    case 'EffectTriggered':
      return line([card(state, event.source), { kind: 'timing', text: TIMING_NAMES[event.timing].replace(/^\[|\]$/g, '') }], 'play')
    default:
      return fromText(describeEvent(event, state), context)
  }

}
