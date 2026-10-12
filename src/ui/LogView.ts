import * as Phaser from 'phaser'
import type { LogEntry, SegmentKind } from '../learn/logEntry'
import { drawIcon } from './icons'
import type { Rect } from './layout'
import { flow } from './logLayout'
import type { Piece, Placed } from './logLayout'
import { COLORS, FONT, textStyle } from './theme'

const TEXT_COLORS: Record<SegmentKind, number> = { actor: COLORS.nameBlue, self: COLORS.gold, card: COLORS.gold, timing: COLORS.white, dim: COLORS.textDim, text: COLORS.text }

interface Laid {
  entry: LogEntry
  placed: Placed[]
  kinds: SegmentKind[]
  rows: number

}


export class LogView extends Phaser.GameObjects.Container {

  constructor(scene: Phaser.Scene, rect: Rect, entries: LogEntry[]) {
    super(scene, 0, 0)

    const font   = Math.max(9, Math.round(rect.w * 0.04))
    const rowH   = font * 1.8
    const gap    = font * 0.35
    const indent = font * 1.6
    const pad    = font * 0.45
    const probe  = scene.add.text(0, 0, '', textStyle(font, COLORS.text, false))
    const measure = (value: string, bold: boolean) => {
      probe.setFontStyle(bold ? 'bold' : 'normal').setText(value)

      return probe.width

    }
    const laid = entries.map((entry): Laid => {
      if (entry.kind === 'turn')
        return { entry, placed: [], kinds: [], rows: 1 }

      const pieces: Piece[] = entry.segments.map(segment => ({ text: segment.text, chip: segment.kind === 'card' || segment.kind === 'timing', bold: segment.kind === 'actor' || segment.kind === 'self' }))
      const flowed          = flow(pieces, measure, rect.w - indent - 4, pad * 2)
      const kinds: SegmentKind[] = []

      entry.segments.forEach((segment, i) => {
        const count = pieces[i].chip ? 1 : segment.text.split(/\s+/).filter(token => token !== '').length

        for (let n = 0; n < count; n++)
          kinds.push(segment.kind)

      })

      return { entry, placed: flowed.placed, kinds, rows: flowed.rows }
    })

    probe.destroy()

    const heightOf = (item: Laid) => item.rows * rowH + gap
    let total = 0
    let from  = laid.length

    while (from > 0 && total + heightOf(laid[from - 1]) <= rect.h)
      total += heightOf(laid[--from])

    let y = rect.y

    for (const item of laid.slice(from)) {
      this.drawEntry(rect, item, y, { font, rowH, indent, pad })
      y += heightOf(item)
    }

  }


  private drawEntry(rect: Rect, item: Laid, y: number, size: { font: number; rowH: number; indent: number; pad: number }): void {
    const { font, rowH, indent, pad } = size
    const back = this.scene.add.graphics()

    this.add(back)

    if (item.entry.kind === 'turn') {
      back.fillStyle(COLORS.gold, 1).fillRoundedRect(rect.x, y, rect.w, rowH, 5)
      this.add(this.scene.add.text(rect.x + rect.w / 2, y + rowH / 2, item.entry.text, { ...textStyle(font, COLORS.dialog), fontStyle: FONT.black }).setOrigin(0.5))

      return
    }

    drawIcon(back, item.entry.icon, rect.x + font * 0.7, y + rowH / 2, font * 0.9, COLORS.textDim)

    item.placed.forEach((piece, i) => {
      const kind = item.kinds[i]
      const x    = rect.x + indent + piece.x
      const top  = y + piece.row * rowH

      if (piece.chip) {
        const fill = kind === 'timing' ? COLORS.timing : COLORS.buttonDark

        back.fillStyle(fill, 1).fillRoundedRect(x, top + rowH * 0.12, piece.w, rowH * 0.76, 4)

      }

      this.add(this.scene.add.text(x + (piece.chip ? pad : 0), top + rowH / 2, piece.text, textStyle(font, TEXT_COLORS[kind], kind === 'actor' || kind === 'self')).setOrigin(0, 0.5))

    })

  }

}
