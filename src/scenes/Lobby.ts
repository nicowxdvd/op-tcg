import * as Phaser from 'phaser'
import { DIFFICULTIES } from '../ai'
import type { Difficulty } from '../ai'
import { matchError } from '../app/gameConfig'
import type { MatchConfig } from '../app/gameConfig'
import { listDecks, loadDefs } from '../data'
import type { PlayerId } from '../engine/types'
import { audio } from '../ui/AudioManager'
import { Button } from '../ui/Button'
import { drawIcon } from '../ui/icons'
import { bestTextureKey, hasCardImage, preloadCardImages } from '../ui/textures'
import { CARD_FACES, COLORS, DIALOG_FONT, LOBBY, SERIF_FONT, css } from '../ui/theme'
import { fadeIn, goTo } from '../ui/transitions'
import { pixelRatio } from '../ui/viewport'

interface LobbyData {
  images?: string[]
  donImage?: string | null

}

const SIDES: PlayerId[] = ['p1', 'p2']

const DIFFICULTY_TEXTS: Record<Difficulty, { title: string; text: string }> = {
  normal : { title: 'Normal', text: 'Lee la mesa: tu líder, tus personajes y lo que hacen.' },
  dificil: { title: 'Difícil', text: 'Conoce tu líder y las listas que suele jugar, así se anticipa a tus jugadas.' },
  experto: { title: 'Experto', text: 'Sabe en todo momento tu mazo y tu mano: anticipa tus ataques y tus defensas.' }
}

const COPY = {
  cpu    : { overline: 'PRÁCTICA', title: 'Solo contra la IA', subtitle: 'Una partida de verdad contra la IA: reloj para los dos y sin rebobinar.', heads: { p1: 'TU MAZO', p2: 'MAZO DE LA IA' } },
  hotseat: { overline: 'PARTIDA LOCAL', title: 'Dos personas', subtitle: 'Una partida entre dos jugadores en el mismo dispositivo.', heads: { p1: 'JUGADOR 1', p2: 'JUGADOR 2' } }
}


export class Lobby extends Phaser.Scene {

  private images: string[] = []
  private donImage: string | null = null
  private mode: MatchConfig['mode'] = 'cpu'
  private difficulty: Difficulty = 'normal'
  private selected: Record<PlayerId, string> = { p1: 'st01', p2: 'st02' }
  private open: PlayerId | null = null
  private error: string | null = null
  private ratio = 1

  constructor() {
    super('Lobby')

  }


  init(data: LobbyData) {
    this.images   = data.images ?? []
    this.donImage = data.donImage ?? null
    this.open     = null
    this.error    = null

  }


  preload() {
    preloadCardImages(this, listDecks().map(deck => deck.leader).filter(id => this.images.includes(id)))

  }


  create() {
    this.ratio = pixelRatio(window.devicePixelRatio)
    fadeIn(this)
    this.input.mouse?.disableContextMenu()
    this.build()
    this.scale.on('resize', () => this.build())
    this.events.once('shutdown', () => this.scale.off('resize'))

  }


  private font(size: number, color: number, family = DIALOG_FONT, style = 'normal', spacing = 0): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: family, fontSize: `${Math.round(size * 10) / 10}px`, fontStyle: style, color: css(color), letterSpacing: spacing } as Phaser.Types.GameObjects.Text.TextStyle

  }


  private build() {
    this.children.removeAll(true)
    this.cameras.main.setOrigin(0, 0).setZoom(this.ratio)

    const width  = this.scale.width / this.ratio
    const height = this.scale.height / this.ratio
    const unit   = Math.max(0.8, height / 900)
    const cpu    = this.mode === 'cpu'
    const copy   = COPY[this.mode]
    const cx     = width / 2
    const top    = Math.max(0, (height - 900 * unit) / 2)
    const at     = (y: number) => top + y * unit

    this.drawCompass(cx, at(450), unit)
    this.drawModeToggle(cx, at(28), unit)
    this.drawSound(width - 20 * unit, at(28), unit)

    this.add.text(cx, at(72), copy.overline, this.font(11 * unit, LOBBY.dim, DIALOG_FONT, 'normal', 3 * unit)).setOrigin(0.5)

    const title = this.add.text(cx, at(104), copy.title, this.font(36 * unit, COLORS.text, SERIF_FONT)).setOrigin(0.5)

    if (cpu)
      this.drawBeta(title.x + title.width / 2 + 8 * unit, at(106), unit)

    this.add.text(cx, at(138), copy.subtitle, this.font(15 * unit, COLORS.textDim)).setOrigin(0.5)

    if (cpu)
      this.drawNotice(cx, at(193), unit)

    const offset = 170 * unit
    const cardW  = 138 * unit
    const cardH  = 194 * unit
    const cardY  = at(cpu ? 362 : 300)
    const headY  = cardY - cardH / 2 - 26 * unit

    SIDES.forEach((side, i) => {
      const x = cx + (i === 0 ? -offset : offset)

      this.add.text(x, headY, copy.heads[side], this.font(10 * unit, LOBBY.dim, DIALOG_FONT, 'normal', 2.5 * unit)).setOrigin(0.5)
      this.drawLeader(x, cardY, cardW, cardH, unit, this.selected[side])

    })

    this.drawVs(cx, cardY, unit)

    const fieldY = cardY + cardH / 2 + 62 * unit

    SIDES.forEach((side, i) => this.drawField(cx + (i === 0 ? -offset : offset), fieldY, 246 * unit, 39 * unit, unit, side))

    const buttonY = at(cpu ? 677 : 600)

    if (cpu)
      this.drawDifficulty(cx, at(595), unit)

    if (this.error)
      this.add.text(cx, buttonY - 42 * unit, this.error, { ...this.font(13 * unit, COLORS.attack), align: 'center', wordWrap: { width: width * 0.6 } }).setOrigin(0.5)

    this.add.existing(new Button(this, cx, buttonY, 187 * unit, 43 * unit, 'Empezar partida', () => this.play(), { primary: true, icon: 'play', fontSize: 15 * unit, radius: 6 * unit, family: DIALOG_FONT }))
    this.add.existing(new Button(this, cx, buttonY + 59 * unit, 124 * unit, 33 * unit, 'Volver al lobby', () => window.location.reload(), { outline: LOBBY.border, radius: 17 * unit, fontSize: 13 * unit, family: DIALOG_FONT }))
    this.add.existing(new Button(this, width - 94 * unit, height - 28 * unit, 170 * unit, 36 * unit, 'Reportar un error', () => {}, { outline: LOBBY.border, icon: 'bug', radius: 18 * unit, fontSize: 13 * unit, family: DIALOG_FONT }))

    if (this.open) {
      this.add.rectangle(width / 2, height / 2, width, height, COLORS.white, 0).setDepth(9).setInteractive().on('pointerup', () => this.toggle(this.open!))
      this.drawMenu(cx + (this.open === 'p1' ? -offset : offset), fieldY + 39 * unit / 2 + 4 * unit, 246 * unit, unit, this.open)

    }

  }


  private drawCompass(cx: number, cy: number, unit: number) {
    const graphics = this.add.graphics().setAlpha(0.06)
    const radius   = 330 * unit

    graphics.lineStyle(2 * unit, COLORS.textDim, 1)

    for (const factor of [1, 0.78, 0.4])
      graphics.strokeCircle(cx, cy, radius * factor)

    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8

      graphics.lineBetween(cx + Math.cos(angle) * radius * 0.78, cy + Math.sin(angle) * radius * 0.78, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)

    }

    graphics.fillStyle(COLORS.textDim, 1).fillTriangle(cx + 150 * unit, cy - 260 * unit, cx - 24 * unit, cy + 24 * unit, cx + 24 * unit, cy - 24 * unit)
    graphics.fillTriangle(cx - 150 * unit, cy + 260 * unit, cx - 24 * unit, cy + 24 * unit, cx + 24 * unit, cy - 24 * unit)

  }


  private drawModeToggle(cx: number, y: number, unit: number) {
    const w = 130 * unit

    ;(['cpu', 'hotseat'] as const).forEach((mode, i) => {
      const x = cx + (i === 0 ? -w / 2 : w / 2) - (i === 0 ? 4 : -4) * unit

      this.add.existing(new Button(this, x, y, w, 26 * unit, mode === 'cpu' ? 'Contra la IA' : 'Dos personas', () => this.setMode(mode), { outline: this.mode === mode ? LOBBY.gold : LOBBY.border, radius: 13 * unit, fontSize: 12 * unit, family: DIALOG_FONT }))

    })

  }


  private drawSound(right: number, y: number, unit: number) {
    const small = 26 * unit
    const label = audio.isMuted() ? 'Silencio' : `${Math.round(audio.getVolume() * 100)}%`
    const x     = right - small / 2

    this.add.existing(new Button(this, x, y, small, small, '+', () => this.volume(0.1), { outline: LOBBY.border, radius: small / 2, fontSize: 14 * unit, family: DIALOG_FONT }))
    this.add.text(x - 41 * unit, y, label, this.font(12 * unit, COLORS.textDim)).setOrigin(0.5)
    this.add.existing(new Button(this, x - small - 56 * unit, y, small, small, '−', () => this.volume(-0.1), { outline: LOBBY.border, radius: small / 2, fontSize: 14 * unit, family: DIALOG_FONT }))
    this.add.existing(new Button(this, x - small - 56 * unit - small / 2 - 43 * unit, y, 70 * unit, small, audio.isMuted() ? 'Activar' : 'Mute', () => this.mute(), { outline: LOBBY.border, radius: small / 2, fontSize: 11 * unit, family: DIALOG_FONT }))

  }


  private drawBeta(x: number, y: number, unit: number) {
    const w        = 46 * unit
    const h        = 20 * unit
    const graphics = this.add.graphics()

    graphics.fillStyle(LOBBY.gold, 0.12).fillRoundedRect(x, y - h / 2, w, h, h / 2)
    graphics.lineStyle(1, LOBBY.gold, 0.7).strokeRoundedRect(x, y - h / 2, w, h, h / 2)
    this.add.text(x + w / 2, y, 'BETA', this.font(10 * unit, LOBBY.gold, SERIF_FONT, '600', unit)).setOrigin(0.5)

  }


  private drawNotice(cx: number, y: number, unit: number) {
    const w        = 518 * unit
    const h        = 59 * unit
    const graphics = this.add.graphics()

    graphics.fillStyle(LOBBY.panel, 1).fillRoundedRect(cx - w / 2, y - h / 2, w, h, 8 * unit)
    graphics.lineStyle(1, LOBBY.border, 1).strokeRoundedRect(cx - w / 2, y - h / 2, w, h, 8 * unit)
    drawIcon(graphics, 'flask', cx - w / 2 + 19 * unit, y - 11 * unit, 14 * unit, LOBBY.gold)
    graphics.lineStyle(1, LOBBY.dim, 1).strokeCircle(cx + w / 2 - 25 * unit, y, 10 * unit)
    drawIcon(graphics, 'info', cx + w / 2 - 25 * unit, y, 13 * unit, LOBBY.dim)

    const left = cx - w / 2 + 40 * unit
    const bold = this.add.text(left, y - 11 * unit, 'Modo en pruebas.', this.font(13 * unit, COLORS.white, DIALOG_FONT, '700')).setOrigin(0, 0.5)

    this.add.text(left + bold.width + 4 * unit, y - 11 * unit, 'Lo iremos puliendo y sumando líderes. Tu opinión', this.font(13 * unit, COLORS.textDim)).setOrigin(0, 0.5)
    this.add.text(left, y + 8 * unit, 'ayuda.', this.font(13 * unit, COLORS.textDim)).setOrigin(0, 0.5)

  }


  private drawLeader(cx: number, cy: number, w: number, h: number, unit: number, deckId: string) {
    const deck   = listDecks().find(entry => entry.id === deckId)
    const leader = deck ? loadDefs()[deck.leader] : null

    if (!leader)
      return

    const shadow = this.add.graphics()

    shadow.fillStyle(0x000000, 0.4).fillRoundedRect(cx - w / 2, cy - h / 2 + 6 * unit, w, h, 10 * unit)

    if (hasCardImage(this, leader.id))
      this.add.image(cx, cy, bestTextureKey(this, leader.id, h)).setDisplaySize(w, h)
    else {
      const face = CARD_FACES[leader.colors[0]] ?? COLORS.buttonDark
      const card = this.add.graphics()

      card.fillStyle(face, 1).fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 10 * unit)
      card.lineStyle(2, COLORS.gold, 1).strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 10 * unit)
      this.add.text(cx, cy, leader.name, { ...this.font(h * 0.08, COLORS.white, DIALOG_FONT, '700'), align: 'center', wordWrap: { width: w - 16 } }).setOrigin(0.5)

    }

    this.add.text(cx, cy + h / 2 + 18 * unit, leader.name, this.font(12 * unit, COLORS.textDim)).setOrigin(0.5)

  }


  private drawVs(cx: number, cy: number, unit: number) {
    const graphics = this.add.graphics()

    graphics.lineStyle(1, LOBBY.border, 1).lineBetween(cx, cy + 22 * unit, cx, cy + 50 * unit)
    graphics.fillStyle(LOBBY.field, 1).fillCircle(cx, cy, 21 * unit)
    graphics.lineStyle(1, LOBBY.border, 1).strokeCircle(cx, cy, 21 * unit)
    this.add.text(cx, cy, 'VS', this.font(14 * unit, COLORS.textDim, SERIF_FONT)).setOrigin(0.5)

  }


  private drawField(cx: number, cy: number, w: number, h: number, unit: number, side: PlayerId) {
    const deck     = listDecks().find(entry => entry.id === this.selected[side])
    const leader   = deck ? loadDefs()[deck.leader] : null
    const graphics = this.add.graphics()
    const left     = cx - w / 2

    graphics.fillStyle(LOBBY.field, 1).fillRoundedRect(left, cy - h / 2, w, h, 8 * unit)
    graphics.lineStyle(1, this.open === side ? LOBBY.gold : LOBBY.border, 1).strokeRoundedRect(left, cy - h / 2, w, h, 8 * unit)
    graphics.fillStyle(CARD_FACES[leader?.colors[0] ?? ''] ?? COLORS.buttonDark, 1).fillCircle(left + 20 * unit, cy, 6 * unit)
    drawIcon(graphics, 'chevron', left + w - 18 * unit, cy, 14 * unit, COLORS.textDim)

    const name = this.add.text(left + 38 * unit, cy, leader?.name ?? '', this.font(15 * unit, COLORS.text, DIALOG_FONT, '500')).setOrigin(0, 0.5)
    const code = this.add.text(left + w - 38 * unit, cy, deck?.leader ?? '', this.font(11 * unit, COLORS.textDim)).setOrigin(1, 0.5)

    if (name.x + name.width + 8 * unit > code.x - code.width)
      code.setVisible(false)

    this.add.rectangle(cx, cy, w, h, COLORS.white, 0).setInteractive({ useHandCursor: true }).on('pointerup', () => this.toggle(side))

  }


  private drawMenu(cx: number, top: number, w: number, unit: number, side: PlayerId) {
    const decks    = listDecks()
    const rowH     = 36 * unit
    const h        = decks.length * rowH + 8 * unit
    const left     = cx - w / 2
    const graphics = this.add.graphics().setDepth(10)

    graphics.fillStyle(LOBBY.panel, 1).fillRoundedRect(left, top, w, h, 8 * unit)
    graphics.lineStyle(1, LOBBY.border, 1).strokeRoundedRect(left, top, w, h, 8 * unit)

    decks.forEach((deck, i) => {
      const y      = top + 4 * unit + i * rowH + rowH / 2
      const leader = loadDefs()[deck.leader]
      const active = this.selected[side] === deck.id

      if (active)
        graphics.fillStyle(LOBBY.selected, 1).fillRoundedRect(left + 4 * unit, y - rowH / 2, w - 8 * unit, rowH, 6 * unit)

      graphics.fillStyle(CARD_FACES[leader.colors[0]] ?? COLORS.buttonDark, 1).fillCircle(left + 20 * unit, y, 6 * unit)
      this.add.text(left + 38 * unit, y, leader.name, this.font(14 * unit, COLORS.text)).setOrigin(0, 0.5).setDepth(11)
      this.add.text(left + w - 14 * unit, y, deck.leader, this.font(11 * unit, COLORS.textDim)).setOrigin(1, 0.5).setDepth(11)
      this.add.rectangle(cx, y, w, rowH, COLORS.white, 0).setInteractive({ useHandCursor: true }).setDepth(12).on('pointerup', () => this.pick(side, deck.id))

    })

  }


  private drawDifficulty(cx: number, cy: number, unit: number) {
    const w   = 197 * unit
    const h   = 80 * unit
    const gap = 8 * unit

    DIFFICULTIES.forEach((level, i) => {
      const x        = cx + (i - 1) * (w + gap)
      const active   = this.difficulty === level
      const graphics = this.add.graphics()

      graphics.fillStyle(active ? LOBBY.selected : LOBBY.card, 1).fillRoundedRect(x - w / 2, cy - h / 2, w, h, 8 * unit)
      graphics.lineStyle(active ? 2 : 1, active ? LOBBY.gold : LOBBY.border, 1).strokeRoundedRect(x - w / 2, cy - h / 2, w, h, 8 * unit)

      this.add.text(x - w / 2 + 16 * unit, cy - h / 2 + 12 * unit, DIFFICULTY_TEXTS[level].title, this.font(13 * unit, COLORS.text, DIALOG_FONT, '700'))
      this.add.text(x - w / 2 + 16 * unit, cy - h / 2 + 32 * unit, DIFFICULTY_TEXTS[level].text, { ...this.font(10 * unit, active ? COLORS.text : COLORS.textDim), wordWrap: { width: w - 32 * unit }, lineSpacing: 2 * unit })
      this.add.rectangle(x, cy, w, h, COLORS.white, 0).setInteractive({ useHandCursor: true }).on('pointerup', () => this.setDifficulty(level))

    })

  }


  private setMode(mode: MatchConfig['mode']) {
    this.mode  = mode
    this.open  = null
    this.error = null
    this.build()

  }


  private setDifficulty(level: Difficulty) {
    this.difficulty = level
    this.build()

  }


  private toggle(side: PlayerId) {
    this.open = this.open === side ? null : side
    this.build()

  }


  private pick(side: PlayerId, deckId: string) {
    this.selected = { ...this.selected, [side]: deckId }
    this.open     = null
    this.error    = null
    this.build()

  }


  private volume(delta: number) {
    audio.setVolume(audio.getVolume() + delta)
    this.build()

  }


  private mute() {
    audio.toggleMute()
    this.build()

  }


  private play() {
    const config: MatchConfig = { mode: this.mode, decks: this.selected, seed: Date.now(), difficulty: this.difficulty }
    const error               = matchError(config)

    if (error) {
      this.error = error
      this.build()

      return
    }

    goTo(this, 'Board', { config, images: this.images, donImage: this.donImage })

  }

}
