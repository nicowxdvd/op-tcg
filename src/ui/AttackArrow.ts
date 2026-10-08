import * as Phaser from 'phaser'
import type { Point } from './layout'

const DASH     = 14
const GAP      = 9
const WIDTH    = 7
const HEAD     = 26
const CURVE    = 0.08
const SEGMENTS = 40


function mix(from: number, to: number, t: number): number {
  const a = Phaser.Display.Color.IntegerToColor(from)
  const b = Phaser.Display.Color.IntegerToColor(to)
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, 100, Math.round(t * 100))

  return Phaser.Display.Color.GetColor(c.r, c.g, c.b)

}


export function drawAttackArrow(scene: Phaser.Scene, from: Point, to: Point, fromColor: number, toColor: number): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics()
  const dx       = to.x - from.x
  const dy       = to.y - from.y
  const length   = Math.hypot(dx, dy)
  const bend     = { x: (from.x + to.x) / 2 - dy * CURVE, y: (from.y + to.y) / 2 + dx * CURVE }
  const at       = (t: number): Point => ({ x: (1 - t) ** 2 * from.x + 2 * (1 - t) * t * bend.x + t * t * to.x, y: (1 - t) ** 2 * from.y + 2 * (1 - t) * t * bend.y + t * t * to.y })
  const tailT    = Math.max(0, 1 - HEAD / Math.max(length, 1))
  const points   = Array.from({ length: SEGMENTS + 1 }, (_, i) => at(tailT * i / SEGMENTS))

  let travelled = 0

  for (let i = 1; i < points.length; i++) {
    const a    = points[i - 1]
    const b    = points[i]
    const step = Math.hypot(b.x - a.x, b.y - a.y)
    const lit  = travelled % (DASH + GAP) < DASH

    if (lit)
      graphics.lineStyle(WIDTH, mix(fromColor, toColor, i / SEGMENTS), 1).lineBetween(a.x, a.y, b.x, b.y)

    travelled += step

  }

  const tip   = at(1)
  const base  = at(tailT)
  const angle = Math.atan2(tip.y - base.y, tip.x - base.x)
  const side  = (offset: number): Point => ({ x: base.x + Math.cos(angle + offset) * HEAD * 0.7, y: base.y + Math.sin(angle + offset) * HEAD * 0.7 })
  const left  = side(-Math.PI / 2)
  const right = side(Math.PI / 2)

  graphics.fillStyle(toColor, 1).fillTriangle(left.x, left.y, right.x, right.y, tip.x, tip.y)

  return graphics

}
