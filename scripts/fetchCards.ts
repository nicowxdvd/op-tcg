import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import type { ApiCard, DeckFile, StoredCard } from '../src/data/apiTypes.ts'

interface ApiDon {
  card_name: string
  card_image_id: string
  card_image: string | null

}

const BASE_URL    = 'https://optcgapi.com'
const SETS        = ['ST-01', 'ST-02']
const EXTRA_DECKS = ['xebec', 'luffy']
const PAUSE_MS    = 500
const CARDS_DIR   = 'public/cards'
const DON_DIR     = 'public/cards/don'
const DATA_DIR    = 'src/data/cards'
const DECKS_DIR   = 'src/data/decks'
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


function pickFields(card: ApiCard): ApiCard {
  return Object.fromEntries(CARD_FIELDS.map(field => [field, card[field]])) as unknown as ApiCard

}


async function fetchSet(set: string): Promise<StoredCard[]> {
  const cards = await fetchJson<(ApiCard & { set_id: string })[]>(`${BASE_URL}/api/decks/${set}/`)

  if (!Array.isArray(cards) || cards.length === 0)
    throw new Error(`${set}: la API no devolvió cartas`)

  const stored = cards.map(card => {
    if (card.set_id !== set)
      throw new Error(`${set}: la carta ${card.card_set_id} pertenece a ${card.set_id}`)

    return { ...pickFields(card), image_file: `cards/${card.card_set_id}.jpg` }

  })

  return stored.sort((a, b) => a.card_set_id.localeCompare(b.card_set_id))

}


async function fetchBase(id: string): Promise<ApiCard | undefined> {
  const prefix = id.split('-')[0]
  const rows   = await fetchJson<(ApiCard & { card_image_id: string })[]>(`${BASE_URL}/api/sets/card/${id}/`)
  const base   = Array.isArray(rows) ? rows.find(row => row.card_image_id === id) : undefined

  if (base || !/^ST\d+$/.test(prefix))
    return base

  const starter = await fetchJson<ApiCard[]>(`${BASE_URL}/api/decks/${prefix.replace(/^ST/, 'ST-')}/`)

  return starter.find(row => row.card_set_id === id)

}


async function fetchCard(id: string): Promise<StoredCard> {
  const base = await fetchBase(id)

  if (!base)
    throw new Error(`${id}: la API no devolvió la carta base`)

  return { ...pickFields(base), image_file: `cards/${id}.jpg` }

}


async function extraIdsBySet(): Promise<Record<string, string[]>> {
  const ids = new Set<string>()

  for (const name of EXTRA_DECKS) {
    const deck = JSON.parse(await readFile(`${DECKS_DIR}/${name}.json`, 'utf8')) as DeckFile

    ids.add(deck.leader)
    deck.cards.forEach(card => ids.add(card.id))

  }

  const bySet: Record<string, string[]> = {}

  for (const id of [...ids].sort())
    bySet[id.split('-')[0]] = [...(bySet[id.split('-')[0]] ?? []), id]

  return bySet

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
  const files: Record<string, StoredCard[]> = {}

  for (const set of SETS)
    files[set.replace('-', '')] = await fetchSet(set)

  for (const [set, ids] of Object.entries(await extraIdsBySet())) {
    files[set] = []

    for (const id of ids)
      files[set].push(await fetchCard(id))

  }

  const dons = await fetchDons()

  await mkdir(DATA_DIR, { recursive: true })
  await mkdir(DON_DIR, { recursive: true })

  for (const [name, cards] of Object.entries(files))
    await writeJson(`${DATA_DIR}/${name}.json`, cards)

  let downloaded = 0

  for (const card of Object.values(files).flat())
    if (await downloadImage(card.card_image, `public/${card.image_file}`))
      downloaded++

  for (const don of dons)
    if (await downloadImage(don.url, `${DON_DIR}/${don.id}.jpg`))
      downloaded++

  console.log(`Cartas: ${Object.entries(files).map(([name, cards]) => `${name} ${cards.length}`).join(', ')}. DON!!: ${dons.length}. Imágenes nuevas: ${downloaded}`)

}


main().catch(error => {
  console.error(error)
  process.exit(1)

})
