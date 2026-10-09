import * as Phaser from 'phaser'
import { drawIcon } from './icons'
import type { IconKind } from './icons'
import type { Instruction } from './instructions'
import type { PhaseDescription } from '../learn/describePhase'
import type { BoardLayout, LearnLayout, Rect } from './layout'
import { LearnPanel } from './LearnPanel'
import { COLORS, RADIUS, textStyle } from './theme'

export interface SideData {
  header: string
  banner: Instruction | null
  notice: string | null
  log: string[]
  learn: LearnLayout
  info: PhaseDescription | null
  onToggleLearn: () => void
  onFullscreen: () => void

}


export class SidePanel extends Phaser.GameObjects.Container {

  constructor(scene: Phaser.Scene, layout: BoardLayout, data: SideData) {
    super(scene, 0, 0)

    this.drawFullscreen(layout.fullscreen, data.onFullscreen)
    this.drawStatus(layout.status, data.header)
    this.drawBanner(layout.banner, data.notice ? { title: 'AVISO', text: data.notice } : data.banner)
    this.drawToggle(data.learn.toggle, data.info !== null, data.onToggleLearn)

    if (data.learn.learn && data.info)
      this.add(new LearnPanel(this.scene, data.learn.learn, data.info))

    this.drawLog(data.learn.log, data.log)
    this.drawReport(layout.report)
    this.drawConcede(layout.concede)

  }


  private box(rect: Rect, fill: number, alpha: number, border?: number): void {
    const graphics = this.scene.add.graphics()

    graphics.fillStyle(fill, alpha).fillRoundedRect(rect.x, rect.y, rect.w, rect.h, RADIUS.button)

    if (border !== undefined)
      graphics.lineStyle(1.5, border, 0.9).strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, RADIUS.button)

    this.add(graphics)

  }


  private icon(kind: IconKind, cx: number, cy: number, size: number, color: number = COLORS.text): void {
    const graphics = this.scene.add.graphics()

    drawIcon(graphics, kind, cx, cy, size, color)
    this.add(graphics)

  }


  private drawFullscreen(rect: Rect, run: () => void): void {
    this.box(rect, COLORS.zoneFill, 1, COLORS.zoneBorder)
    this.icon('fullscreen', rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w * 0.5)

    const hit = this.scene.add.rectangle(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w, rect.h, COLORS.white, 0).setInteractive({ useHandCursor: true })

    hit.on('pointerup', run)
    this.add(hit)

  }


  private pill(rect: Rect, label: string, color: number = COLORS.text, fill: number = COLORS.pill, border: number = COLORS.zoneBorder, ratio = 0.46): void {
    this.box(rect, fill, 1, border)
    this.add(this.scene.add.text(rect.x + rect.w / 2, rect.y + rect.h / 2, label, textStyle(Math.max(8, Math.round(rect.h * ratio)), color)).setOrigin(0.5))

  }


  private drawStatus(rect: Rect, header: string): void {
    const rows = rect.h / 3
    const high = rows * 0.82
    const row  = (index: number) => rect.y + rows * index + (rows - high) / 2
    const btn  = high * 1.1

    this.pill({ x: rect.x, y: row(0), w: rect.w * 0.2, h: high }, '← Salir')
    const title = this.scene.add.text(rect.x + rect.w * 0.43, row(0) + high / 2, header, textStyle(Math.max(10, Math.round(high * 0.5)), COLORS.white)).setOrigin(0.5)

    while (title.width > rect.w * 0.44 && title.text.length > 3)
      title.setText(`${title.text.slice(0, -2)}…`)

    this.add(title)
    this.pill({ x: rect.x + rect.w * 0.66, y: row(0) + high * 0.12, w: rect.w * 0.17, h: high * 0.76 }, 'BETA', COLORS.gold, COLORS.pill, COLORS.gold)
    this.box({ x: rect.x + rect.w - btn, y: row(0), w: btn, h: high }, COLORS.buttonDark, 1)
    this.icon('minus', rect.x + rect.w - btn / 2, row(0) + high / 2, high * 0.6)
    this.pill({ x: rect.x, y: row(1), w: rect.w * 0.26, h: high }, 'Reiniciar')

    const kinds: IconKind[] = ['sound', 'moon']

    kinds.forEach((kind, i) => {
      const left = rect.x + i * (btn + 4)

      this.box({ x: left, y: row(2), w: btn, h: high }, COLORS.buttonDark, 1)
      this.icon(kind, left + btn / 2, row(2) + high / 2, high * 0.6)

    })

    const gearLeft = rect.x + rect.w - btn
    const pills    = rect.x + 2 * (btn + 4)
    const room     = gearLeft - 4 - pills

    this.pill({ x: pills, y: row(2), w: room * 0.48, h: high }, 'Normal')
    this.pill({ x: pills + room * 0.52, y: row(2), w: room * 0.48, h: high }, '✓ Asistido')
    this.box({ x: gearLeft, y: row(2), w: btn, h: high }, COLORS.buttonDark, 1)
    this.icon('gear', gearLeft + btn / 2, row(2) + high / 2, high * 0.6)

  }


  private drawBanner(rect: Rect, instruction: Instruction | null): void {
    if (!instruction)
      return

    const font = Math.max(10, Math.round(rect.h * 0.16))
    const pad  = rect.h * 0.12

    this.box(rect, COLORS.banner, 1)
    this.add(this.scene.add.text(rect.x + pad, rect.y + pad, instruction.title, textStyle(font * 0.8, COLORS.text)).setAlpha(0.85))
    this.add(this.scene.add.text(rect.x + pad, rect.y + pad + font * 1.4, instruction.text, { ...textStyle(font, COLORS.white), wordWrap: { width: rect.w - 2 * pad } }))

  }


  private drawToggle(rect: Rect, on: boolean, run: () => void): void {
    const font = Math.max(9, Math.round(rect.h * 0.5))

    this.box(rect, on ? COLORS.crimsonDark : COLORS.buttonDark, 1, COLORS.zoneBorder)
    this.add(this.scene.add.text(rect.x + rect.w / 2, rect.y + rect.h / 2, on ? 'Modo aprendizaje: sí' : 'Modo aprendizaje: no', textStyle(font, COLORS.white)).setOrigin(0.5))

    const hit = this.scene.add.rectangle(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w, rect.h, COLORS.white, 0).setInteractive({ useHandCursor: true })

    hit.on('pointerup', run)
    this.add(hit)

  }


  private drawLog(rect: Rect, lines: string[]): void {
    const font = Math.max(9, Math.round(rect.w * 0.05))
    const text = this.scene.add.text(rect.x + 2, rect.y + 2, lines.join('\n'), { ...textStyle(font, COLORS.text, false), wordWrap: { width: rect.w - 4 }, lineSpacing: font * 0.5 })
    let shown  = lines

    while (text.height > rect.h && shown.length > 1) {
      shown = shown.slice(1)
      text.setText(shown.join('\n'))
    }

    this.add(text)

  }


  private drawReport(rect: Rect): void {
    const font = Math.max(9, Math.round(rect.h * 0.28))

    this.box(rect, COLORS.crimsonDark, 0.25, COLORS.crimson)
    this.icon('bug', rect.x + rect.w * 0.12, rect.y + rect.h / 2, rect.h * 0.4, COLORS.lifeText)
    this.add(this.scene.add.text(rect.x + rect.w * 0.2, rect.y + rect.h / 2, '¿Algo salió mal? Reportar un problema', { ...textStyle(font, COLORS.lifeText), wordWrap: { width: rect.w * 0.76 } }).setOrigin(0, 0.5))

  }


  private drawConcede(rect: Rect): void {
    this.pill(rect, 'Conceder', COLORS.textDim, COLORS.background, COLORS.zoneLabel, 0.3)

  }

}
