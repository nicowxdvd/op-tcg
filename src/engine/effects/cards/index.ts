import type { EffectRegistry } from '../../types'
import { ST01 } from './ST01'
import { ST02 } from './ST02'

export const effectRegistry: EffectRegistry = { ...ST01, ...ST02 }
