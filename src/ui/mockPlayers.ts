import { COLORS } from './theme'

export interface MockPlayer {
  name: string
  flag: string
  indicator: number
  clock: string
}

export const MOCK_RIVAL: MockPlayer = { name: 'HAYAKAWAKAJIO10', flag: '🇸🇪', indicator: COLORS.indicatorRival, clock: '17:30' }
export const MOCK_SELF: MockPlayer  = { name: 'TÚ', flag: '🇨🇱', indicator: COLORS.indicatorSelf, clock: '17:30' }
export const MOCK_COUNTER_CLOCK     = '00:30'
export const MOCK_LOG: string[]     = ['Partida creada. Resuelvan el mulligan.', 'Tú ganó el sorteo y juega segundo', 'Tú jugó una carta', 'Hayakawakajio10 se quedó']
