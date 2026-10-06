import * as Phaser from 'phaser'
import type { CardDef } from '../engine'
import { CardSprite } from './CardSprite'
import { KeywordTooltip } from './KeywordTooltip'
import { CARD_RATIO } from './layout'
import type { Rect } from './layout'
import { COLORS, RADIUS, textStyle } from './theme'


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
    const picture  = { w: rect.h * CARD_RATIO, h: rect.h }
    const textX    = rect.x + picture.w + 10
    const stats    = [def.type, ...(def.type === 'Leader' ? [`Life ${def.life}`] : [`Cost ${def.cost}`]), ...(def.power ? [`Power ${def.power}`] : []), ...(def.counter ? [`Counter +${def.counter}`] : [])].join('  |  ')

    const wrap = { wordWrap: { width: rect.w - picture.w - 16 } }
    const unit = rect.h / 200
    const back = this.scene.add.graphics()

    back.fillStyle(COLORS.shadow, 0.75).fillRoundedRect(rect.x, rect.y, rect.w, rect.h, RADIUS.panel)

    this.removeAll(true)
    this.add(back)
    this.add(new CardSprite(this.scene, rect.x + picture.w / 2, rect.y + picture.h / 2, picture, { def, fullResolution: true }))
    this.add(this.scene.add.text(textX, rect.y + 6, def.name, { ...textStyle(Math.max(11, 16 * unit), COLORS.white), ...wrap }))
    this.add(this.scene.add.text(textX, rect.y + 52 * unit, stats, { ...textStyle(Math.max(9, 12 * unit), COLORS.statGold), ...wrap }))

    const tooltip = new KeywordTooltip(this.scene, { x: rect.x, y: rect.y + rect.h + 6, w: rect.w, h: rect.h })

    tooltip.layoutText(this.textOf(def.id), textX, rect.y + 90 * unit, rect.w - picture.w - 16, Math.max(9, 12 * unit))
    this.add(tooltip)
    this.setVisible(true)

  }


  hide(): void {
    this.pinned = false
    this.setVisible(false)

  }

}
