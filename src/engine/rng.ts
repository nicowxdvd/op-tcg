export interface Rolled {
  value: number
  seed: number

}

export interface Shuffled<T> {
  items: T[]
  seed: number

}

export function next(seed: number): Rolled {
  const a = (seed + 0x6D2B79F5) | 0
  let t   = Math.imul(a ^ (a >>> 15), 1 | a)
  t       = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: a }

}


export function nextInt(seed: number, max: number): Rolled {
  const rolled = next(seed)

  return { value: Math.floor(rolled.value * max), seed: rolled.seed }

}


export function shuffle<T>(items: readonly T[], seed: number): Shuffled<T> {
  const result = [...items]
  let current  = seed

  for (let i = result.length - 1; i > 0; i--) {
    const rolled  = nextInt(current, i + 1)
    const j       = rolled.value
    const swapped = result[i]
    current       = rolled.seed
    result[i]     = result[j]
    result[j]     = swapped
  }

  return { items: result, seed: current }

}
