import * as Phaser from 'phaser'


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


export function hasCardImage(scene: Phaser.Scene, defId: string): boolean {
  return scene.textures.exists(cardTextureKey(defId))

}
