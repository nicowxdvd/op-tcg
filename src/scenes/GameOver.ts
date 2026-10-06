import * as Phaser from 'phaser'
import { rematchConfig } from '../app/gameConfig'
import type { MatchConfig } from '../app/gameConfig'
import { reasonLabel, winnerLabel } from '../app/gameResult'
import type { GameResult } from '../app/gameResult'
import { Button } from '../ui/Button'
import { COLORS, textStyle } from '../ui/theme'
import { pixelRatio } from '../ui/viewport'
import { fadeIn, goTo } from '../ui/transitions'

interface GameOverData {
  config: MatchConfig
  result: GameResult
  images?: string[]
  donImage?: string | null

}


export class GameOver extends Phaser.Scene {

  private config!: MatchConfig
  private result!: GameResult
  private images: string[] = []
  private donImage: string | null = null
  private ratio = 1

  constructor() {
    super('GameOver')

  }


  init(data: GameOverData) {
    this.config   = data.config
    this.result   = data.result
    this.images   = data.images ?? []
    this.donImage = data.donImage ?? null

  }


  create() {
    this.ratio = pixelRatio(window.devicePixelRatio)
    fadeIn(this)
    this.input.mouse?.disableContextMenu()
    this.build()
    this.scale.on('resize', () => this.build())
    this.events.once('shutdown', () => this.scale.off('resize'))

  }


  private build() {
    this.children.removeAll(true)
    this.cameras.main.setOrigin(0, 0).setZoom(this.ratio)

    const width   = this.scale.width / this.ratio
    const height  = this.scale.height / this.ratio
    const unit    = Math.max(0.8, height / 720)
    const buttonW = 300 * unit
    const buttonH = 52 * unit
    const cx      = width / 2
    const top     = height * 0.22

    this.add.text(cx, top, 'Fin de la partida', textStyle(22 * unit, COLORS.textDim)).setOrigin(0.5)
    this.add.text(cx, top + 70 * unit, winnerLabel(this.result, this.config.mode), textStyle(54 * unit, COLORS.gold)).setOrigin(0.5)
    this.add.text(cx, top + 140 * unit, reasonLabel(this.result, this.config.mode), textStyle(20 * unit, COLORS.text, false)).setOrigin(0.5)
    this.add.text(cx, top + 175 * unit, `Turnos jugados: ${this.result.turns}`, textStyle(20 * unit, COLORS.text, false)).setOrigin(0.5)
    this.add.existing(new Button(this, cx, top + 260 * unit, buttonW, buttonH, 'Revancha', () => this.rematch(), { primary: true, fontSize: 20 * unit }))
    this.add.existing(new Button(this, cx, top + 260 * unit + buttonH + 16 * unit, buttonW, buttonH, 'Volver al menú', () => goTo(this, 'Menu', { images: this.images, donImage: this.donImage }), { fontSize: 20 * unit }))

  }


  private rematch() {
    goTo(this, 'Board', { config: rematchConfig(this.config), images: this.images, donImage: this.donImage })

  }

}
