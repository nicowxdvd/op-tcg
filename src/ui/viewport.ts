import { MAX_DPR, MIN_SIZE } from './theme'
import type { Size } from './layout'


export function pixelRatio(raw: number): number {
  return Math.min(Math.max(raw || 1, 1), MAX_DPR)

}


export function fitScale(innerWidth: number, innerHeight: number): number {
  return Math.min(1, innerWidth / MIN_SIZE.w, innerHeight / MIN_SIZE.h)

}


export function logicalSize(innerWidth: number, innerHeight: number): Size {
  const scale = fitScale(innerWidth, innerHeight)

  return { w: innerWidth / scale, h: innerHeight / scale }

}


export function needsRotation(innerWidth: number, innerHeight: number): boolean {
  return innerHeight > innerWidth && innerWidth < MIN_SIZE.h

}
