import * as Phaser from 'phaser'
import { CardSprite } from './CardSprite'
import { dashedRoundRect } from './draw'
import { donCardSize, donSlots } from './layout'
import type { Rect } from './layout'
import { COLORS, RADIUS, textStyle } from './theme'

export interface DonCounts {
  active: number
  rested: number
  attached: number

}


export class DonArea extends Phaser.GameObjects.Container {

  sprites: CardSprite[] = []

  constructor(scene: Phaser.Scene, rect: Rect, counts: DonCounts, selected = 0) {
    super(scene, 0, 0)

    const font  = Math.max(8, Math.round(rect.h * 0.075))
    const total = counts.active + counts.rested
    const card  = donCardSize(rect)
    const slots = donSlots(rect, total)
    const frame = scene.add.graphics()

    frame.fillStyle(COLORS.zoneFill, 0.55).fillRoundedRect(rect.x, rect.y, rect.w, rect.h, RADIUS.zone)
    frame.lineStyle(1.5, COLORS.zoneBorder, 0.6)
    dashedRoundRect(frame, rect, RADIUS.zone, 5, 4)
    this.add(frame)
    this.add(scene.add.text(rect.x + 5, rect.y + 3, 'COST AREA', textStyle(font * 0.85, COLORS.zoneLabel)).setAlpha(0.8))
    this.add(scene.add.text(rect.x + 6, rect.y + rect.h - 4, `ACTIVOS: ${counts.active} · INACTIVOS: ${counts.rested} · ADJUNTOS: ${counts.attached}${selected ? ` · SELECCIONADOS: ${selected}` : ''}`, textStyle(font, COLORS.textDim)).setOrigin(0, 1))

    if (total === 0)
      this.add(scene.add.text(rect.x + rect.w / 2, rect.y + rect.h * 0.4, 'SIN DON!!', textStyle(font * 1.2, COLORS.zoneLabel)).setOrigin(0.5).setAlpha(0.7))

    slots.forEach((slot, i) => {
      const sprite = new CardSprite(scene, slot.x, slot.y, card, { def: null, donFace: true, rested: i >= counts.active })

      this.add(sprite)

      if (i < counts.active)
        this.sprites.push(sprite)

    })

  }

}
