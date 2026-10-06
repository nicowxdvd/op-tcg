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
  panel: Rect
  badge: Rect
  clock: Rect
  hand: Rect
  life: Rect
  leader: Rect
  stage: Rect
  don: Rect
  donDeck: Rect
  deck: Rect
  trash: Rect
  characters: Rect
  slots: Rect[]

}

export interface BoardLayout {
  width: number
  height: number
  content: Rect
  card: Size
  handCard: Size
  self: SideLayout
  rival: SideLayout
  fullscreen: Rect
  status: Rect
  banner: Rect
  log: Rect
  zoom: Rect
  button: Rect
  report: Rect

}

export const CARD_RATIO      = 0.72
export const CHARACTER_SLOTS = 5
export const MAX_ASPECT      = 2
const CARD_UNITS             = 7.45


function rotate(rect: Rect, centerX: number, height: number): Rect {
  return { ...rect, x: 2 * centerX - rect.x - rect.w, y: height - rect.y - rect.h }

}


function selfZones(panel: Rect, card: Size, pad: number) {
  const rows     = (panel.h - 2 * pad - 3 * card.h) / 2
  const y1       = panel.y + pad
  const y2       = y1 + card.h + rows
  const y3       = y2 + card.h + rows
  const right    = panel.x + panel.w - pad
  const life     = { x: panel.x + pad, y: y1, w: card.w * 1.7, h: card.h }
  const start    = life.x + life.w + card.w * 0.3
  const avail    = right - start
  const spacing  = Math.min(card.w * 0.4, (avail - CHARACTER_SLOTS * card.w) / (CHARACTER_SLOTS - 1))
  const total    = CHARACTER_SLOTS * card.w + (CHARACTER_SLOTS - 1) * spacing
  const left     = start + (avail - total) / 2
  const slots    = Array.from({ length: CHARACTER_SLOTS }, (_, i): Rect => ({ x: left + i * (card.w + spacing), y: y1, w: card.w, h: card.h }))
  const donDeck  = { x: panel.x + pad, y: y3, w: card.w, h: card.h }
  const trash    = { x: right - card.w, y: y3, w: card.w, h: card.h }
  const donStart = donDeck.x + card.w * 1.3

  return {
    life,
    leader: { x: panel.x + panel.w * 0.42, y: y2, w: card.w, h: card.h },
    stage: { x: panel.x + panel.w * 0.60, y: y2, w: card.w, h: card.h },
    deck: { x: right - card.w, y: y2, w: card.w, h: card.h },
    don: { x: donStart, y: y3, w: trash.x - card.w * 0.3 - donStart, h: card.h },
    donDeck,
    trash,
    characters: { x: left, y: y1, w: total, h: card.h },
    slots
  }

}


export function computeLayout(width: number, height: number): BoardLayout {
  const cw          = Math.min(width, height * MAX_ASPECT)
  const cx          = (width - cw) / 2
  const margin      = height * 0.015
  const gutter      = cw * 0.17
  const sideW       = cw * 0.20
  const sideX       = cx + cw - margin - sideW
  const panelH      = (height - 2 * margin - height * 0.01) / 2
  const boardX      = cx + gutter
  const boardW      = sideX - margin - boardX
  const pad         = panelH * 0.04
  const cardW       = Math.min(panelH * 0.28 * CARD_RATIO, (boardW - 2 * pad) / CARD_UNITS)
  const card        = { w: cardW, h: cardW / CARD_RATIO }
  const handH       = Math.min(panelH * 0.30, (gutter - 2 * margin) * 0.5 / CARD_RATIO)
  const handCard    = { w: handH * CARD_RATIO, h: handH }
  const selfPanel   = { x: boardX, y: height - margin - panelH, w: boardW, h: panelH }
  const zones       = selfZones(selfPanel, card, pad)
  const centerX     = boardX + boardW / 2
  const turn        = (rect: Rect) => rotate(rect, centerX, height)
  const fullscreen  = { x: cx + margin, y: margin, w: height * 0.05, h: height * 0.05 }
  const badgeW      = gutter - margin
  const badgeH      = height * 0.045
  const clockW      = gutter * 0.45
  const clockH      = height * 0.04
  const rivalBadgeY = fullscreen.y + fullscreen.h + margin / 2
  const selfBadgeY  = selfPanel.y + pad
  const rivalPanel  = turn(selfPanel)
  const self: SideLayout  = { panel: selfPanel, badge: { x: cx + margin, y: selfBadgeY, w: badgeW, h: badgeH }, clock: { x: cx + margin, y: selfBadgeY + badgeH + margin / 2, w: clockW, h: clockH }, hand: { x: cx + margin, y: height - margin - handH, w: gutter - 2 * margin, h: handH }, ...zones }
  const rival: SideLayout = { panel: rivalPanel, badge: { x: cx + margin, y: rivalBadgeY, w: badgeW, h: badgeH }, clock: { x: cx + margin, y: rivalBadgeY + badgeH + margin / 2, w: clockW, h: clockH }, hand: { x: sideX, y: margin, w: sideW, h: handH }, life: turn(zones.life), leader: turn(zones.leader), stage: turn(zones.stage), don: turn(zones.don), donDeck: turn(zones.donDeck), deck: turn(zones.deck), trash: turn(zones.trash), characters: turn(zones.characters), slots: zones.slots.map(turn).reverse() }
  const status      = { x: sideX, y: margin + handH + margin, w: sideW, h: height * 0.07 }
  const banner      = { x: sideX, y: status.y + status.h + margin, w: sideW, h: height * 0.12 }
  const report      = { x: sideX, y: height - margin - height * 0.05, w: sideW, h: height * 0.05 }
  const button      = { x: sideX, y: report.y - margin - height * 0.055, w: sideW, h: height * 0.055 }
  const logY        = banner.y + banner.h + margin
  const log         = { x: sideX, y: logY, w: sideW, h: button.y - margin - logY }
  const zoom        = { x: sideX, y: logY, w: sideW, h: Math.min(log.h, sideW * 0.5) }

  return { width, height, content: { x: cx, y: 0, w: cw, h: height }, card, handCard, self, rival, fullscreen, status, banner, log, zoom, button, report }

}


export function sideRects(side: SideLayout): Rect[] {
  return [side.badge, side.clock, side.hand, side.life, side.leader, side.stage, side.don, side.donDeck, side.deck, side.trash, ...side.slots]

}


export function allRects(layout: BoardLayout): Rect[] {
  return [...sideRects(layout.self), ...sideRects(layout.rival), layout.fullscreen, layout.status, layout.banner, layout.zoom, layout.button, layout.report]

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
