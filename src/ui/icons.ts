import * as Phaser from 'phaser'
import { COLORS } from './theme'

export type IconKind = 'fullscreen' | 'sound' | 'moon' | 'gear' | 'bug' | 'minus' | 'order' | 'check' | 'close' | 'info' | 'play' | 'flask' | 'chevron'


export function drawIcon(graphics: Phaser.GameObjects.Graphics, kind: IconKind, cx: number, cy: number, size: number, color: number = COLORS.text): void {
  const r = size / 2

  graphics.lineStyle(Math.max(1.5, size * 0.09), color, 1)

  switch (kind) {
    case 'fullscreen':
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        graphics.lineBetween(cx + sx * r * 0.2, cy + sy * r * 0.2, cx + sx * r * 0.2, cy + sy * r * 0.75)
        graphics.lineBetween(cx + sx * r * 0.2, cy + sy * r * 0.2, cx + sx * r * 0.75, cy + sy * r * 0.2)
      }

      break
    case 'sound':
      graphics.strokePoints([[-0.7, -0.25], [-0.3, -0.25], [0.1, -0.6], [0.1, 0.6], [-0.3, 0.25], [-0.7, 0.25]].map(([px, py]) => new Phaser.Math.Vector2(cx + r * px, cy + r * py)), true)
      graphics.beginPath().arc(cx + r * 0.1, cy, r * 0.5, -0.9, 0.9).strokePath()

      break
    case 'moon':
      graphics.beginPath().arc(cx, cy, r * 0.65, 0.6, 5.4).arc(cx + r * 0.35, cy - r * 0.1, r * 0.55, 5.0, 1.0, true).strokePath()

      break
    case 'gear':
      graphics.strokeCircle(cx, cy, r * 0.28)

      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4

        graphics.lineBetween(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, cx + Math.cos(a) * r * 0.75, cy + Math.sin(a) * r * 0.75)

      }

      graphics.strokeCircle(cx, cy, r * 0.5)

      break
    case 'bug':
      graphics.strokeEllipse(cx, cy + r * 0.1, r * 0.9, r * 1.2)
      graphics.lineBetween(cx - r * 0.45, cy - r * 0.1, cx - r * 0.85, cy - r * 0.3)
      graphics.lineBetween(cx + r * 0.45, cy - r * 0.1, cx + r * 0.85, cy - r * 0.3)
      graphics.lineBetween(cx - r * 0.45, cy + r * 0.5, cx - r * 0.85, cy + r * 0.7)
      graphics.lineBetween(cx + r * 0.45, cy + r * 0.5, cx + r * 0.85, cy + r * 0.7)

      break
    case 'minus':
      graphics.lineBetween(cx - r * 0.5, cy, cx + r * 0.5, cy)

      break
    case 'order':
      graphics.lineBetween(cx - r * 0.4, cy - r * 0.6, cx - r * 0.4, cy + r * 0.6)
      graphics.lineBetween(cx - r * 0.4, cy + r * 0.6, cx - r * 0.7, cy + r * 0.3)
      graphics.lineBetween(cx + r * 0.4, cy + r * 0.6, cx + r * 0.4, cy - r * 0.6)
      graphics.lineBetween(cx + r * 0.4, cy - r * 0.6, cx + r * 0.7, cy - r * 0.3)

      break
    case 'check':
      graphics.strokePoints([[-0.6, 0.05], [-0.2, 0.45], [0.65, -0.45]].map(([px, py]) => new Phaser.Math.Vector2(cx + r * px, cy + r * py)), false)

      break
    case 'close':
      graphics.lineBetween(cx - r * 0.5, cy - r * 0.5, cx + r * 0.5, cy + r * 0.5)
      graphics.lineBetween(cx + r * 0.5, cy - r * 0.5, cx - r * 0.5, cy + r * 0.5)

      break
    case 'play':
      graphics.strokePoints([[-0.35, -0.6], [0.65, 0], [-0.35, 0.6]].map(([px, py]) => new Phaser.Math.Vector2(cx + r * px, cy + r * py)), true)
      break
    case 'flask':
      graphics.strokePoints([[-0.2, -0.8], [-0.2, -0.2], [-0.75, 0.7], [0.75, 0.7], [0.2, -0.2], [0.2, -0.8]].map(([px, py]) => new Phaser.Math.Vector2(cx + r * px, cy + r * py)), false)
      graphics.lineBetween(cx - r * 0.35, cy - r * 0.8, cx + r * 0.35, cy - r * 0.8)
      break
    case 'chevron':
      graphics.strokePoints([[-0.5, -0.25], [0, 0.25], [0.5, -0.25]].map(([px, py]) => new Phaser.Math.Vector2(cx + r * px, cy + r * py)), false)
      break
    case 'info':
      graphics.strokeCircle(cx, cy, r * 0.8)
      graphics.lineBetween(cx, cy - r * 0.05, cx, cy + r * 0.4)
      graphics.fillStyle(color, 1).fillCircle(cx, cy - r * 0.35, Math.max(1.2, size * 0.06))

      break
  }

}
