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


  private drawStatus(rect: Rect, header: string): void {
    const font = Math.max(10, Math.round(rect.h * 0.24))
    const row  = rect.y + rect.h * 0.72
    const size = rect.h * 0.3

    this.add(this.scene.add.text(rect.x + rect.w / 2, rect.y + rect.h * 0.25, header, textStyle(font, COLORS.white)).setOrigin(0.5))
    this.box({ x: rect.x + rect.w - size * 1.3, y: rect.y, w: size * 1.3, h: size * 1.1 }, COLORS.buttonDark, 1)
    this.icon('minus', rect.x + rect.w - size * 0.65, rect.y + size * 0.55, size * 0.7)

    const kinds: IconKind[] = ['sound', 'moon', 'gear']

    kinds.forEach((kind, i) => {
      const cx = rect.x + rect.w * (0.55 + i * 0.16)

      this.box({ x: cx - size * 0.8, y: row - size * 0.8, w: size * 1.6, h: size * 1.6 }, COLORS.buttonDark, 1)
      this.icon(kind, cx, row, size)

    })

  }


  private drawBanner(rect: Rect, instruction: Instruction | null): void {
    if (!instruction)
      return

    const font = Math.max(10, Math.round(rect.h * 0.16))
    const pad  = rect.h * 0.12

    this.box(rect, COLORS.crimson, 1)
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

}
