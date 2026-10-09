import { apply, getLegalActions, opponentOf } from '../engine'
import type { Action, GameEvent, GameState, PlayerId } from '../engine'
import { advanceRng, chooseAction } from '../ai'
import type { AIPlayer } from '../ai'

export type GameHandler = (events: GameEvent[]) => void


export interface GameControllerOptions {
  ai?: AIPlayer | null
  rngSeed?: number

}


export class GameController {

  private state: GameState
  private handlers = new Set<GameHandler>()
  private ai: AIPlayer | null
  private rng: number
  private timer: ReturnType<typeof setTimeout> | null = null
  private disposed = false

  constructor(initial: GameState, options: GameControllerOptions = {}) {
    this.state = initial
    this.ai = options.ai ?? null
    this.rng = options.rngSeed ?? initial.seed
    this.scheduleCpu()

  }


  getState(): GameState {
    return this.state

  }


  getLegal(player: PlayerId): Action[] {
    return getLegalActions(this.state, player)

  }


  actor(): PlayerId {
    const active = this.state.active

    if (this.getLegal(active).length > 0)
      return active

    const rival = opponentOf(active)

    return this.getLegal(rival).length > 0 ? rival : active

  }


  dispatch(action: Action): void {
    const result = apply(this.state, action)

    this.state = result.state

    for (const handler of [...this.handlers])
      handler(result.events)

    this.scheduleCpu()

  }


  isCpu(player: PlayerId): boolean {
    return this.ai?.player === player

  }


  dispose(): void {
    this.disposed = true

    if (this.timer !== null)
      clearTimeout(this.timer)

    this.timer = null

  }


  private cpuDecider(): PlayerId | null {
    const ai = this.ai

    if (!ai || this.disposed || this.state.phase === 'gameOver')
      return null
    if (this.state.phase === 'mulligan')
      return this.getLegal(ai.player).length > 0 ? ai.player : null

    const state   = this.state
    const decider = state.pending?.player ?? (state.battle ? opponentOf(state.battle.attackerPlayer) : state.active)

    return decider === ai.player && this.getLegal(decider).length > 0 ? decider : null

  }


  private scheduleCpu(): void {
    if (this.timer !== null || this.cpuDecider() === null)
      return

    this.timer = setTimeout(() => this.stepCpu(), this.ai!.delayMs)

  }


  private stepCpu(): void {
    this.timer = null

    const decider = this.cpuDecider()

    if (decider === null)
      return

    const action = chooseAction(this.state, decider, this.rng, this.ai!.difficulty)

    this.rng = advanceRng(this.rng)
    this.dispatch(action)

  }


  on(handler: GameHandler): () => void {
    this.handlers.add(handler)

    return () => { this.handlers.delete(handler) }

  }

}
