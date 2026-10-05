import * as Phaser from 'phaser'

export interface PromptOption {
  label: string
  run: () => void

}


export class PromptDialog extends Phaser.GameObjects.Container {

  constructor(scene: Phaser.Scene, x: number, y: number, title: string, options: PromptOption[]) {
    super(scene, x, y)

    const width  = 340
    const row    = 34
    const height = 56 + options.length * (row + 8)
    const top    = -height / 2

    this.add(scene.add.rectangle(0, 0, width, height, 0x10151f, 0.95).setStrokeStyle(2, 0xffd54a))
    this.add(scene.add.text(0, top + 22, title, { fontSize: '16px', color: '#ffffff', align: 'center', wordWrap: { width: width - 20 } }).setOrigin(0.5))

    options.forEach((option, i) => {
      const button = scene.add.rectangle(0, top + 58 + i * (row + 8), width - 40, row, 0x2d3b55).setStrokeStyle(1, 0xffffff, 0.6)
      const label  = scene.add.text(0, button.y, option.label, { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5)

      button.setInteractive({ useHandCursor: true })
      button.on('pointerover', () => button.setFillStyle(0x3d5280))
      button.on('pointerout', () => button.setFillStyle(0x2d3b55))
      button.on('pointerup', () => option.run())

      this.add([button, label])

    })

  }

}
