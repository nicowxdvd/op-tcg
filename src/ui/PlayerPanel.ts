import * as Phaser from 'phaser'
import type { Rect } from './layout'
import { COLORS, DURATION, RADIUS, SHADOW, panelTint } from './theme'

const HALO_RINGS = 6
const HALO_STEP  = 2


export class PlayerPanel extends Phaser.GameObjects.Container {

  constructor(scene: Phaser.Scene, rect: Rect, color: number, active: boolean, animate: boolean) {
    super(scene, 0, 0)

    const base = scene.add.graphics()
    const gold = scene.add.graphics()
    const tint = panelTint(color)

    base.fillStyle(tint.fill, 1).fillRoundedRect(rect.x, rect.y, rect.w, rect.h, RADIUS.panel)
    base.lineStyle(2, tint.frame, 0.8).strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, RADIUS.panel)

    for (let i = 0; i < HALO_RINGS; i++) {
      const reach = 1 + i * HALO_STEP

      gold.lineStyle(HALO_STEP, COLORS.gold, SHADOW.glow * (1 - i / HALO_RINGS) ** 2).strokeRoundedRect(rect.x - reach, rect.y - reach, rect.w + 2 * reach, rect.h + 2 * reach, RADIUS.panel + reach)

    }

    gold.lineStyle(2, COLORS.gold, 1).strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, RADIUS.panel)
    gold.setVisible(active)
    this.add([base, gold])

    if (active && animate) {
      gold.setAlpha(0)
      scene.tweens.add({ targets: gold, alpha: 1, duration: DURATION.turn })

    }

  }

}
