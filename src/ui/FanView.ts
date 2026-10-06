import * as Phaser from 'phaser'
import { CardSprite } from './CardSprite'
import type { CardView } from './CardSprite'
import { drawIcon } from './icons'
import { fanSlots } from './layout'
import type { Rect, Size } from './layout'
import { COLORS, DURATION, RADIUS, textStyle } from './theme'

export type FanMode = 'rival' | 'self'


export class FanView extends Phaser.GameObjects.Container {

  readonly sprites: CardSprite[]

  constructor(scene: Phaser.Scene, rect: Rect, cards: CardView[], card: Size, mode: FanMode) {
    super(scene, 0, 0)

    const slots = fanSlots(rect, cards.length, card)

    this.sprites = slots.map((slot, i) => new CardSprite(scene, slot.x, slot.y, card, cards[i]).setAngle(slot.angle))
    this.add(this.sprites)

    if (mode === 'self')
      this.sprites.forEach((sprite, i) => this.lift(sprite, slots[i], card))

    this.drawHeader(rect, cards.length, card, mode)

  }


  private lift(sprite: CardSprite, slot: { x: number; y: number; angle: number }, card: Size): void {
    sprite.on('pointerover', () => {
      this.bringToTop(sprite)
      this.scene.tweens.add({ targets: sprite, y: slot.y - card.h * 0.3, scale: 1.3, angle: 0, duration: DURATION.quick })

    })
    sprite.on('pointerout', () => this.scene.tweens.add({ targets: sprite, y: slot.y, scale: 1, angle: slot.angle, duration: DURATION.quick }))

  }


  private drawHeader(rect: Rect, count: number, card: Size, mode: FanMode): void {
    const font = card.h * 0.2

    if (mode === 'rival') {
      this.add(this.scene.add.text(rect.x + rect.w / 2, rect.y + rect.h, String(count), textStyle(font, COLORS.white)).setOrigin(0.5, 1))

      return
    }

    const height = card.h * 0.3
    const width  = rect.w * 0.5
    const x      = rect.x + rect.w - width
    const y      = rect.y - height - 6
    const button = this.scene.add.graphics()

    button.fillStyle(COLORS.buttonDark, 1).fillRoundedRect(x, y, width, height, RADIUS.button)
    drawIcon(button, 'order', x + height * 0.6, y + height / 2, height * 0.6)
    this.add(button)
    this.add(this.scene.add.text(x + width * 0.55, y + height / 2, 'Original', textStyle(height * 0.45, COLORS.text)).setOrigin(0.5))
    this.add(this.scene.add.text(rect.x + 4, y + height / 2, String(count), textStyle(font, COLORS.white)).setOrigin(0, 0.5))

  }

}
