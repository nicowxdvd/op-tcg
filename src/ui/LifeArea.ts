import * as Phaser from 'phaser'
import { CardSprite } from './CardSprite'
import type { Rect, Size } from './layout'
import { COLORS, RADIUS, textStyle } from './theme'


export class LifeArea extends Phaser.GameObjects.Container {

  constructor(scene: Phaser.Scene, rect: Rect, count: number, card: Size) {
    super(scene, 0, 0)

    const font   = Math.max(9, Math.round(rect.h * 0.11))
    const bar    = rect.h * 0.2
    const ratio  = card.h / card.w
    const room   = rect.h - bar - 8
    const fan    = 0.25
    const high   = Math.min(room / (1 + fan * Math.max(count - 1, 0)), rect.w * 0.86 / ratio)
    const wide   = high * ratio
    const step   = high * fan
    const frame  = scene.add.graphics()

    frame.fillStyle(COLORS.crimsonDark, 0.35).fillRoundedRect(rect.x, rect.y, rect.w, rect.h, RADIUS.zone)
    frame.lineStyle(1.5, COLORS.lifeText, 0.7).strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, RADIUS.zone)
    this.add(frame)
    this.add(scene.add.text(rect.x + rect.w / 2, rect.y + bar / 2 + 2, `LIFE · ${count}`, textStyle(font, COLORS.lifeText)).setOrigin(0.5))

    for (let i = count - 1; i >= 0; i--) {
      const sprite = new CardSprite(scene, rect.x + rect.w / 2, rect.y + bar + 4 + high / 2 + i * step, { w: high, h: wide }, { def: null })

      sprite.setAngle(90)
      this.add(sprite)

    }

  }

}
