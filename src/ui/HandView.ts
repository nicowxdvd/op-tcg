import * as Phaser from 'phaser'
import { CardSprite } from './CardSprite'
import type { CardView } from './CardSprite'
import { center, handSlots } from './layout'
import type { Rect, Size } from './layout'


export class HandView extends Phaser.GameObjects.Container {

  readonly sprites: CardSprite[]

  constructor(scene: Phaser.Scene, rect: Rect, cards: CardView[], card: Size) {
    super(scene, 0, 0)

    this.sprites = handSlots(rect, cards.length, card).map((slot, i) => {
      const middle = center(slot)

      return new CardSprite(scene, middle.x, middle.y, card, cards[i])

    })

    this.add(this.sprites)

  }

}
