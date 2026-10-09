import * as Phaser from 'phaser'
import type { HandAction } from './handActions'
import { drawIcon } from './icons'
import type { IconKind } from './icons'
import type { Point, Rect, Size } from './layout'
import { COLORS, RADIUS, textStyle } from './theme'

export interface HandActionHandlers {
  run: (action: HandAction) => void
  close: () => void
  info: () => void

}


export class HandActionDialog extends Phaser.GameObjects.Container {

  readonly bounds: Rect

  constructor(scene: Phaser.Scene, screen: Size, anchor: Point, name: string, actions: HandAction[], handlers: HandActionHandlers) {
    super(scene, 0, 0)

    const unit      = Math.max(0.8, screen.h / 720) * 0.8
    const width     = 210 * unit
    const pad       = 12 * unit
    const gap       = 8 * unit
    const row       = 36 * unit
    const tail      = 10 * unit
    const margin    = 8 * unit
    const infoSize  = 20 * unit
    const prefix    = actions[0].kind === 'counter' ? '¿Counter con ' : '¿Jugar '
    const title     = scene.add.text(0, 0, '', textStyle(15 * unit, COLORS.white)).setOrigin(0, 0.5)
    const maxTitleW = width - 2 * pad - infoSize - gap

    let shown = name

    title.setText(`${prefix}${shown}?`)

    while (title.width > maxTitleW && shown.length > 1) {
      shown = shown.slice(0, -1)
      title.setText(`${prefix}${shown}…?`)

    }

    const titleH = Math.max(title.height, infoSize)
    const height = pad * 2 + titleH + gap + actions.length * row + (actions.length - 1) * gap
    const x      = Phaser.Math.Clamp(anchor.x - width / 2, margin, screen.w - margin - width)
    const y      = Math.max(margin, anchor.y - tail - height)
    const tailX  = Phaser.Math.Clamp(anchor.x, x + RADIUS.panel + tail, x + width - RADIUS.panel - tail)
    const panel  = scene.add.graphics()

    this.bounds = { x, y, w: width, h: height + tail }

    panel.fillStyle(COLORS.black, 1).fillRoundedRect(x, y, width, height, RADIUS.panel)
    panel.fillTriangle(tailX - tail, y + height - 1, tailX + tail, y + height - 1, tailX, y + height + tail)
    panel.lineStyle(1.5, COLORS.white, 1).strokeRoundedRect(x, y, width, height, RADIUS.panel)
    panel.lineBetween(tailX - tail, y + height, tailX, y + height + tail)
    panel.lineBetween(tailX + tail, y + height, tailX, y + height + tail)
    panel.lineStyle(2, COLORS.black, 1).lineBetween(tailX - tail + 1, y + height, tailX + tail - 1, y + height)
    title.setPosition(x + pad, y + pad + titleH / 2)
    this.add([panel, title])

    this.addIconButton(x + width - pad - infoSize / 2, y + pad + titleH / 2, infoSize, infoSize, 'info', null, handlers.info, false)

    const squareX = x + width - pad - row / 2
    const wideW   = width - 2 * pad - row - gap
    const rowsY   = y + pad + titleH + gap

    actions.forEach((action, i) => {
      const centerY = rowsY + i * (row + gap) + row / 2
      const label   = actions.length === 1 ? null : action.label

      this.addIconButton(x + pad + wideW / 2, centerY, wideW, row, 'check', label, () => handlers.run(action))

    })

    this.addIconButton(squareX, rowsY + row / 2, row, row, 'close', null, handlers.close)

  }


  contains(x: number, y: number): boolean {
    const { bounds } = this

    return x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= bounds.y + bounds.h

  }


  private addIconButton(cx: number, cy: number, w: number, h: number, icon: IconKind, label: string | null, onClick: () => void, framed = true): void {
    const face = this.scene.add.graphics()
    const hit  = this.scene.add.rectangle(cx, cy, w, h, COLORS.white, 0).setInteractive({ useHandCursor: true })
    const draw = (fill: number) => {
      face.clear()

      if (framed)
        face.fillStyle(fill, 1).fillRoundedRect(cx - w / 2, cy - h / 2, w, h, RADIUS.button).lineStyle(1.5, COLORS.white, 1).strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, RADIUS.button)

      if (label === null)
        drawIcon(face, icon, cx, cy, Math.min(w, h) * 0.55, COLORS.white)

    }

    draw(COLORS.black)
    hit.on('pointerover', () => draw(COLORS.buttonDark))
    hit.on('pointerout', () => draw(COLORS.black))
    hit.on('pointerup', onClick)
    this.add([face, hit])

    if (label !== null)
      this.add(this.scene.add.text(cx, cy, label, { ...textStyle(h * 0.38, COLORS.white), align: 'center', wordWrap: { width: w - 12 } }).setOrigin(0.5))

  }

}
