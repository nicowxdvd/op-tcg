import * as Phaser from 'phaser'
import { explainKeyword, findKeywords } from '../learn/keywords'
import type { Rect } from './layout'
import { COLORS, RADIUS, textStyle } from './theme'

interface Word {
  text: string
  keyword: string | null

}

interface Run {
  text: string
  keyword: string | null
  x: number
  y: number

}


function words(cardText: string): Word[] {
  const found = findKeywords(cardText)

  return [...cardText.matchAll(/\S+/g)].map(match => ({ text: match[0], keyword: found.find(item => match.index < item.end && match.index + match[0].length > item.start)?.keyword ?? null }))

}


function flow(items: Word[], width: number, measure: (text: string) => number, space: number, lineHeight: number): Run[] {
  const runs: Run[] = []
  let x = 0
  let y = 0

  for (const item of items) {
    const size = measure(item.text)

    if (x > 0 && x + space + size > width) {
      x = 0
      y += lineHeight
    }

    const last = runs[runs.length - 1]

    if (last && last.y === y && last.keyword === item.keyword) {
      last.text += ` ${item.text}`
      x = last.x + measure(last.text)
      continue
    }

    x += x > 0 ? space : 0
    runs.push({ text: item.text, keyword: item.keyword, x, y })
    x += size
  }

  return runs

}


export class KeywordTooltip extends Phaser.GameObjects.Container {

  private tip: Phaser.GameObjects.Container | null = null
  private area: Rect

  constructor(scene: Phaser.Scene, area: Rect) {
    super(scene, 0, 0)

    this.area = area

  }


  layoutText(cardText: string, x: number, y: number, width: number, font: number): void {
    const probe   = this.scene.add.text(0, 0, '', textStyle(font, COLORS.text, false))
    const measure = (text: string) => probe.setText(text).width
    const space   = measure('a a') - measure('aa')
    const runs    = flow(words(cardText), width, measure, space, font * 1.4)

    probe.destroy()

    for (const run of runs) {
      const label = this.scene.add.text(x + run.x, y + run.y, run.text, textStyle(font, run.keyword ? COLORS.gold : COLORS.text, run.keyword !== null))

      this.add(label)

      if (run.keyword)
        this.wire(label, run.keyword)
    }

  }


  private wire(label: Phaser.GameObjects.Text, keyword: string): void {
    label.setInteractive({ useHandCursor: true })
    label.on('pointerover', () => this.showTip(keyword))
    label.on('pointerout', () => this.hideTip())

  }


  private showTip(keyword: string): void {
    const explanation = explainKeyword(keyword)

    if (!explanation)
      return

    const { area } = this
    const pad      = 6
    const text     = this.scene.add.text(area.x + pad, area.y + pad, explanation, { ...textStyle(Math.max(9, area.w * 0.045), COLORS.white, false), wordWrap: { width: area.w - 2 * pad } })
    const back     = this.scene.add.graphics()

    back.fillStyle(COLORS.dialog, 0.95).fillRoundedRect(area.x, area.y, area.w, text.height + 2 * pad, RADIUS.button)
    back.lineStyle(1.5, COLORS.gold, 0.9).strokeRoundedRect(area.x, area.y, area.w, text.height + 2 * pad, RADIUS.button)

    this.hideTip()
    this.tip = this.scene.add.container(0, 0, [back, text])
    this.add(this.tip)

  }


  private hideTip(): void {
    this.tip?.destroy()
    this.tip = null

  }

}
