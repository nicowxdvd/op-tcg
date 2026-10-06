import * as Phaser from 'phaser'
import type { Rect } from './layout'


export function dashedRoundRect(graphics: Phaser.GameObjects.Graphics, rect: Rect, radius: number, dash: number, gap: number): void {
  const { x, y, w, h } = rect
  const r                = Math.min(radius, w / 2, h / 2)
  const edges            = [[x + r, y, x + w - r, y], [x + w, y + r, x + w, y + h - r], [x + w - r, y + h, x + r, y + h], [x, y + h - r, x, y + r]]
  const corners          = [[x + w - r, y + r, 1.5], [x + w - r, y + h - r, 0], [x + r, y + h - r, 0.5], [x + r, y + r, 1]]

  edges.forEach(([x1, y1, x2, y2], i) => {
    const length = Math.hypot(x2 - x1, y2 - y1)
    const dx     = (x2 - x1) / length
    const dy     = (y2 - y1) / length

    for (let at = 0; at < length; at += dash + gap) {
      const end = Math.min(at + dash, length)

      graphics.lineBetween(x1 + dx * at, y1 + dy * at, x1 + dx * end, y1 + dy * end)

    }

    const [cx, cy, turn] = corners[i]

    graphics.beginPath()
    graphics.arc(cx, cy, r, Math.PI * turn, Math.PI * (turn + 0.5))
    graphics.strokePath()

  })

}
