import * as Phaser from 'phaser'

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create() {
    this.add.text(this.scale.width / 2, this.scale.height / 2, 'One Piece TCG', { fontSize: '48px', color: '#ffffff' }).setOrigin(0.5)
  }
}
