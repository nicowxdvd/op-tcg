import * as Phaser from 'phaser'
import type { CardDef } from '../engine'
import { CardSprite } from './CardSprite'
import { CARD_RATIO } from './layout'
import type { Rect } from './layout'


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

    this.removeAll(true)
    this.add(this.scene.add.rectangle(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w, rect.h, 0x000000, 0.75))
    this.add(new CardSprite(this.scene, rect.x + picture.w / 2, rect.y + picture.h / 2, picture, { def, fullResolution: true }))
    this.add(this.scene.add.text(textX, rect.y + 6, def.name, { fontSize: '16px', color: '#ffffff', fontStyle: 'bold', wordWrap: { width: rect.w - picture.w - 16 } }))
    this.add(this.scene.add.text(textX, rect.y + 52, stats, { fontSize: '12px', color: '#ffe082', wordWrap: { width: rect.w - picture.w - 16 } }))
    this.add(this.scene.add.text(textX, rect.y + 90, this.textOf(def.id), { fontSize: '12px', color: '#e8e8e8', wordWrap: { width: rect.w - picture.w - 16 } }))
    this.setVisible(true)

  }


  hide(): void {
    this.pinned = false
    this.setVisible(false)

  }

}
