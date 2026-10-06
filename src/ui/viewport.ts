import { MAX_DPR, MIN_SIZE } from './theme'
import type { Size } from './layout'


export function pixelRatio(raw: number): number {
  return Math.min(Math.max(raw || 1, 1), MAX_DPR)

}


export function logicalSize(innerWidth: number, innerHeight: number): Size {
  return { w: Math.max(innerWidth, MIN_SIZE.w), h: Math.max(innerHeight, MIN_SIZE.h) }

}
