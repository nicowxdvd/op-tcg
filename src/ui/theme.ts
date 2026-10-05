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
  text:         0xe8edf7,
  textDim:      0x8fa0bf,
  buttonDark:   0x2b3345,
  veil:         0x000000,
  dialog:       0x0d111c,
  cardBack:     0x2c2f7a,
  cardBackLine: 0xc9a24a,
  cardBorder:   0x0a0a0a,
  shadow:       0x000000,
  playable:     0xf6c026,
  attack:       0xff5a47,
  activate:     0x4dd0e1,
  rest:         0x1b2b4d
} as const

export const FONT     = { family: '"Montserrat", "Poppins", "Segoe UI", "Helvetica Neue", Arial, sans-serif', weight: 'bold' } as const
export const RADIUS   = { card: 6, zone: 8, panel: 14, pill: 10, button: 8 } as const
export const SPACING  = { xs: 4, sm: 8, md: 12, lg: 20 } as const
export const SHADOW   = { offset: 3, alpha: 0.45, glow: 0.35 } as const
export const DURATION = { turn: 200, quick: 150, move: 250 } as const
export const MIN_SIZE = { w: 1024, h: 600 } as const
export const MAX_DPR  = 2


export function css(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`

}


export function textStyle(size: number, color: number = COLORS.text, bold = true): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONT.family, fontSize: `${Math.round(size)}px`, fontStyle: bold ? FONT.weight : 'normal', color: css(color) }

}
