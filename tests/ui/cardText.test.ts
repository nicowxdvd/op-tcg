import { describe, expect, it } from 'vitest'
import { loadCards } from '../../src/data'
import { cardText } from '../../src/ui/cardText'

describe('cardText', () => {
  it('traduce el texto de todas las cartas con efecto', () => {
    const untranslated = loadCards().filter(card => card.card_text && cardText(card.card_set_id) === card.card_text).map(card => card.card_set_id)

    expect(untranslated).toEqual([])

  })


  it('devuelve vacío para una carta sin efecto', () => {
    expect(cardText('ST01-003')).toBe('')

  })

})
