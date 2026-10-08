import * as Phaser from 'phaser'
import type { CardDef } from '../engine'
import { CardSprite } from './CardSprite'
import { KeywordTooltip } from './KeywordTooltip'
import type { Rect } from './layout'
import { COLORS, RADIUS } from './theme'


export class CardZoom extends Phaser.GameObjects.Container {

  pinned = false

  private rect: Rect
  private textOf: (defId: string) => string

  constructor(scene: Phaser.Scene, rect: Rect, textOf: (defId: string) => string) {
    super(scene, 0, 0)

    this.rect   = rect
    this.textOf = textOf
    this.setVisible(false)

  }


  show(def: CardDef): void {
    const { rect } = this
    const unit     = rect.h / 450
    const pad      = 8 * unit
    const font     = Math.max(10, 13 * unit)
    const back     = this.scene.add.graphics()
    const frame    = this.scene.add.graphics()
    const textY    = rect.y + rect.h + 6

    this.removeAll(true)
    this.add(back)
    this.add(new CardSprite(this.scene, rect.x + rect.w / 2, rect.y + rect.h / 2, rect, { def, fullResolution: true }))
    this.add(frame)

    frame.lineStyle(3, COLORS.gold, 1).strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, RADIUS.panel)

    const tooltip = new KeywordTooltip(this.scene, rect)
    const text    = this.textOf(def.id)

    tooltip.layoutText(text, rect.x + pad, textY + pad, rect.w - 2 * pad, font)

    if (text) {
      const textH = tooltip.getBounds().height

      back.fillStyle(COLORS.dialog, 0.92).fillRoundedRect(rect.x, textY, rect.w, textH + 2 * pad, RADIUS.panel)
      back.lineStyle(1.5, COLORS.gold, 0.8).strokeRoundedRect(rect.x, textY, rect.w, textH + 2 * pad, RADIUS.panel)

    }

    this.add(tooltip)
    this.setVisible(true)

  }


  hide(): void {
    this.pinned = false
    this.setVisible(false)

  }

}
