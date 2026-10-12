import type { EffectRegistry } from '../../types'
import { OP15 } from './OP15'
import { OP17 } from './OP17'
import { ST01 } from './ST01'
import { ST02 } from './ST02'
import { ST14 } from './ST14'

export const effectRegistry: EffectRegistry = { ...ST01, ...ST02, ...OP15, ...OP17, ...ST14 }
