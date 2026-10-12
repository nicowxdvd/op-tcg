import * as Phaser from 'phaser'
import { Boot } from './scenes/Boot'
import { Lobby } from './scenes/Lobby'
import { Board } from './scenes/Board'
import { GameOver } from './scenes/GameOver'
import { audio } from './ui/AudioManager'
import { fitScale, logicalSize, needsRotation, pixelRatio } from './ui/viewport'

const ratio = pixelRatio(window.devicePixelRatio)
const first = logicalSize(window.innerWidth, window.innerHeight)
const game  = new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: first.w * ratio, height: first.h * ratio, transparent: true, scale: { mode: Phaser.Scale.NONE, zoom: fitScale(window.innerWidth, window.innerHeight) / ratio }, scene: [Boot, Lobby, Board, GameOver] })

audio.attach()
audio.startMusic()

window.addEventListener('keydown', event => {
  if (event.key.toLowerCase() === 'm')
    audio.toggleMute()

})

const rotate = document.getElementById('rotate') as HTMLElement

function fit() {
  const size = logicalSize(window.innerWidth, window.innerHeight)

  game.scale.setZoom(fitScale(window.innerWidth, window.innerHeight) / ratio)
  game.scale.resize(size.w * ratio, size.h * ratio)
  rotate.hidden = !needsRotation(window.innerWidth, window.innerHeight)

}

window.addEventListener('resize', fit)

fit()
