import * as Phaser from 'phaser'
import { Boot } from './scenes/Boot'

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#1a1a2e',
  scene: [Boot]
})
