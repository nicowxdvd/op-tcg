import * as Phaser from 'phaser'
import { CardSprite } from './CardSprite'
import type { CardView } from './CardSprite'
import { center } from './layout'
import type { Rect, Size } from './layout'


export class Zone extends Phaser.GameObjects.Container {

  readonly sprite: CardSprite | null = null

  constructor(scene: Phaser.Scene, rect: Rect, label: string, count: number | null, top: CardView | null, card: Size) {
    super(scene, 0, 0)

    const middle = center(rect)
    const font   = Math.max(9, Math.round(rect.h * 0.09))

    this.add(scene.add.rectangle(middle.x, middle.y, rect.w, rect.h).setStrokeStyle(1, 0xffffff, 0.35))

    if (top) {
      this.sprite = new CardSprite(scene, middle.x, middle.y, card, top)
      this.add(this.sprite)
    }

    this.add(scene.add.text(rect.x + 3, rect.y + 2, count === null ? label : `${label} ${count}`, { fontSize: `${font}px`, color: '#cfd8dc', backgroundColor: '#00000080' }))

  }

}
