import type { PlayerId } from '../engine'

export const MATCH_MS = 20 * 60 * 1000
export const LOW_MS   = 60 * 1000


export class MatchClock {

  private left: Record<PlayerId, number>

  constructor(total = MATCH_MS) {
    this.left = { p1: total, p2: total }

  }


  tick(player: PlayerId | null, ms: number): void {
    if (player)
      this.left[player] = Math.max(0, this.left[player] - ms)

  }


  remaining(player: PlayerId): number {
    return this.left[player]

  }

}


export function formatClock(ms: number): string {
  const seconds = Math.ceil(ms / 1000)
  const pad     = (value: number) => String(value).padStart(2, '0')

  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`

}
