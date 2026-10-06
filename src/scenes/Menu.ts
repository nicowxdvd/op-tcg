import * as Phaser from 'phaser'
import { audio } from '../ui/AudioManager'
import { Button } from '../ui/Button'
import { COLORS, textStyle } from '../ui/theme'
import { pixelRatio } from '../ui/viewport'
import { fadeIn, goTo } from '../ui/transitions'

interface MenuData {
  images?: string[]
  donImage?: string | null

}


export class Menu extends Phaser.Scene {

  private images: string[] = []
  private donImage: string | null = null
  private ratio = 1

  constructor() {
    super('Menu')

  }


  init(data: MenuData) {
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
    const buttonW = 340 * unit
    const buttonH = 56 * unit
    const gap     = 18 * unit
    const cx      = width / 2
    const top     = height / 2 - buttonH - gap / 2

    this.add.text(cx, top - 110 * unit, 'One Piece TCG', textStyle(54 * unit, COLORS.gold)).setOrigin(0.5)
    this.add.text(cx, top - 60 * unit, 'Elegí cómo querés jugar', textStyle(18 * unit, COLORS.textDim, false)).setOrigin(0.5)
    this.add.existing(new Button(this, cx, top + buttonH / 2, buttonW, buttonH, 'Jugar contra CPU', () => this.start(true), { primary: true, fontSize: 20 * unit }))
    this.add.existing(new Button(this, cx, top + buttonH * 1.5 + gap, buttonW, buttonH, 'Jugar entre dos personas', () => this.start(false), { fontSize: 20 * unit }))

    const rowY  = top + buttonH * 2 + gap + 70 * unit
    const small = 44 * unit

    this.add.existing(new Button(this, cx - buttonW / 2 + small / 2, rowY, small, small, '−', () => this.volume(-0.1), { fontSize: 22 * unit }))
    this.add.text(cx, rowY, `Volumen ${Math.round(audio.getVolume() * 100)}%`, textStyle(18 * unit, COLORS.text)).setOrigin(0.5)
    this.add.existing(new Button(this, cx + buttonW / 2 - small / 2, rowY, small, small, '+', () => this.volume(0.1), { fontSize: 22 * unit }))
    this.add.existing(new Button(this, cx, rowY + small + 12 * unit, buttonW, small, audio.isMuted() ? 'Sonido: silenciado (M)' : 'Sonido: activado (M)', () => this.mute(), { fontSize: 16 * unit }))

  }


  private volume(delta: number) {
    audio.setVolume(audio.getVolume() + delta)
    this.build()

  }


  private mute() {
    audio.toggleMute()
    this.build()

  }


  private start(cpu: boolean) {
    goTo(this, 'DeckSelect', { mode: cpu ? 'cpu' : 'hotseat', images: this.images, donImage: this.donImage })

  }

}
