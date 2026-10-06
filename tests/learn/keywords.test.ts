import { describe, expect, it } from 'vitest'
import { explainKeyword, findKeywords } from '../../src/learn/keywords'
import { KEYWORD_TEXTS } from '../../src/learn/texts'

const names = (text: string) => findKeywords(text).map(match => match.keyword)

describe('findKeywords', () => {

  it.each([['[Rush]', 'Rush'], ['[Blocker]', 'Blocker'], ['[Double Attack]', 'Double Attack'], ['[Banish]', 'Banish'], ['[On Play]', 'On Play'], ['[When Attacking]', 'When Attacking'], ['[On K.O.]', 'On K.O.'], ['[Trigger]', 'Trigger'], ['[Counter]', 'Counter'], ['[DON!! x1]', 'DON!! xN'], ['[DON!! x2]', 'DON!! xN'], ['[Once Per Turn]', 'Once Per Turn'], ['[Activate: Main]', 'Activate: Main'], ['[Main]', 'Main'], ['[Your Turn]', 'Your Turn'], ["[Opponent's Turn]", "Opponent's Turn"], ['[End of Your Turn]', 'End of Your Turn']])('reconoce %s', (text, keyword) => {
    expect(findKeywords(text)).toEqual([{ keyword, start: 0, end: text.length }])
    expect(explainKeyword(keyword)).toBe(KEYWORD_TEXTS[keyword])

  })


  it('reconoce varios keywords en un texto real de ST01', () => {
    const text = '[DON!! x2] [When Attacking] Your opponent cannot activate a [Blocker] Character that has 5000 or more power during this battle. [Trigger] Play this card.'

    expect(names(text)).toEqual(['DON!! xN', 'When Attacking', 'Blocker', 'Trigger'])

  })


  it('devuelve las posiciones exactas del keyword', () => {
    const text  = 'Gains [Rush] now'
    const match = findKeywords(text)[0]

    expect(text.slice(match.start, match.end)).toBe('[Rush]')

  })


  it('ignora mayúsculas y minúsculas', () => {
    expect(names('[on play] y [ON K.O.] y [rush]')).toEqual(['On Play', 'On K.O.', 'Rush'])

  })


  it('reconoce keywords sin corchetes solo si son de combate', () => {
    expect(names('This card has Double Attack and Banish. Counter +1000 on Trigger.')).toEqual(['Double Attack', 'Banish'])

  })


  it('no marca un texto sin keywords', () => {
    expect(findKeywords('Draw 1 card and trash 1 card from your hand.')).toEqual([])
    expect(findKeywords('')).toEqual([])
    expect(findKeywords('NULL')).toEqual([])

  })


  it('explainKeyword devuelve null para un keyword desconocido', () => {
    expect(explainKeyword('Inventado')).toBeNull()

  })

})
