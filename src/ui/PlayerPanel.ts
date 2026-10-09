import * as Phaser from 'phaser'
import type { Rect } from './layout'
import { COLORS, DURATION, RADIUS, SHADOW, panelTint } from './theme'


export class PlayerPanel extends Phaser.GameObjects.Container {

  constructor(scene: Phaser.Scene, rect: Rect, color: number, active: boolean, animate: boolean) {
    super(scene, 0, 0)

    const base = scene.add.graphics()
    const gold = scene.add.graphics()
    const tint = panelTint(color)

    base.fillStyle(tint.fill, 1).fillRoundedRect(rect.x, rect.y, rect.w, rect.h, RADIUS.panel)
    base.lineStyle(2, tint.frame, 0.8).strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, RADIUS.panel)
    gold.lineStyle(8, COLORS.gold, SHADOW.glow * 0.5).strokeRoundedRect(rect.x - 2, rect.y - 2, rect.w + 4, rect.h + 4, RADIUS.panel + 2)
    gold.lineStyle(2, COLORS.gold, 1).strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, RADIUS.panel)
    gold.setVisible(active)
    this.add([base, gold])

    if (active && animate) {
      gold.setAlpha(0)
      scene.tweens.add({ targets: gold, alpha: 1, duration: DURATION.turn })

    }

  }

}
