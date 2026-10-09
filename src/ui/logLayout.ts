export interface Piece {
  text: string
  chip: boolean
  bold?: boolean

}

export interface Placed {
  text: string
  chip: boolean
  x: number
  row: number
  w: number

}


export function flow(pieces: Piece[], measure: (text: string, bold: boolean) => number, width: number, chipPad = 0): { placed: Placed[]; rows: number } {
  const space  = measure(' ', false)
  const placed: Placed[] = []
  let x   = 0
  let row = 0

  for (const piece of pieces) {
    const tokens = piece.chip ? [piece.text] : piece.text.split(/\s+/).filter(token => token !== '')

    for (const token of tokens) {
      const w = measure(token, piece.bold ?? false) + (piece.chip ? chipPad : 0)

      if (x > 0 && x + w > width) {
        row++
        x = 0
      }

      placed.push({ text: token, chip: piece.chip, x, row, w })
      x += w + space
    }
  }

  return { placed, rows: row + 1 }

}
