import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const DIR = join(__dirname, '../../src/learn')

describe('src/learn', () => {

  it('no importa Phaser', () => {
    for (const file of readdirSync(DIR))
      expect(readFileSync(join(DIR, file), 'utf8'), file).not.toMatch(/from 'phaser'|phaser/i)

  })

})
