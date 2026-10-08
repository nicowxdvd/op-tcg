import * as Phaser from 'phaser'
import type { Size } from './layout'
import { COLORS, DIALOG_FONT, RADIUS, textStyle } from './theme'

export interface PromptDetails {
  subtitle?: string
  hint?: string

}


export interface PromptOption {
  label: string
  run: () => void

}


export class PromptDialog extends Phaser.GameObjects.Container {

  constructor(scene: Phaser.Scene, screen: Size, title: string, options: PromptOption[], veiled = true, details: PromptDetails = {}) {
    super(scene, screen.w / 2, screen.h / 2)

    const unit       = Math.max(0.8, screen.h / 720) * (details.hint ? 0.625 : 1)
    const width      = (details.hint ? 600 : 420) * unit
    const row        = 40 * unit
    const gap        = 10 * unit
    const pad        = 22 * unit
    const side       = options.length <= 2
    const family     = { fontFamily: DIALOG_FONT }
    const titleText  = scene.add.text(0, 0, title, { ...textStyle(details.hint ? 21 * unit : 17 * unit, COLORS.white), ...family, align: 'center', wordWrap: { width: width - 2 * pad } }).setOrigin(0.5, 0)
    const subText    = details.subtitle ? scene.add.text(0, 0, details.subtitle, { ...textStyle(16 * unit, COLORS.gold), ...family, align: 'center' }).setOrigin(0.5, 0) : null
    const hintText   = details.hint ? scene.add.text(0, 0, details.hint, { ...textStyle(14 * unit, COLORS.textDim, false), ...family, align: 'center', wordWrap: { width: width - 2 * pad } }).setOrigin(0.5, 0) : null
    const lines      = [titleText, subText, hintText].filter((line): line is Phaser.GameObjects.Text => line !== null)
    const textH      = lines.reduce((sum, line) => sum + line.height, 0) + (lines.length - 1) * gap
    const buttonsH   = side ? row : options.length * row + (options.length - 1) * gap
    const height     = pad * 2 + textH + gap * 1.5 + buttonsH
    const top        = -height / 2
    const veil       = scene.add.rectangle(0, 0, screen.w, screen.h, COLORS.veil, veiled ? 0.55 : 0)

    if (veiled)
      veil.setInteractive()

    const panel      = scene.add.graphics()

    panel.fillStyle(COLORS.dialog, 0.97).fillRoundedRect(-width / 2, top, width, height, RADIUS.panel)
    panel.lineStyle(1.5, COLORS.zoneBorder, 0.6).strokeRoundedRect(-width / 2, top, width, height, RADIUS.panel)

    let lineY = top + pad

    lines.forEach(line => {
      line.setPosition(0, lineY)
      lineY += line.height + gap

    })

    this.add([veil, panel, ...lines])

    const buttonW = side ? (width - 2 * pad - gap * (options.length - 1)) / options.length : width - 2 * pad
    const startY  = top + pad + textH + gap * 1.5

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
      this.add([button, scene.add.text(x, y, option.label, { ...textStyle((details.hint ? 17 : 14) * unit, primary ? COLORS.dialog : COLORS.text), ...family, align: 'center', wordWrap: { width: buttonW - 12 } }).setOrigin(0.5), hit])

    })

  }

}
