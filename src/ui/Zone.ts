import * as Phaser from 'phaser'
import { CardSprite } from './CardSprite'
import type { CardView } from './CardSprite'
import { dashedRoundRect } from './draw'
import { center } from './layout'
import type { Rect, Size } from './layout'
import { COLORS, RADIUS, textStyle } from './theme'


export class Zone extends Phaser.GameObjects.Container {

  readonly sprite: CardSprite | null = null

  constructor(scene: Phaser.Scene, rect: Rect, label: string, count: number | null, top: CardView | null, card: Size) {
    super(scene, 0, 0)

    const middle = center(rect)
    const font   = Math.max(8, Math.round(rect.h * 0.075))
    const frame  = scene.add.graphics()

    frame.fillStyle(COLORS.zoneFill, 0.55).fillRoundedRect(rect.x, rect.y, rect.w, rect.h, RADIUS.zone)
    frame.lineStyle(1.5, COLORS.zoneBorder, 0.6)
    dashedRoundRect(frame, rect, RADIUS.zone, 5, 4)
    this.add(frame)

    if (top) {
      this.sprite = new CardSprite(scene, middle.x, middle.y, card, { ...top, count: top.count ?? count ?? undefined })
      this.add(this.sprite)
    }
    else if (label)
      this.add(scene.add.text(middle.x, middle.y, label.toUpperCase(), textStyle(font, COLORS.zoneLabel)).setOrigin(0.5).setAlpha(0.6))

    if (label)
      this.add(scene.add.text(rect.x + 5, rect.y + 3, label.toUpperCase(), textStyle(font * 0.85, COLORS.zoneLabel)).setAlpha(0.8))

  }

}
