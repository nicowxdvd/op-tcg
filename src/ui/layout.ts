export interface Rect {
  x: number
  y: number
  w: number
  h: number

}

export interface Size {
  w: number
  h: number

}

export interface Point {
  x: number
  y: number

}

export interface SideLayout {
  hand: Rect
  life: Rect
  leader: Rect
  stage: Rect
  don: Rect
  deck: Rect
  trash: Rect
  characters: Rect
  slots: Rect[]

}

export interface BoardLayout {
  width: number
  height: number
  card: Size
  handCard: Size
  self: SideLayout
  rival: SideLayout
  status: Rect
  button: Rect
  zoom: Rect

}

export const CARD_RATIO      = 0.72
export const CHARACTER_SLOTS = 5


function selfSide(width: number, height: number, card: Size, handCard: Size): SideLayout {
  const gap   = width * 0.015
  const total = CHARACTER_SLOTS * card.w + (CHARACTER_SLOTS - 1) * gap
  const left  = (width - total) / 2
  const rowY  = height * 0.53
  const backY = height * 0.70
  const slots = Array.from({ length: CHARACTER_SLOTS }, (_, i): Rect => ({ x: left + i * (card.w + gap), y: rowY, w: card.w, h: card.h }))

  return {
    hand: { x: width * 0.10, y: height * 0.865, w: width * 0.80, h: handCard.h },
    life: { x: width * 0.02, y: backY, w: width * 0.10, h: card.h },
    leader: { x: width * 0.14, y: backY, w: card.w, h: card.h },
    stage: { x: width * 0.24, y: backY, w: card.w, h: card.h },
    don: { x: width * 0.34, y: backY, w: width * 0.38, h: card.h },
    deck: { x: width * 0.78, y: backY, w: card.w, h: card.h },
    trash: { x: width * 0.88, y: backY, w: card.w, h: card.h },
    characters: { x: left, y: rowY, w: total, h: card.h },
    slots
  }

}


function mirror(rect: Rect, height: number): Rect {
  return { ...rect, y: height - rect.y - rect.h }

}


function mirrorSide(side: SideLayout, height: number): SideLayout {
  return { hand: mirror(side.hand, height), life: mirror(side.life, height), leader: mirror(side.leader, height), stage: mirror(side.stage, height), don: mirror(side.don, height), deck: mirror(side.deck, height), trash: mirror(side.trash, height), characters: mirror(side.characters, height), slots: side.slots.map(slot => mirror(slot, height)) }

}


export function computeLayout(width: number, height: number): BoardLayout {
  const cardH    = height * 0.15
  const handH    = height * 0.125
  const card     = { w: cardH * CARD_RATIO, h: cardH }
  const handCard = { w: handH * CARD_RATIO, h: handH }
  const self     = selfSide(width, height, card, handCard)

  return {
    width,
    height,
    card,
    handCard,
    self,
    rival: mirrorSide(self, height),
    status: { x: width * 0.02, y: height * 0.475, w: width * 0.40, h: height * 0.05 },
    button: { x: width * 0.44, y: height * 0.475, w: width * 0.12, h: height * 0.05 },
    zoom: { x: width * 0.69, y: height * 0.31, w: width * 0.30, h: height * 0.38 }
  }

}


export function sideRects(side: SideLayout): Rect[] {
  return [side.hand, side.life, side.leader, side.stage, side.don, side.deck, side.trash, ...side.slots]

}


export function allRects(layout: BoardLayout): Rect[] {
  return [...sideRects(layout.self), ...sideRects(layout.rival), layout.status, layout.button, layout.zoom]

}


export function contains(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h

}


export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

}


export function center(rect: Rect): Point {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }

}


export function handSlots(rect: Rect, count: number, card: Size): Rect[] {
  if (count === 0)
    return []

  const natural = card.w * 1.1
  const pitch   = count > 1 ? Math.min(natural, (rect.w - card.w) / (count - 1)) : natural
  const used    = card.w + pitch * (count - 1)
  const left    = rect.x + (rect.w - used) / 2

  return Array.from({ length: count }, (_, i): Rect => ({ x: left + i * pitch, y: rect.y, w: card.w, h: card.h }))

}


export function donRadius(rect: Rect): number {
  return Math.min(rect.h * 0.2, rect.w / 22)

}


export function donSlots(rect: Rect, count: number): Point[] {
  const radius = donRadius(rect)
  const pitch  = (rect.w - 2 * radius) / 9

  return Array.from({ length: count }, (_, i): Point => ({ x: rect.x + radius + i * pitch, y: rect.y + rect.h - radius - 4 }))

}
