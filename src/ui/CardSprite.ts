import * as Phaser from 'phaser'
import type { CardDef } from '../engine'
import type { Size } from './layout'
import { bestTextureKey, hasCardImage } from './textures'

export interface CardView {
  def: CardDef | null
  instanceId?: string
  rested?: boolean
  power?: number
  don?: number
  fullResolution?: boolean

}

const COLORS: Record<string, number> = { Red: 0xc0392b, Green: 0x27ae60, Blue: 0x2980b9, Purple: 0x8e44ad, Black: 0x2c3e50, Yellow: 0xd4ac0d }
const BACK_COLOR                    = 0x1f3a5f


export class CardSprite extends Phaser.GameObjects.Container {

  readonly def: CardDef | null
  readonly instanceId: string | undefined
  readonly cardSize: Size
  private marker: Phaser.GameObjects.Rectangle

  constructor(scene: Phaser.Scene, x: number, y: number, size: Size, view: CardView) {
    super(scene, x, y)

    this.def        = view.def
    this.instanceId = view.instanceId
    this.cardSize   = size
    this.setSize(size.w, size.h)

    if (view.def && hasCardImage(scene, view.def.id))
      this.add(scene.add.image(0, 0, bestTextureKey(scene, view.def.id, view.fullResolution ? Infinity : size.h)).setDisplaySize(size.w, size.h))
    else
      this.drawFallback(view.def)

    if (view.def)
      this.drawBadges(view)

    this.marker = scene.add.rectangle(0, 0, size.w + 6, size.h + 6).setStrokeStyle(4, 0xffd54a).setVisible(false)
    this.add(this.marker)

    if (view.rested)
      this.setAngle(90)

  }


  setHighlight(color: number | null): this {
    this.marker.setVisible(color !== null)

    if (color !== null)
      this.marker.setStrokeStyle(4, color)

    return this

  }


  enableInput(): this {
    this.setInteractive({ useHandCursor: true })

    return this

  }


  private drawFallback(def: CardDef | null): void {
    const { w, h } = this.cardSize
    const font     = Math.max(8, Math.round(h * 0.085))
    const fill     = def ? COLORS[def.colors[0]] ?? 0x555555 : BACK_COLOR

    this.add(this.scene.add.rectangle(0, 0, w, h, fill).setStrokeStyle(2, 0xffffff))

    if (!def) {
      this.add(this.scene.add.text(0, 0, 'OP', { fontSize: `${font * 2}px`, color: '#9fb6d6' }).setOrigin(0.5))

      return

    }

    this.add(this.scene.add.rectangle(0, 0, w - 8, h - 8).setStrokeStyle(1, 0xffffff, 0.4))
    this.add(this.scene.add.text(0, -h * 0.18, def.name, { fontSize: `${font}px`, color: '#ffffff', align: 'center', wordWrap: { width: w - 12 } }).setOrigin(0.5))
    this.add(this.scene.add.text(0, h * 0.12, def.type, { fontSize: `${font}px`, color: '#e8e8e8' }).setOrigin(0.5))

    if (def.type !== 'Leader')
      this.add(this.scene.add.text(-w / 2 + 5, -h / 2 + 3, String(def.cost), { fontSize: `${font + 2}px`, color: '#ffe082', fontStyle: 'bold' }))

  }


  private drawBadges(view: CardView): void {
    const { w, h } = this.cardSize
    const font     = Math.max(8, Math.round(h * 0.085))
    const power    = view.power ?? view.def!.power

    if (power > 0)
      this.add(this.scene.add.text(0, h / 2 - 3, String(power), { fontSize: `${font + 1}px`, color: '#ffffff', backgroundColor: '#000000a0', padding: { x: 3, y: 1 } }).setOrigin(0.5, 1))

    if (view.don)
      this.add(this.scene.add.text(w / 2 - 3, -h / 2 + 3, `+${view.don}`, { fontSize: `${font}px`, color: '#000000', backgroundColor: '#ffd54a', padding: { x: 3, y: 1 } }).setOrigin(1, 0))

  }

}
