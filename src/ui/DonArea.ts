import * as Phaser from 'phaser'
import { donRadius, donSlots } from './layout'
import type { Rect } from './layout'

export interface DonCounts {
  deck: number
  active: number
  rested: number

}


export class DonArea extends Phaser.GameObjects.Container {

  token: Phaser.GameObjects.Arc | null = null

  constructor(scene: Phaser.Scene, rect: Rect, counts: DonCounts) {
    super(scene, 0, 0)

    const font   = Math.max(9, Math.round(rect.h * 0.09))
    const radius = donRadius(rect)
    const slots  = donSlots(rect, counts.active + counts.rested)

    this.add(scene.add.rectangle(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w, rect.h).setStrokeStyle(1, 0xffffff, 0.35))
    this.add(scene.add.text(rect.x + 3, rect.y + 2, `DON!! deck ${counts.deck}  active ${counts.active}  rested ${counts.rested}`, { fontSize: `${font}px`, color: '#cfd8dc', backgroundColor: '#00000080' }))

    slots.forEach((slot, i) => {
      const active = i < counts.active
      const arc    = scene.add.circle(slot.x, slot.y, radius, 0xf4c542, active ? 1 : 0.35).setStrokeStyle(2, 0xffffff, active ? 1 : 0.4)

      this.add(arc)
      this.add(scene.add.text(slot.x, slot.y, 'D', { fontSize: `${Math.round(radius)}px`, color: '#4a3200' }).setOrigin(0.5))

      if (i === 0 && active)
        this.token = arc

    })

  }

}
