import * as Phaser from 'phaser'
import { matchError } from '../app/gameConfig'
import type { MatchConfig } from '../app/gameConfig'
import { listDecks, loadDefs } from '../data'
import type { PlayerId } from '../engine/types'
import { Button } from '../ui/Button'
import { bestTextureKey, hasCardImage, preloadCardImages } from '../ui/textures'
import { CARD_FACES, COLORS, RADIUS, textStyle } from '../ui/theme'
import { pixelRatio } from '../ui/viewport'
import { fadeIn, goTo } from '../ui/transitions'

interface DeckSelectData {
  mode?: MatchConfig['mode']
  images?: string[]
  donImage?: string | null

}

const SIDES: PlayerId[] = ['p1', 'p2']


export class DeckSelect extends Phaser.Scene {

  private mode: MatchConfig['mode'] = 'cpu'
  private images: string[] = []
  private donImage: string | null = null
  private selected: Record<PlayerId, string> = { p1: 'st01', p2: 'st02' }
  private error: string | null = null
  private ratio = 1

  constructor() {
    super('DeckSelect')

  }


  init(data: DeckSelectData) {
    this.mode     = data.mode ?? 'cpu'
    this.images   = data.images ?? []
    this.donImage = data.donImage ?? null
    this.error    = null

  }


  preload() {
    const leaders = listDecks().map(deck => deck.leader)

    preloadCardImages(this, leaders.filter(id => this.images.includes(id)))

  }


  create() {
    this.ratio = pixelRatio(window.devicePixelRatio)
    fadeIn(this)
    this.input.mouse?.disableContextMenu()
    this.build()
    this.scale.on('resize', () => this.build())
    this.events.once('shutdown', () => this.scale.off('resize'))

  }


  private heading(side: PlayerId): string {
    if (this.mode === 'hotseat')
      return side === 'p1' ? 'Jugador 1' : 'Jugador 2'

    return side === 'p1' ? 'Tu mazo' : 'Mazo del rival'

  }


  private build() {
    this.children.removeAll(true)
    this.cameras.main.setOrigin(0, 0).setZoom(this.ratio)

    const width    = this.scale.width / this.ratio
    const height   = this.scale.height / this.ratio
    const unit     = Math.max(0.8, height / 720)
    const columnW  = 360 * unit
    const gap      = 60 * unit
    const rowH     = 44 * unit
    const imageH   = Math.min(height * 0.36, 320 * unit)
    const decks    = listDecks()
    const left     = width / 2 - columnW - gap / 2
    const headingY = height * 0.15

    this.add.text(width / 2, height * 0.07, 'Elegí los mazos', textStyle(34 * unit, COLORS.gold)).setOrigin(0.5)

    SIDES.forEach((side, i) => {
      const cx = left + i * (columnW + gap) + columnW / 2

      this.add.text(cx, headingY, this.heading(side), textStyle(20 * unit, COLORS.nameBlue)).setOrigin(0.5)

      decks.forEach((deck, j) => {
        const active = this.selected[side] === deck.id
        const y      = headingY + 40 * unit + rowH / 2 + j * (rowH + 10 * unit)

        this.add.existing(new Button(this, cx, y, columnW, rowH, deck.name, () => this.pick(side, deck.id), { primary: active, fontSize: 16 * unit }))

      })

      this.drawLeader(cx, headingY + 40 * unit + decks.length * (rowH + 10 * unit) + 20 * unit + imageH / 2, imageH, this.selected[side])

    })

    const buttonY = height - 60 * unit

    if (this.error)
      this.add.text(width / 2, buttonY - 50 * unit, this.error, { ...textStyle(15 * unit, COLORS.attack), align: 'center', wordWrap: { width: width * 0.8 } }).setOrigin(0.5)

    this.add.existing(new Button(this, width / 2 - 110 * unit, buttonY, 190 * unit, 48 * unit, 'Volver', () => goTo(this, 'Menu', { images: this.images, donImage: this.donImage }), { fontSize: 18 * unit }))
    this.add.existing(new Button(this, width / 2 + 110 * unit, buttonY, 190 * unit, 48 * unit, 'Jugar', () => this.play(), { primary: true, fontSize: 18 * unit }))

  }


  private drawLeader(cx: number, cy: number, imageH: number, deckId: string) {
    const deck   = listDecks().find(entry => entry.id === deckId)
    const leader = deck ? loadDefs()[deck.leader] : null

    if (!deck || !leader)
      return

    const imageW = imageH * 0.7

    if (hasCardImage(this, leader.id))
      this.add.image(cx, cy, bestTextureKey(this, leader.id, imageH)).setDisplaySize(imageW, imageH)
    else {
      const face = CARD_FACES[leader.colors[0]] ?? COLORS.buttonDark
      const card = this.add.graphics()

      card.fillStyle(face, 1).fillRoundedRect(cx - imageW / 2, cy - imageH / 2, imageW, imageH, RADIUS.card)
      card.lineStyle(2, COLORS.gold, 1).strokeRoundedRect(cx - imageW / 2, cy - imageH / 2, imageW, imageH, RADIUS.card)
      this.add.text(cx, cy, leader.name, { ...textStyle(imageH * 0.06, COLORS.white), align: 'center', wordWrap: { width: imageW - 16 } }).setOrigin(0.5)

    }

    this.add.text(cx, cy + imageH / 2 + 16, `Leader: ${leader.name}`, textStyle(15, COLORS.text)).setOrigin(0.5)

  }


  private pick(side: PlayerId, deckId: string) {
    this.selected = { ...this.selected, [side]: deckId }
    this.error    = null
    this.build()

  }


  private play() {
    const config: MatchConfig = { mode: this.mode, decks: this.selected, seed: Date.now() }
    const error               = matchError(config)

    if (error) {
      this.error = error
      this.build()

      return
    }

    goTo(this, 'Board', { config, images: this.images, donImage: this.donImage })

  }

}
