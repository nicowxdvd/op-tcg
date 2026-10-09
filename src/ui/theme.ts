export const COLORS = {
  background:   0x070b16,
  panelRival:   0x0f2547,
  panelSelf:    0x1b2433,
  frameRival:   0x2a4a7a,
  frameSelf:    0x3a465a,
  zoneBorder:   0x6f86ad,
  zoneFill:     0x0b1630,
  zoneLabel:    0x7d8fb0,
  gold:         0xf6c026,
  crimson:      0xa3123a,
  crimsonDark:  0x6e1030,
  lifeText:     0xe0405f,
  nameBlue:     0x4db3ff,
  white:        0xffffff,
  black:        0x000000,
  text:         0xe8edf7,
  textDim:      0x8fa0bf,
  buttonDark:   0x2b3345,
  veil:         0x000000,
  dialog:       0x0d111c,
  cardBack:     0x2c2f7a,
  cardBackLine: 0xc9a24a,
  cardBorder:   0x0a0a0a,
  shadow:       0x000000,
  playable:     0x5ec8ff,
  neon:         0xb026ff,
  attack:       0xff5a47,
  activate:     0x5ec8ff,
  rest:         0x1b2b4d,
  indicatorRival: 0x3b82f6,
  indicatorSelf:  0xcbd5e1,
  statGold:     0xffe082
} as const

export const CARD_FACES: Record<string, number> = { Red: 0xc0392b, Green: 0x27ae60, Blue: 0x2980b9, Purple: 0x8e44ad, Black: 0x2c3e50, Yellow: 0xd4ac0d }

export const FONT     = { family: '"Montserrat", "Poppins", "Segoe UI", "Helvetica Neue", Arial, sans-serif', weight: 'bold' } as const
export const RADIUS   = { card: 6, zone: 8, panel: 14, pill: 10, button: 8 } as const
export const SPACING  = { xs: 4, sm: 8, md: 12, lg: 20 } as const
export const SHADOW   = { offset: 3, alpha: 0.45, glow: 0.35 } as const
export const DURATION = { turn: 200, quick: 150, move: 250, hover: 70 } as const
export const MIN_SIZE = { w: 1024, h: 600 } as const
export const MAX_DPR  = 2

export const SERIF_FONT  = '"Fraunces", Georgia, "Times New Roman", serif'
export const DIALOG_FONT = '"Outfit", "Montserrat", "Poppins", "Segoe UI", "Helvetica Neue", Arial, sans-serif'


export function css(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`

}


export function cssAlpha(color: number, alpha: number): string {
  return `${css(color)}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`

}


export function textStyle(size: number, color: number = COLORS.text, bold = true): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONT.family, fontSize: `${Math.round(size)}px`, fontStyle: bold ? FONT.weight : 'normal', color: css(color) }

}


export const LOBBY = { panel: 0x111725, field: 0x131a28, card: 0x121826, border: 0x2a3445, selected: 0x2a2418, gold: 0xe6b955, goldText: 0x1a1406, dim: 0x7d8aa3 } as const
