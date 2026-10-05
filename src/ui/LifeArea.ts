import * as Phaser from 'phaser'
import { CardSprite } from './CardSprite'
import type { Rect, Size } from './layout'


export class LifeArea extends Phaser.GameObjects.Container {

  constructor(scene: Phaser.Scene, rect: Rect, count: number, card: Size) {
    super(scene, 0, 0)

    const font  = Math.max(9, Math.round(rect.h * 0.09))
    const small = { w: card.w * 0.8, h: card.h * 0.8 }
    const step  = count > 1 ? Math.min(6, (rect.h - small.h) / (count - 1)) : 0

    this.add(scene.add.rectangle(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w, rect.h).setStrokeStyle(1, 0xffffff, 0.35))

    for (let i = 0; i < count; i++)
      this.add(new CardSprite(scene, rect.x + rect.w / 2, rect.y + small.h / 2 + 2 + i * step, small, { def: null }))

    this.add(scene.add.text(rect.x + 3, rect.y + 2, `Life ${count}`, { fontSize: `${font}px`, color: '#cfd8dc', backgroundColor: '#00000080' }))

  }

}
