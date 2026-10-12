import { describe, expect, it } from 'vitest'
import type { LogEntry } from '../../src/learn/logEntry'
import { GameLog } from '../../src/ui/GameLog'

const entry = (text: string): LogEntry => ({ kind: 'turn', text })

describe('GameLog', () => {

  it('ignora las entradas nulas', () => {
    const log = new GameLog()

    log.add(null)
    log.add(entry('uno'))

    expect(log.size()).toBe(1)

  })


  it('devuelve las últimas entradas y respeta el scroll', () => {
    const log = new GameLog()

    for (const text of ['a', 'b', 'c'])
      log.add(entry(text))

    expect(log.visible().map(item => item.kind === 'turn' && item.text)).toEqual(['a', 'b', 'c'])

    log.scroll(1)

    expect(log.visible()).toHaveLength(2)

  })

})
