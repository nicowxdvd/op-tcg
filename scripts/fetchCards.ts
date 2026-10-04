import { existsSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import type { ApiCard, StoredCard } from '../src/data/apiTypes.ts'

interface ApiDon {
  card_name: string
  card_image_id: string
  card_image: string | null

}

const BASE_URL   = 'https://optcgapi.com'
const SETS       = ['ST-01', 'ST-02']
const PAUSE_MS   = 500
const CARDS_DIR  = 'public/cards'
const DON_DIR    = 'public/cards/don'
const DATA_DIR   = 'src/data/cards'
const CARD_FIELDS: (keyof ApiCard)[] = ['card_set_id', 'card_name', 'card_type', 'card_color', 'card_cost', 'card_power', 'counter_amount', 'life', 'attribute', 'sub_types', 'card_text', 'card_image']

let lastCall = 0


async function pace(): Promise<void> {
  const wait = lastCall + PAUSE_MS - Date.now()

  if (wait > 0)
    await new Promise(resolve => setTimeout(resolve, wait))

  lastCall = Date.now()

}


async function request(url: string): Promise<Response> {
  await pace()

  const response = await fetch(url)

  if (!response.ok)
    throw new Error(`${url}: HTTP ${response.status}`)

  return response

}


async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  }
  catch (error) {
    console.warn(`Reintentando tras: ${(error as Error).message}`)

    return await run()
  }

}


async function fetchJson<T>(url: string): Promise<T> {
  return withRetry(async () => (await request(url)).json() as Promise<T>)

}


async function fetchSet(set: string): Promise<StoredCard[]> {
  const cards = await fetchJson<(ApiCard & { set_id: string })[]>(`${BASE_URL}/api/decks/${set}/`)

  if (!Array.isArray(cards) || cards.length === 0)
    throw new Error(`${set}: la API no devolvió cartas`)

  const stored = cards.map(card => {
    if (card.set_id !== set)
      throw new Error(`${set}: la carta ${card.card_set_id} pertenece a ${card.set_id}`)

    const picked = Object.fromEntries(CARD_FIELDS.map(field => [field, card[field]])) as unknown as ApiCard

    return { ...picked, image_file: `cards/${card.card_set_id}.jpg` }

  })

  return stored.sort((a, b) => a.card_set_id.localeCompare(b.card_set_id))

}


async function writeJson(path: string, data: unknown): Promise<void> {
  const temp = `${path}.tmp`

  await writeFile(temp, JSON.stringify(data, null, 2) + '\n')
  await rename(temp, path)

}


async function downloadImage(url: string, path: string): Promise<boolean> {
  if (existsSync(path))
    return false

  const buffer = await withRetry(async () => Buffer.from(await (await request(url)).arrayBuffer()))
  const temp   = `${path}.part`

  await writeFile(temp, buffer)
  await rename(temp, path)

  return true

}


async function fetchDons(): Promise<{ id: string; url: string }[]> {
  const dons = await fetchJson<ApiDon[]>(`${BASE_URL}/api/allDonCards/`)

  return dons.filter(don => don.card_image && (don.card_name === 'DON!! Card' || /ST-0[12]/.test(don.card_image))).map(don => ({ id: don.card_image_id, url: don.card_image as string }))

}


async function main(): Promise<void> {
  const bySet: Record<string, StoredCard[]> = {}

  for (const set of SETS)
    bySet[set] = await fetchSet(set)

  const dons = await fetchDons()

  await mkdir(DATA_DIR, { recursive: true })
  await mkdir(DON_DIR, { recursive: true })

  for (const set of SETS)
    await writeJson(`${DATA_DIR}/${set.replace('-', '')}.json`, bySet[set])

  let downloaded = 0

  for (const card of SETS.flatMap(set => bySet[set]))
    if (await downloadImage(card.card_image, `public/${card.image_file}`))
      downloaded++

  for (const don of dons)
    if (await downloadImage(don.url, `${DON_DIR}/${don.id}.jpg`))
      downloaded++

  console.log(`Cartas: ${SETS.map(set => `${set} ${bySet[set].length}`).join(', ')}. DON!!: ${dons.length}. Imágenes nuevas: ${downloaded}`)

}


main().catch(error => {
  console.error(error)
  process.exit(1)

})
