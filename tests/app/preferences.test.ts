import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFERENCES, PREFERENCES_KEY, loadPreferences, savePreferences } from '../../src/app/preferences'
import type { PreferencesStorage } from '../../src/app/preferences'

function memoryStorage(initial?: string): PreferencesStorage & { value: string | null } {
  const storage = { value: initial ?? null, getItem: () => storage.value, setItem: (_key: string, value: string) => { storage.value = value } }

  return storage

}


const BROKEN: PreferencesStorage = { getItem: () => { throw new Error('bloqueado') }, setItem: () => { throw new Error('bloqueado') } }

describe('preferences', () => {
  it('con localStorage vacío usa los valores por defecto', () => {
    expect(loadPreferences(memoryStorage())).toEqual(DEFAULT_PREFERENCES)

  })


  it('sin localStorage usa los valores por defecto', () => {
    expect(loadPreferences(null)).toEqual(DEFAULT_PREFERENCES)

  })


  it('con localStorage no disponible no lanza', () => {
    expect(loadPreferences(BROKEN)).toEqual(DEFAULT_PREFERENCES)
    expect(() => savePreferences(DEFAULT_PREFERENCES, BROKEN)).not.toThrow()
    expect(() => savePreferences(DEFAULT_PREFERENCES, null)).not.toThrow()

  })


  it('con JSON corrupto usa los valores por defecto', () => {
    expect(loadPreferences(memoryStorage('{no es json'))).toEqual(DEFAULT_PREFERENCES)

  })


  it('con campos de tipo incorrecto usa el valor por defecto de cada uno', () => {
    const storage = memoryStorage(JSON.stringify({ volume: 'alto', muted: true, learnPanel: 1 }))

    expect(loadPreferences(storage)).toEqual({ ...DEFAULT_PREFERENCES, muted: true })

  })


  it('limita el volumen entre 0 y 1', () => {
    expect(loadPreferences(memoryStorage(JSON.stringify({ volume: 5 }))).volume).toBe(1)
    expect(loadPreferences(memoryStorage(JSON.stringify({ volume: -2 }))).volume).toBe(0)

  })


  it('guarda y restaura las preferencias', () => {
    const storage     = memoryStorage()
    const preferences = { volume: 0.2, muted: true, learnPanel: false }

    savePreferences(preferences, storage)

    expect(storage.value).toBe(JSON.stringify(preferences))
    expect(loadPreferences(storage)).toEqual(preferences)
    expect(PREFERENCES_KEY).toBe('tcg.preferences')

  })

})
