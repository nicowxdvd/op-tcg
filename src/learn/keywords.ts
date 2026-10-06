import { KEYWORD_TEXTS } from './texts'

export interface KeywordMatch {
  keyword: string
  start: number
  end: number

}

const BRACKETED = ['DON!! x\\d+', 'Activate: Main', 'Once Per Turn', 'When Attacking', 'On Play', 'On K\\.O\\.', 'Trigger', 'Counter', 'Main', 'Your Turn', "Opponent's Turn", 'End of Your Turn', 'Rush', 'Blocker', 'Double Attack', 'Banish']
const BARE      = ['Rush', 'Blocker', 'Double Attack', 'Banish']
const PATTERN   = new RegExp(`\\[(${BRACKETED.join('|')})\\]|\\b(${BARE.join('|')})\\b`, 'gi')
const CANONICAL = new Map(Object.keys(KEYWORD_TEXTS).map(keyword => [keyword.toLowerCase(), keyword]))


function canonical(found: string): string {
  const key = found.toLowerCase().replace(/^don!! x\d+$/, 'don!! xn')

  return CANONICAL.get(key) ?? found

}


export function findKeywords(cardText: string): KeywordMatch[] {
  return [...cardText.matchAll(PATTERN)].map(match => ({ keyword: canonical(match[1] ?? match[2]), start: match.index, end: match.index + match[0].length }))

}


export function explainKeyword(keyword: string): string | null {
  return KEYWORD_TEXTS[keyword] ?? null

}
