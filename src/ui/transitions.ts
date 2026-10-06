import * as Phaser from 'phaser'
import { COLORS, DURATION } from './theme'

const RGB = { r: (COLORS.background >> 16) & 255, g: (COLORS.background >> 8) & 255, b: COLORS.background & 255 }


export function fadeIn(scene: Phaser.Scene) {
  scene.cameras.main.fadeIn(DURATION.turn, RGB.r, RGB.g, RGB.b)

}


export function goTo(scene: Phaser.Scene, key: string, data: object) {
  const camera = scene.cameras.main

  if (camera.fadeEffect.isRunning && !camera.fadeEffect.isComplete)
    return

  camera.once('camerafadeoutcomplete', () => scene.scene.start(key, data))
  camera.fadeOut(DURATION.quick, RGB.r, RGB.g, RGB.b)

}
