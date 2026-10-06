import * as Phaser from 'phaser'
import { COLORS, RADIUS, textStyle } from './theme'

export interface ButtonOptions {
  primary?: boolean
  fontSize?: number

}


export class Button extends Phaser.GameObjects.Container {

  private readonly face: Phaser.GameObjects.Graphics
  private readonly hit: Phaser.GameObjects.Rectangle
  private readonly fill: number
  private readonly size: { w: number; h: number }
  private enabled = true

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onClick: () => void, options: ButtonOptions = {}) {
    super(scene, x, y)

    const primary = options.primary ?? false
    const text    = scene.add.text(0, 0, label, { ...textStyle(options.fontSize ?? 16, primary ? COLORS.dialog : COLORS.text), align: 'center', wordWrap: { width: w - 16 } }).setOrigin(0.5)

    this.size = { w, h }
    this.fill = primary ? COLORS.gold : COLORS.buttonDark
    this.face = scene.add.graphics()
    this.hit  = scene.add.rectangle(0, 0, w, h, COLORS.white, 0).setInteractive({ useHandCursor: true })
    this.draw(1, 0)
    this.hit.on('pointerover', () => this.draw(0.85, 0))
    this.hit.on('pointerout', () => this.draw(1, 0))
    this.hit.on('pointerdown', () => this.draw(0.7, 1))
    this.hit.on('pointerup', () => {
      this.draw(0.85, 0)
      onClick()

    })
    this.add([this.face, text, this.hit])

  }


  setEnabled(enabled: boolean): this {
    this.enabled = enabled
    this.setAlpha(enabled ? 1 : 0.4)

    if (enabled)
      this.hit.setInteractive({ useHandCursor: true })
    else
      this.hit.disableInteractive()

    return this

  }


  isEnabled(): boolean {
    return this.enabled

  }


  private draw(alpha: number, shift: number) {
    const { w, h } = this.size

    this.face.clear().fillStyle(this.fill, alpha).fillRoundedRect(-w / 2, -h / 2 + shift, w, h, RADIUS.button)

  }

}
