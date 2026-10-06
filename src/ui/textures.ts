import * as Phaser from 'phaser'
import { COLORS, css, FONT } from './theme'
import { pixelRatio } from './viewport'

const SMALL_HEIGHT = 420
const SMALL_WIDTH  = 301

export const BACK_KEY = 'card-back'
export const DON_KEY  = 'don-card'
const DON_FILE        = 'cards/don/don_3.jpg'


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


export async function findDonImage(): Promise<string | null> {
  try {
    const response = await fetch(DON_FILE, { method: 'HEAD' })

    return response.ok && (response.headers.get('content-type') ?? '').startsWith('image/') ? DON_FILE : null
  }
  catch {
    return null
  }

}


export function preloadDonImage(scene: Phaser.Scene, file: string | null): void {
  if (file)
    scene.load.image(DON_KEY, file)

}


export function hasDonImage(scene: Phaser.Scene): boolean {
  return scene.textures.exists(DON_KEY)

}


export function buildCardBack(scene: Phaser.Scene): void {
  if (scene.textures.exists(BACK_KEY))
    return

  const w       = 420
  const h       = 588
  const canvas  = scene.textures.createCanvas(BACK_KEY, w, h)
  const context = canvas?.getContext()

  if (!canvas || !context)
    return

  const gold = css(COLORS.cardBackLine)
  const cx   = w / 2
  const cy   = h * 0.44

  context.fillStyle = css(COLORS.cardBack)
  context.fillRect(0, 0, w, h)
  context.strokeStyle = 'rgba(201,162,74,0.25)'
  context.lineWidth   = 2

  for (let i = -h; i < w; i += 36) {
    context.beginPath()
    context.moveTo(i, 0)
    context.lineTo(i + h, h)
    context.stroke()

  }

  context.strokeStyle = gold
  context.lineWidth   = 5
  context.beginPath()
  context.arc(cx, cy, w * 0.3, 0, Math.PI * 2)
  context.stroke()
  context.lineWidth = 3
  context.beginPath()
  context.arc(cx, cy, w * 0.23, 0, Math.PI * 2)
  context.stroke()

  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4 + Math.PI / 8
    const reach = i % 2 === 0 ? w * 0.3 : w * 0.22

    context.fillStyle = gold
    context.beginPath()
    context.moveTo(cx + Math.cos(angle - 0.12) * w * 0.04, cy + Math.sin(angle - 0.12) * w * 0.04)
    context.lineTo(cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach)
    context.lineTo(cx + Math.cos(angle + 0.12) * w * 0.04, cy + Math.sin(angle + 0.12) * w * 0.04)
    context.closePath()
    context.fill()

  }

  context.fillStyle    = css(COLORS.white)
  context.textAlign    = 'center'
  context.font         = `${FONT.weight} ${Math.round(w * 0.12)}px ${FONT.family}`
  context.fillText('ONE PIECE', cx, h * 0.84)
  context.font         = `${FONT.weight} ${Math.round(w * 0.055)}px ${FONT.family}`
  context.fillStyle    = gold
  context.fillText('CARD GAME', cx, h * 0.89)
  canvas.refresh()

}
