import * as Phaser from 'phaser'
import { CardSprite } from './CardSprite'
import type { CardView } from './CardSprite'
import { HAND_SORT_LABELS } from './handSort'
import type { HandSort } from './handSort'
import { drawIcon } from './icons'
import { fanSlots } from './layout'
import type { FanSlot, Point, Rect, Size } from './layout'
import { COLORS, DURATION, RADIUS, textStyle } from './theme'

const LIFT = 1.3

export type FanMode = 'rival' | 'self'


export class FanView extends Phaser.GameObjects.Container {

  readonly sprites: CardSprite[]

  private selected: CardSprite | null = null
  private slots: FanSlot[]
  private card: Size

  constructor(scene: Phaser.Scene, rect: Rect, cards: CardView[], card: Size, mode: FanMode, sort: HandSort = 'original', onSort: () => void = () => {}) {
    super(scene, 0, 0)

    const slots = fanSlots(rect, cards.length, card)

    this.slots  = slots
    this.card   = card
    this.sprites = slots.map((slot, i) => new CardSprite(scene, slot.x, slot.y, card, cards[i]).setAngle(slot.angle))
    this.add(this.sprites)

    if (mode === 'self') {
      const pitch = slots.length > 1 ? slots[1].x - slots[0].x : card.w

      this.sprites.forEach(sprite => sprite.hitWidth = pitch)
      this.sprites.forEach(sprite => this.lift(sprite))
    }

    this.drawHeader(rect, cards.length, card, mode, sort, onSort)

  }


  private lift(sprite: CardSprite): void {
    sprite.on('pointerover', () => this.raise(sprite))
    sprite.on('pointerout', () => {
      if (sprite !== this.selected)
        this.settle(sprite)

    })

  }


  select(sprite: CardSprite | null): void {
    const previous = this.selected

    this.selected = sprite

    if (previous && previous !== sprite)
      this.settle(previous)

    if (sprite)
      this.raise(sprite)

  }


  anchorOf(sprite: CardSprite): Point {
    const slot = this.slots[this.sprites.indexOf(sprite)]

    return { x: slot.x, y: slot.y - this.card.h * 0.15 - this.card.h * LIFT / 2 }

  }


  private raise(sprite: CardSprite): void {
    const slot = this.slots[this.sprites.indexOf(sprite)]

    sprite.setFocus(true)
    this.bringToTop(sprite)
    this.fitHit(sprite, this.card.w, 1 / LIFT)
    this.scene.tweens.killTweensOf(sprite)
    this.scene.tweens.add({ targets: sprite, y: slot.y - this.card.h * 0.15, scale: LIFT, angle: 0, duration: DURATION.hover })

  }


  private settle(sprite: CardSprite): void {
    const index = this.sprites.indexOf(sprite)
    const slot  = this.slots[index]

    sprite.setFocus(false)
    this.moveTo(sprite, index)
    this.fitHit(sprite, this.card.w, 1)
    this.scene.tweens.killTweensOf(sprite)
    this.scene.tweens.add({ targets: sprite, y: slot.y, scale: 1, angle: slot.angle, duration: DURATION.hover })

  }


  private fitHit(sprite: CardSprite, cardWidth: number, factor: number): void {
    const area = sprite.input?.hitArea as Phaser.Geom.Rectangle | undefined

    if (!area || !sprite.hitWidth)
      return

    area.width = sprite.hitWidth * factor
    area.x     = (cardWidth - area.width) / 2

  }


  private drawHeader(rect: Rect, count: number, card: Size, mode: FanMode, sort: HandSort, onSort: () => void): void {
    const font = card.h * 0.2

    if (mode === 'rival') {
      this.add(this.scene.add.text(rect.x + rect.w / 2, rect.y + rect.h, String(count), textStyle(font, COLORS.white)).setOrigin(0.5, 1))

      return
    }

    const height = card.h * 0.3
    const width  = rect.w * 0.5
    const x      = rect.x + rect.w - width
    const y      = rect.y - height - card.h * 0.15
    const button = this.scene.add.graphics()

    button.fillStyle(COLORS.buttonDark, 1).fillRoundedRect(x, y, width, height, RADIUS.button)
    drawIcon(button, 'order', x + height * 0.6, y + height / 2, height * 0.6)
    this.add(button)
    this.add(this.scene.add.text(x + width * 0.55, y + height / 2, HAND_SORT_LABELS[sort], textStyle(height * 0.45, COLORS.text)).setOrigin(0.5))
    this.add(this.scene.add.rectangle(x + width / 2, y + height / 2, width, height, COLORS.white, 0).setInteractive({ useHandCursor: true }).on('pointerup', onSort))
    this.add(this.scene.add.text(rect.x + 4, y + height / 2, String(count), textStyle(font, COLORS.white)).setOrigin(0, 0.5))

  }

}
