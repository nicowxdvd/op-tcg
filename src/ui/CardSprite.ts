import * as Phaser from 'phaser'
import type { CardDef } from '../engine'
import type { Size } from './layout'
import { CARD_FACES, COLORS, cssAlpha, DURATION, RADIUS, SHADOW, textStyle } from './theme'
import { BACK_KEY, bestTextureKey, DON_KEY, hasCardImage, hasDonImage } from './textures'

export interface CardView {
  def: CardDef | null
  instanceId?: string
  rested?: boolean
  power?: number
  don?: number
  count?: number
  donFace?: boolean
  fullResolution?: boolean

}


export class CardSprite extends Phaser.GameObjects.Container {

  readonly def: CardDef | null
  readonly instanceId: string | undefined
  readonly cardSize: Size
  hitWidth: number | undefined
  private marker: Phaser.GameObjects.Graphics
  private focus: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene, x: number, y: number, size: Size, view: CardView) {
    super(scene, x, y)

    this.def        = view.def
    this.instanceId = view.instanceId
    this.cardSize   = size
    this.setSize(size.w, size.h)

    const shadow = scene.add.graphics()

    shadow.fillStyle(COLORS.shadow, SHADOW.alpha).fillRoundedRect(-size.w / 2 + SHADOW.offset, -size.h / 2 + SHADOW.offset, size.w, size.h, RADIUS.card)
    this.add(shadow)

    if (view.def && hasCardImage(scene, view.def.id))
      this.add(scene.add.image(0, 0, bestTextureKey(scene, view.def.id, view.fullResolution ? Infinity : size.h)).setDisplaySize(size.w, size.h))
    else if (view.donFace && hasDonImage(scene))
      this.add(scene.add.image(0, 0, DON_KEY).setDisplaySize(size.w, size.h))
    else if (!view.def && scene.textures.exists(BACK_KEY))
      this.add(scene.add.image(0, 0, BACK_KEY).setDisplaySize(size.w, size.h))
    else
      this.drawFallback(view.def)

    const border = scene.add.graphics()

    border.lineStyle(2, COLORS.cardBorder, 1).strokeRoundedRect(-size.w / 2, -size.h / 2, size.w, size.h, RADIUS.card)
    this.add(border)

    if (view.def)
      this.drawBadges(view)

    if (view.count !== undefined)
      this.drawCount(view.count)

    this.marker = scene.add.graphics().setVisible(false)
    this.add(this.marker)

    this.focus = scene.add.graphics().setVisible(false)
    this.add(this.focus)

    if (view.rested)
      this.setAngle(90)

  }


  setHighlight(color: number | null): this {
    this.marker.clear().setVisible(color !== null)

    if (color !== null) {
      const { w, h } = this.cardSize

      this.marker.lineStyle(4, color, 1).strokeRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, RADIUS.card + 2)

    }

    return this

  }


  setFocus(on: boolean): this {
    this.focus.clear().setVisible(on)

    if (on) {
      const { w, h } = this.cardSize

      this.focus.lineStyle(10, COLORS.neon, 0.18).strokeRoundedRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, RADIUS.card + 4)
      this.focus.lineStyle(4, COLORS.neon, 1).strokeRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, RADIUS.card + 2)

    }

    return this

  }


  flash(color: number): void {
    const { w, h } = this.cardSize
    const overlay  = this.scene.add.graphics()

    overlay.fillStyle(color, 0.6).fillRoundedRect(-w / 2, -h / 2, w, h, RADIUS.card)
    this.add(overlay)
    this.scene.tweens.add({ targets: overlay, alpha: 0, duration: DURATION.move, onComplete: () => overlay.destroy() })

  }


  enableInput(): this {
    const { w, h } = this.cardSize
    const width    = Math.min(this.hitWidth ?? w, w)

    this.setInteractive({ hitArea: new Phaser.Geom.Rectangle((w - width) / 2, 0, width, h), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true })

    return this

  }


  private drawFallback(def: CardDef | null): void {
    const { w, h } = this.cardSize
    const font     = Math.max(8, Math.round(h * 0.085))
    const fill     = def ? CARD_FACES[def.colors[0]] ?? COLORS.buttonDark : COLORS.cardBack
    const face     = this.scene.add.graphics()

    face.fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, RADIUS.card)
    this.add(face)

    if (!def)
      return

    this.add(this.scene.add.text(0, -h * 0.18, def.name, { ...textStyle(font), align: 'center', wordWrap: { width: w - 12 } }).setOrigin(0.5))
    this.add(this.scene.add.text(0, h * 0.12, def.type, textStyle(font, COLORS.text, false)).setOrigin(0.5))

    if (def.type !== 'Leader')
      this.add(this.scene.add.text(-w / 2 + 5, -h / 2 + 3, String(def.cost), textStyle(font + 2, COLORS.gold)))

  }


  private drawBadges(view: CardView): void {
    const { w, h } = this.cardSize
    const font     = Math.max(8, Math.round(h * 0.085))
    const power    = view.power ?? view.def!.power

    if (power > 0)
      this.add(this.scene.add.text(0, h / 2 - 3, String(power), { ...textStyle(font + 1), backgroundColor: cssAlpha(COLORS.shadow, 0.63), padding: { x: 3, y: 1 } }).setOrigin(0.5, 1))

    if (view.don)
      this.add(this.scene.add.text(w / 2 - 3, -h / 2 + 3, `+${view.don}`, { ...textStyle(font, COLORS.cardBorder), backgroundColor: cssAlpha(COLORS.gold, 1), padding: { x: 3, y: 1 } }).setOrigin(1, 0))

  }


  private drawCount(count: number): void {
    const { w, h } = this.cardSize
    const font     = Math.max(9, Math.round(h * 0.11))

    this.add(this.scene.add.text(w / 2 - 4, h / 2 - 3, String(count), { ...textStyle(font), backgroundColor: cssAlpha(COLORS.shadow, 0.8), padding: { x: 5, y: 1 } }).setOrigin(1, 1))

  }

}
