import * as Phaser from 'phaser'
import { pixelRatio } from './viewport'

const SMALL_HEIGHT = 420
const SMALL_WIDTH  = 301


export function cardTextureKey(defId: string): string {
  return `card-${defId}`

}


async function imageExists(defId: string): Promise<boolean> {
  try {
    const response = await fetch(`cards/${defId}.jpg`, { method: 'HEAD' })

    return response.ok && (response.headers.get('content-type') ?? '').startsWith('image/')
  }
  catch {
    return false
  }

}


export async function findCardImages(defIds: string[]): Promise<string[]> {
  const found = await Promise.all(defIds.map(async id => await imageExists(id) ? id : null))

  return found.filter((id): id is string => id !== null)

}


export function preloadCardImages(scene: Phaser.Scene, defIds: string[]): void {
  for (const id of defIds)
    scene.load.image(cardTextureKey(id), `cards/${id}.jpg`)

}


export function smallTextureKey(defId: string): string {
  return `${cardTextureKey(defId)}-small`

}


export function buildSmallCards(scene: Phaser.Scene, defIds: string[]): void {
  for (const id of defIds) {
    const source = scene.textures.get(cardTextureKey(id)).getSourceImage() as CanvasImageSource

    if (scene.textures.exists(smallTextureKey(id)))
      continue

    const canvas  = scene.textures.createCanvas(smallTextureKey(id), SMALL_WIDTH, SMALL_HEIGHT)
    const context = canvas?.getContext()

    if (!canvas || !context)
      continue

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(source, 0, 0, SMALL_WIDTH, SMALL_HEIGHT)
    canvas.refresh()

  }

}


export function bestTextureKey(scene: Phaser.Scene, defId: string, displayHeight: number): string {
  const small = smallTextureKey(defId)

  return scene.textures.exists(small) && displayHeight * pixelRatio(window.devicePixelRatio) <= SMALL_HEIGHT ? small : cardTextureKey(defId)

}


export function hasCardImage(scene: Phaser.Scene, defId: string): boolean {
  return scene.textures.exists(cardTextureKey(defId))

}
