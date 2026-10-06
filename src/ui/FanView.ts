import * as Phaser from 'phaser'
import { CardSprite } from './CardSprite'
import type { CardView } from './CardSprite'
import { fanSlots } from './layout'
import type { Rect, Size } from './layout'
import { COLORS, textStyle } from './theme'


export class FanView extends Phaser.GameObjects.Container {

  readonly sprites: CardSprite[]

  constructor(scene: Phaser.Scene, rect: Rect, cards: CardView[], card: Size, counter: boolean) {
    super(scene, 0, 0)

    this.sprites = fanSlots(rect, cards.length, card).map((slot, i) => new CardSprite(scene, slot.x, slot.y, card, cards[i]).setAngle(slot.angle))
    this.add(this.sprites)

    if (counter)
      this.add(scene.add.text(rect.x + rect.w / 2, rect.y + rect.h, String(cards.length), textStyle(card.h * 0.2, COLORS.white)).setOrigin(0.5, 1))

  }

}
