export interface Preferences {
  volume: number
  muted: boolean
  learnPanel: boolean

}


export type PreferencesStorage = Pick<Storage, 'getItem' | 'setItem'>


export const PREFERENCES_KEY = 'tcg.preferences'

export const DEFAULT_PREFERENCES: Preferences = { volume: 0.5, muted: false, learnPanel: true }


function defaultStorage(): PreferencesStorage | null {
  try {
    return globalThis.localStorage ?? null
  }
  catch {
    return null
  }

}


function sanitize(raw: unknown): Preferences {
  const data = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {}
  const { volume, muted, learnPanel } = data

  return {
    volume    : typeof volume === 'number' && Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : DEFAULT_PREFERENCES.volume,
    muted     : typeof muted === 'boolean' ? muted : DEFAULT_PREFERENCES.muted,
    learnPanel: typeof learnPanel === 'boolean' ? learnPanel : DEFAULT_PREFERENCES.learnPanel,
  }

}


export function loadPreferences(storage: PreferencesStorage | null = defaultStorage()): Preferences {
  try {
    const text = storage?.getItem(PREFERENCES_KEY)

    return sanitize(text ? JSON.parse(text) : null)
  }
  catch {
    return { ...DEFAULT_PREFERENCES }
  }

}


export function savePreferences(preferences: Preferences, storage: PreferencesStorage | null = defaultStorage()): void {
  try {
    storage?.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
  }
  catch {
    return
  }

}
