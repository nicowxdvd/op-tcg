import * as Phaser from 'phaser'
import type { Rect } from './layout'
import type { MockPlayer } from './mockPlayers'
import { COLORS, RADIUS, textStyle } from './theme'


export class PlayerBadge extends Phaser.GameObjects.Container {

  constructor(scene: Phaser.Scene, pill: Rect, clock: Rect, player: MockPlayer, active: boolean, clockText: string) {
    super(scene, 0, 0)

    const font    = Math.max(9, Math.round(pill.h * 0.42))
    const small   = Math.max(9, Math.round(clock.h * 0.5))
    const mid     = pill.y + pill.h / 2
    const frame   = scene.add.graphics()
    const chip    = scene.add.graphics()
    const label   = active ? 'TURNO' : ''
    const reserve = active ? pill.w * 0.3 : 0

    frame.fillStyle(active ? COLORS.gold : COLORS.zoneFill, 1).fillRoundedRect(pill.x, pill.y, pill.w, pill.h, RADIUS.pill)
    frame.lineStyle(1.5, active ? COLORS.gold : COLORS.zoneBorder, 1).strokeRoundedRect(pill.x, pill.y, pill.w, pill.h, RADIUS.pill)
    frame.fillStyle(player.indicator, 1).fillCircle(pill.x + pill.h * 0.5, mid, pill.h * 0.2)
    chip.fillStyle(COLORS.zoneFill, 1).fillRoundedRect(clock.x, clock.y, clock.w, clock.h, RADIUS.pill)
    chip.lineStyle(1, COLORS.zoneBorder, 0.8).strokeRoundedRect(clock.x, clock.y, clock.w, clock.h, RADIUS.pill)
    this.add([frame, chip])

    const nameColor = active ? COLORS.dialog : COLORS.text
    const name      = scene.add.text(pill.x + pill.h * 0.9 + font * 1.6, mid, player.name, textStyle(font, nameColor)).setOrigin(0, 0.5)
    const room      = pill.w - pill.h * 0.9 - font * 1.6 - reserve - 6

    while (name.width > room && name.text.length > 3)
      name.setText(`${name.text.slice(0, -2)}…`)

    this.add(scene.add.text(pill.x + pill.h * 0.9, mid, player.flag, textStyle(font, COLORS.text)).setOrigin(0, 0.5))
    this.add(name)

    if (label) {
      const tag = scene.add.graphics()

      tag.fillStyle(COLORS.dialog, 0.85).fillRoundedRect(pill.x + pill.w - reserve - 4, pill.y + pill.h * 0.2, reserve, pill.h * 0.6, RADIUS.pill / 2)
      this.add(tag)
      this.add(scene.add.text(pill.x + pill.w - reserve / 2 - 4, mid, label, textStyle(font * 0.7, COLORS.white)).setOrigin(0.5))

    }

    this.add(scene.add.text(clock.x + clock.w / 2, clock.y + clock.h / 2, `⏱ ${clockText}`, textStyle(small, COLORS.text)).setOrigin(0.5))

  }

}
