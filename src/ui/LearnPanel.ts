import * as Phaser from 'phaser'
import type { PhaseDescription } from '../learn/describePhase'
import type { Rect } from './layout'
import { COLORS, RADIUS, textStyle } from './theme'

const MIN_FONT = 8


export class LearnPanel extends Phaser.GameObjects.Container {

  constructor(scene: Phaser.Scene, rect: Rect, info: PhaseDescription) {
    super(scene, 0, 0)

    const pad  = Math.max(4, rect.w * 0.03)
    const wrap = { wordWrap: { width: rect.w - 2 * pad } }
    const back = scene.add.graphics()

    back.fillStyle(COLORS.zoneFill, 0.9).fillRoundedRect(rect.x, rect.y, rect.w, rect.h, RADIUS.button)
    back.lineStyle(1.5, COLORS.zoneBorder, 0.9).strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, RADIUS.button)
    this.add(back)

    const title = scene.add.text(rect.x + pad, rect.y + pad, info.title, { ...textStyle(Math.max(10, rect.w * 0.055), COLORS.gold), ...wrap })
    const body  = scene.add.text(rect.x + pad, 0, '', wrap)

    this.add([title, body])
    this.fit(body, title, rect, pad, info, Math.max(MIN_FONT, Math.round(rect.w * 0.043)))

  }


  private fit(body: Phaser.GameObjects.Text, title: Phaser.GameObjects.Text, rect: Rect, pad: number, info: PhaseDescription, start: number): void {
    const text = [info.explanation, ...(info.actions.length ? ['', ...info.actions.map(action => `• ${action}`)] : [])].join('\n')

    for (let font = start; font >= MIN_FONT; font--) {
      body.setStyle({ ...textStyle(font, COLORS.text, false), wordWrap: { width: rect.w - 2 * pad } })
      body.setText(text)
      body.setY(title.y + title.height + pad / 2)

      if (body.y + body.height <= rect.y + rect.h - pad / 2)
        return
    }

  }

}
