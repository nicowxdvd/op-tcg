import { apply, getLegalActions, opponentOf } from '../engine'
import type { Action, GameEvent, GameState, PlayerId } from '../engine'

export type GameHandler = (events: GameEvent[]) => void


export class GameController {

  private state: GameState
  private handlers = new Set<GameHandler>()

  constructor(initial: GameState) {
    this.state = initial

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

  }


  on(handler: GameHandler): () => void {
    this.handlers.add(handler)

    return () => { this.handlers.delete(handler) }

  }

}
