import * as Phaser from 'phaser'
import type { Size } from './layout'
import { COLORS, RADIUS, textStyle } from './theme'

export interface PromptOption {
  label: string
  run: () => void

}


export class PromptDialog extends Phaser.GameObjects.Container {

  constructor(scene: Phaser.Scene, screen: Size, title: string, options: PromptOption[], veiled = true) {
    super(scene, screen.w / 2, screen.h / 2)

    const unit       = Math.max(0.8, screen.h / 720)
    const width      = 420 * unit
    const row        = 40 * unit
    const gap        = 10 * unit
    const pad        = 22 * unit
    const side       = options.length <= 2
    const titleText  = scene.add.text(0, 0, title, { ...textStyle(17 * unit, COLORS.white), align: 'center', wordWrap: { width: width - 2 * pad } }).setOrigin(0.5, 0)
    const buttonsH   = side ? row : options.length * row + (options.length - 1) * gap
    const height     = pad * 2 + titleText.height + gap * 1.5 + buttonsH
    const top        = -height / 2
    const veil       = scene.add.rectangle(0, 0, screen.w, screen.h, COLORS.veil, veiled ? 0.55 : 0)

    if (veiled)
      veil.setInteractive()

    const panel      = scene.add.graphics()

    panel.fillStyle(COLORS.dialog, 0.97).fillRoundedRect(-width / 2, top, width, height, RADIUS.panel)
    panel.lineStyle(1.5, COLORS.zoneBorder, 0.6).strokeRoundedRect(-width / 2, top, width, height, RADIUS.panel)
    titleText.setPosition(0, top + pad)
    this.add([veil, panel, titleText])

    const buttonW = side ? (width - 2 * pad - gap * (options.length - 1)) / options.length : width - 2 * pad
    const startY  = top + pad + titleText.height + gap * 1.5

    options.forEach((option, i) => {
      const primary = i === 0
      const fill    = primary ? COLORS.gold : COLORS.buttonDark
      const x       = side ? -width / 2 + pad + i * (buttonW + gap) + buttonW / 2 : 0
      const y       = side ? startY + row / 2 : startY + i * (row + gap) + row / 2
      const button  = scene.add.graphics()
      const hit     = scene.add.rectangle(x, y, buttonW, row, COLORS.white, 0).setInteractive({ useHandCursor: true })
      const draw    = (alpha: number) => button.clear().fillStyle(fill, alpha).fillRoundedRect(x - buttonW / 2, y - row / 2, buttonW, row, RADIUS.button)

      draw(1)
      hit.on('pointerover', () => draw(0.85))
      hit.on('pointerout', () => draw(1))
      hit.on('pointerup', () => option.run())
      this.add([button, scene.add.text(x, y, option.label, { ...textStyle(14 * unit, primary ? COLORS.dialog : COLORS.text), align: 'center', wordWrap: { width: buttonW - 12 } }).setOrigin(0.5), hit])

    })

  }

}
