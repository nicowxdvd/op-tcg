import { describe, expect, it } from 'vitest'
import { cardFromApi, keywordsFromText } from '../../src/data/convert'
import type { ApiCard } from '../../src/data/apiTypes'

function api(overrides: Partial<ApiCard> = {}): ApiCard {
  return { card_set_id: 'ST01-006', card_name: 'Tony Tony.Chopper', card_type: 'Character', card_color: 'Red', card_cost: '1', card_power: '1000', counter_amount: 0, life: null, attribute: 'Strike', sub_types: 'Animal', card_text: null, card_image: 'https://example.com/ST01-006.jpg', ...overrides }

}


describe('cardFromApi', () => {
  it('convierte un Leader con life y sin costo', () => {
    const def = cardFromApi(api({ card_set_id: 'ST01-001', card_type: 'Leader', card_cost: null, card_power: '5000', life: '5' }))

    expect(def).toMatchObject({ id: 'ST01-001', type: 'Leader', cost: 0, power: 5000, life: 5, counter: 0 })

  })


  it('convierte un Character con counter', () => {
    const def = cardFromApi(api({ card_cost: '3', card_power: '5000', counter_amount: 1000 }))

    expect(def).toEqual({ id: 'ST01-006', name: 'Tony Tony.Chopper', type: 'Character', cost: 3, power: 5000, counter: 1000, life: 0, colors: ['Red'], keywords: [], traits: 'Animal' })

  })


  it('conserva los tipos (sub_types) como texto, o vacío si faltan', () => {
    expect(cardFromApi(api({ sub_types: 'Straw Hat Crew Supernovas' })).traits).toBe('Straw Hat Crew Supernovas')
    expect(cardFromApi(api({ sub_types: null })).traits).toBe('')

  })


  it('convierte un Event con power null a 0', () => {
    const def = cardFromApi(api({ card_type: 'Event', card_power: null, counter_amount: null }))

    expect(def).toMatchObject({ type: 'Event', power: 0, counter: 0 })

  })


  it('convierte un Stage con power "NULL" a 0', () => {
    const def = cardFromApi(api({ card_type: 'Stage', card_power: 'NULL' }))

    expect(def).toMatchObject({ type: 'Stage', power: 0 })

  })


  it('separa dos colores por /', () => {
    expect(cardFromApi(api({ card_color: 'Red/Green' })).colors).toEqual(['Red', 'Green'])

  })


  it('falla con un type desconocido e incluye el id', () => {
    expect(() => cardFromApi(api({ card_type: 'DON!!' }))).toThrow('ST01-006')

  })


  it('falla con un campo numérico inválido e incluye el id', () => {
    expect(() => cardFromApi(api({ card_cost: 'abc' }))).toThrow('ST01-006')

  })

})


describe('keywordsFromText', () => {
  it('deduce Blocker', () => {
    expect(keywordsFromText('[Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)')).toEqual(['Blocker'])

  })


  it('deduce Rush y sigue con el texto de efecto', () => {
    expect(keywordsFromText('[Rush] (This card can attack on the turn in which it is played.) [DON!! x2] [When Attacking] Your opponent cannot activate a [Blocker] Character.')).toEqual(['Rush'])

  })


  it('deduce Double Attack', () => {
    expect(keywordsFromText('[Double Attack] (This card deals 2 damage.)')).toEqual(['DoubleAttack'])

  })


  it('deduce Banish', () => {
    expect(keywordsFromText('[Banish] (When this card deals damage, the target card is trashed without activating its Trigger.)')).toEqual(['Banish'])

  })


  it('deduce varios keywords seguidos', () => {
    expect(keywordsFromText('[Rush] (This card can attack on the turn in which it is played.) [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)')).toEqual(['Rush', 'Blocker'])

  })


  it('ignora keywords que no abren el texto', () => {
    expect(keywordsFromText('[DON!! x2] This Character gains [Rush]. (This card can attack on the turn in which it is played.)')).toEqual([])
    expect(keywordsFromText('[Main] Your opponent cannot activate [Blocker] if a Leader attacks during this turn.')).toEqual([])

  })


  it('devuelve vacío con texto null', () => {
    expect(keywordsFromText(null)).toEqual([])

  })

})
