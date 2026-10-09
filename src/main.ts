import * as Phaser from 'phaser'
import { Boot } from './scenes/Boot'
import { Lobby } from './scenes/Lobby'
import { Board } from './scenes/Board'
import { GameOver } from './scenes/GameOver'
import { audio } from './ui/AudioManager'
import { COLORS, css } from './ui/theme'
import { logicalSize, pixelRatio } from './ui/viewport'

const ratio = pixelRatio(window.devicePixelRatio)
const first = logicalSize(window.innerWidth, window.innerHeight)
const game  = new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: first.w * ratio, height: first.h * ratio, backgroundColor: css(COLORS.background), scale: { mode: Phaser.Scale.NONE, zoom: 1 / ratio }, scene: [Boot, Lobby, Board, GameOver] })

audio.attach()
audio.startMusic()

window.addEventListener('keydown', event => {
  if (event.key.toLowerCase() === 'm')
    audio.toggleMute()

})

window.addEventListener('resize', () => {
  const size = logicalSize(window.innerWidth, window.innerHeight)

  game.scale.resize(size.w * ratio, size.h * ratio)

})
