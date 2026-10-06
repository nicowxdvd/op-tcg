import * as Phaser from 'phaser'
import { CardSprite } from './CardSprite'
import type { Rect, Size } from './layout'
import { COLORS, RADIUS, textStyle } from './theme'


export class LifeArea extends Phaser.GameObjects.Container {

  constructor(scene: Phaser.Scene, rect: Rect, count: number, card: Size) {
    super(scene, 0, 0)

    const font  = Math.max(9, Math.round(rect.h * 0.11))
    const bar   = rect.h * 0.22
    const small = { w: card.w * 0.7, h: card.h * 0.7 }
    const step  = count > 1 ? Math.min(5, (rect.h - bar - small.h - 4) / (count - 1)) : 0
    const frame = scene.add.graphics()

    frame.fillStyle(COLORS.crimsonDark, 0.35).fillRoundedRect(rect.x, rect.y, rect.w, rect.h, RADIUS.zone)
    frame.lineStyle(1.5, COLORS.lifeText, 0.7).strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, RADIUS.zone)
    this.add(frame)

    for (let i = 0; i < count; i++)
      this.add(new CardSprite(scene, rect.x + rect.w / 2, rect.y + 4 + small.h / 2 + i * step, small, { def: null }))

    const label = scene.add.graphics()

    label.fillStyle(COLORS.crimsonDark, 0.9).fillRoundedRect(rect.x + 3, rect.y + rect.h - bar - 3, rect.w - 6, bar, RADIUS.button)
    this.add(label)
    this.add(scene.add.text(rect.x + rect.w / 2, rect.y + rect.h - bar / 2 - 3, `LIFE · ${count}`, textStyle(font, COLORS.lifeText)).setOrigin(0.5))

  }

}
