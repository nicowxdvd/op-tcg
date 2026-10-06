import * as Phaser from 'phaser'
import type { GameEvent, PlayerId } from '../engine'
import { CardSprite } from './CardSprite'
import { center } from './layout'
import type { Point } from './layout'
import { COLORS, DURATION } from './theme'

export interface AnimationContext {
  sprites: Map<string, CardSprite>
  deckOf: (player: PlayerId) => Point
  leaderOf: (player: PlayerId) => string

}


export function collectSprites(root: Phaser.GameObjects.Container): Map<string, CardSprite> {
  const found = new Map<string, CardSprite>()
  const visit = (container: Phaser.GameObjects.Container) => {
    for (const child of container.list) {
      if (child instanceof CardSprite && child.instanceId)
        found.set(child.instanceId, child)
      else if (child instanceof Phaser.GameObjects.Container)
        visit(child)
    }
  }

  visit(root)

  return found

}


export function playEvents(scene: Phaser.Scene, events: GameEvent[], context: AnimationContext): void {
  const { sprites } = context
  const lookup      = (id: string, player?: PlayerId) => sprites.get(id === 'leader' && player ? context.leaderOf(player) : id)

  for (const event of events) {
    switch (event.type) {
      case 'CardDrawn': {
        const sprite = sprites.get(event.instanceId)
        const from   = context.deckOf(event.player)

        if (sprite) {
          const { x, y } = sprite

          sprite.setPosition(from.x, from.y)
          scene.tweens.add({ targets: sprite, x, y, duration: DURATION.move, ease: 'Cubic.easeOut' })

        }

        break
      }
      case 'CharacterPlayed':
      case 'StagePlayed': {
        const sprite = sprites.get(event.instanceId)

        if (sprite)
          scene.tweens.add({ targets: sprite, scale: { from: 0.6, to: 1 }, alpha: { from: 0.4, to: 1 }, duration: DURATION.quick, ease: 'Back.easeOut' })

        break
      }
      case 'CharacterRested': {
        const sprite = sprites.get(event.target)

        if (sprite && sprite.angle === 90) {
          sprite.setAngle(0)
          scene.tweens.add({ targets: sprite, angle: 90, duration: DURATION.quick })

        }

        break
      }
      case 'AttackDeclared': {
        const attacker = lookup(event.attacker, event.player)
        const target   = lookup(event.target, event.player === 'p1' ? 'p2' : 'p1')

        if (attacker && target) {
          const { x, y } = attacker

          scene.tweens.add({ targets: attacker, x: x + (target.x - x) * 0.35, y: y + (target.y - y) * 0.35, duration: DURATION.quick, yoyo: true, ease: 'Quad.easeOut' })

        }

        break
      }
      case 'LifeTaken':
      case 'LifeBanished':
        lookup('leader', event.player)?.flash(COLORS.attack)

        break
      default:
        break
    }
  }

}
