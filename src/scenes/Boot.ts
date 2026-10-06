import * as Phaser from 'phaser'
import { loadDefs } from '../data'
import { findCardImages, findDonImage, preloadCardImages, preloadDonImage } from '../ui/textures'
import { COLORS, RADIUS, textStyle } from '../ui/theme'
import { pixelRatio } from '../ui/viewport'
import { goTo } from '../ui/transitions'

const SEARCH_SHARE = 0.15

export class Boot extends Phaser.Scene {

  private bar!: Phaser.GameObjects.Graphics
  private label!: Phaser.GameObjects.Text
  private barRect = { x: 0, y: 0, w: 0, h: 0 }

  constructor() {
    super('Boot')

  }


  async create() {
    const ratio = pixelRatio(window.devicePixelRatio)
    const width = this.scale.width / ratio
    const unit  = Math.max(0.8, this.scale.height / ratio / 720)

    this.cameras.main.setOrigin(0, 0).setZoom(ratio)
    this.barRect = { x: width / 2 - 200 * unit, y: this.scale.height / ratio / 2, w: 400 * unit, h: 14 * unit }
    this.add.text(width / 2, this.barRect.y - 70 * unit, 'One Piece TCG', textStyle(44 * unit, COLORS.gold)).setOrigin(0.5)
    this.label = this.add.text(width / 2, this.barRect.y + 40 * unit, 'Buscando cartas...', textStyle(16 * unit, COLORS.textDim, false)).setOrigin(0.5)
    this.bar   = this.add.graphics()
    this.progress(0)

    const images   = await findCardImages(Object.keys(loadDefs()), fraction => this.progress(fraction * SEARCH_SHARE))
    const donImage = await findDonImage()

    this.label.setText('Cargando imágenes...')
    preloadCardImages(this, images)
    preloadDonImage(this, donImage)
    this.load.on('progress', (fraction: number) => this.progress(SEARCH_SHARE + fraction * (1 - SEARCH_SHARE)))
    this.load.once('complete', () => goTo(this, import.meta.env.DEV && new URLSearchParams(window.location.search).has('mock') ? 'Board' : 'Menu', { images, donImage }))
    this.load.start()

  }


  private progress(fraction: number) {
    const { x, y, w, h } = this.barRect

    this.bar.clear().fillStyle(COLORS.buttonDark, 1).fillRoundedRect(x, y, w, h, RADIUS.button)
    this.bar.fillStyle(COLORS.gold, 1).fillRoundedRect(x, y, Math.max(h, w * fraction), h, RADIUS.button)

  }

}
