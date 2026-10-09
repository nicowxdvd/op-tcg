import * as Phaser from 'phaser'
import type { PlayerId } from '../engine'
import type { Size } from './layout'
import { bestTextureKey, hasCardImage } from './textures'
import { CARD_FACES, COLORS, DIALOG_FONT, RADIUS, textStyle } from './theme'

export interface RollLeader {
  defId: string
  name: string
  color: string

}


export interface StartRollInfo {
  leaders: Record<PlayerId, RollLeader>
  labels: Record<PlayerId, string>
  dice: Record<PlayerId, number>
  winner: PlayerId
  headline: string
  canChoose: boolean
  animate: boolean
  onChoose: (goFirst: boolean) => void

}

type Revealable = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible

const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]
}

const SPIN_STEP_MS = 70
const SPIN_STEPS   = 12


export class StartRollDialog extends Phaser.GameObjects.Container {

  private spin: Phaser.Time.TimerEvent | null = null

  constructor(scene: Phaser.Scene, screen: Size, info: StartRollInfo) {
    super(scene, screen.w / 2, screen.h / 2)

    const unit    = Math.max(0.8, screen.h / 720) * 0.85
    const width   = 520 * unit
    const pad     = 24 * unit
    const cardH   = 170 * unit
    const cardW   = cardH * 0.7
    const dieSize = 58 * unit
    const buttonH = 64 * unit
    const family  = { fontFamily: DIALOG_FONT }
    const height  = pad * 2 + 30 * unit + 16 * unit + cardH + 40 * unit + dieSize + 28 * unit + 40 * unit + (info.canChoose ? 30 * unit + buttonH + 16 * unit : 0)
    const top     = -height / 2
    const veil    = scene.add.rectangle(0, 0, screen.w, screen.h, COLORS.veil, 0.55).setInteractive()
    const panel   = scene.add.graphics()

    panel.fillStyle(COLORS.black, 1).fillRoundedRect(-width / 2, top, width, height, RADIUS.panel)
    panel.lineStyle(1.5, COLORS.white, 1).strokeRoundedRect(-width / 2, top, width, height, RADIUS.panel)
    this.add([veil, panel])

    let y = top + pad

    this.add(scene.add.text(0, y, 'SORTEO DE INICIO', { ...textStyle(18 * unit, COLORS.white), ...family, align: 'center' }).setOrigin(0.5, 0))
    y += 30 * unit + 16 * unit

    const sideX = width * 0.27
    const cardY = y + cardH / 2

    this.drawLeader(scene, -sideX, cardY, cardW, cardH, info.leaders.p1, unit)
    this.drawLeader(scene, sideX, cardY, cardW, cardH, info.leaders.p2, unit)
    this.add(scene.add.text(0, cardY, 'VS', { ...textStyle(40 * unit, COLORS.gold), ...family }).setOrigin(0.5))
    y += cardH + 8 * unit

    this.add([
      scene.add.text(-sideX, y, info.labels.p1, { ...textStyle(16 * unit, COLORS.white), ...family }).setOrigin(0.5, 0),
      scene.add.text(sideX, y, info.labels.p2, { ...textStyle(16 * unit, COLORS.white), ...family }).setOrigin(0.5, 0)
    ])
    y += 32 * unit

    const dieY  = y + dieSize / 2
    const dice  = { p1: scene.add.graphics(), p2: scene.add.graphics() }
    const faces = { ...info.dice }
    const paint = (player: PlayerId, revealed: boolean) => this.drawDie(dice[player], player === 'p1' ? -dieSize * 1.1 : dieSize * 1.1, dieY, dieSize, faces[player], revealed && info.winner === player)

    this.add([dice.p1, dice.p2])
    y += dieSize + 28 * unit

    const headline = scene.add.text(0, y, info.headline, { ...textStyle(22 * unit, COLORS.white), ...family, align: 'center', wordWrap: { width: width - 2 * pad } }).setOrigin(0.5, 0)
    const reveal: Revealable[] = [headline]

    this.add(headline)
    y += 40 * unit

    if (info.canChoose) {
      const ask = scene.add.text(0, y, '¿Jugar primero o segundo?', { ...textStyle(17 * unit, COLORS.white, false), ...family }).setOrigin(0.5, 0)

      this.add(ask)
      reveal.push(ask)
      y += 30 * unit

      const gap     = 14 * unit
      const buttonW = (width - 2 * pad - gap) / 2

      reveal.push(...this.drawChoice(scene, -(buttonW + gap) / 2, y + buttonH / 2, buttonW, buttonH, '1', 'PRIMERO', unit, () => info.onChoose(true)))
      reveal.push(...this.drawChoice(scene, (buttonW + gap) / 2, y + buttonH / 2, buttonW, buttonH, '2', 'SEGUNDO', unit, () => info.onChoose(false)))

    }

    const finish = () => {
      faces.p1 = info.dice.p1
      faces.p2 = info.dice.p2
      paint('p1', true)
      paint('p2', true)
      reveal.forEach(item => item.setVisible(true))

    }

    if (!info.animate) {
      finish()

      return

    }

    reveal.forEach(item => item.setVisible(false))
    this.spin = scene.time.addEvent({
      delay: SPIN_STEP_MS,
      repeat: SPIN_STEPS - 1,
      callback: () => {
        faces.p1 = Phaser.Math.Between(1, 6)
        faces.p2 = Phaser.Math.Between(1, 6)
        paint('p1', false)
        paint('p2', false)

        if (this.spin && this.spin.getRepeatCount() === 0)
          finish()

      }
    })

    this.once(Phaser.GameObjects.Events.DESTROY, () => this.spin?.remove())

  }


  private drawLeader(scene: Phaser.Scene, cx: number, cy: number, w: number, h: number, leader: RollLeader, unit: number) {
    if (hasCardImage(scene, leader.defId)) {
      this.add(scene.add.image(cx, cy, bestTextureKey(scene, leader.defId, h)).setDisplaySize(w, h))

      return

    }

    const card = scene.add.graphics()

    card.fillStyle(CARD_FACES[leader.color] ?? COLORS.buttonDark, 1).fillRoundedRect(cx - w / 2, cy - h / 2, w, h, RADIUS.card)
    card.lineStyle(2, COLORS.gold, 1).strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, RADIUS.card)
    this.add([card, scene.add.text(cx, cy, leader.name, { ...textStyle(14 * unit, COLORS.white), fontFamily: DIALOG_FONT, align: 'center', wordWrap: { width: w - 12 } }).setOrigin(0.5)])

  }


  private drawDie(graphics: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, face: number, winner: boolean) {
    const fill = winner ? COLORS.gold : COLORS.white
    const half = size / 2
    const step = size * 0.26

    graphics.clear()

    if (winner)
      graphics.fillStyle(COLORS.gold, 0.25).fillRoundedRect(cx - half - 6, cy - half - 6, size + 12, size + 12, RADIUS.panel)

    graphics.fillStyle(fill, 1).fillRoundedRect(cx - half, cy - half, size, size, RADIUS.panel)
    graphics.fillStyle(COLORS.black, 1)
    PIPS[face].forEach(([dx, dy]) => graphics.fillCircle(cx + dx * step, cy + dy * step, size * 0.08))

  }


  private drawChoice(scene: Phaser.Scene, x: number, y: number, w: number, h: number, number: string, label: string, unit: number, run: () => void): Revealable[] {
    const family = { fontFamily: DIALOG_FONT }
    const button = scene.add.graphics()
    const hit    = scene.add.rectangle(x, y, w, h, COLORS.white, 0).setInteractive({ useHandCursor: true })
    const draw   = (fill: number) => button.clear().fillStyle(fill, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, RADIUS.button).lineStyle(1.5, COLORS.gold, 1).strokeRoundedRect(x - w / 2, y - h / 2, w, h, RADIUS.button)
    const big    = scene.add.text(x, y - h * 0.18, number, { ...textStyle(26 * unit, COLORS.gold), ...family }).setOrigin(0.5)
    const small  = scene.add.text(x, y + h * 0.26, label, { ...textStyle(14 * unit, COLORS.white), ...family }).setOrigin(0.5)

    draw(COLORS.black)
    hit.on('pointerover', () => draw(COLORS.buttonDark))
    hit.on('pointerout', () => draw(COLORS.black))
    hit.on('pointerup', run)
    this.add([button, big, small, hit])

    return [button, big, small, hit]

  }

}
