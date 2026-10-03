export type PlayerId = 'p1' | 'p2'

export type Phase = 'mulligan' | 'refresh' | 'draw' | 'don' | 'main' | 'end' | 'gameOver'

export type CardType = 'Leader' | 'Character' | 'Event' | 'Stage'

export type Keyword = 'Blocker' | 'Rush' | 'DoubleAttack' | 'Banish'

export interface CardDef {
  id: string
  name: string
  type: CardType
  cost: number
  power: number
  counter: number
  life: number
  colors: string[]
  keywords: Keyword[]

}

export interface CardInstance {
  instanceId: string
  defId: string
  owner: PlayerId

}

export interface CharacterInPlay {
  card: CardInstance
  rested: boolean
  attachedDon: number
  playedTurn: number

}

export interface PlayerState {
  leader: CardInstance
  deck: CardInstance[]
  hand: CardInstance[]
  life: CardInstance[]
  trash: CardInstance[]
  characters: CharacterInPlay[]
  leaderRested: boolean
  leaderAttachedDon: number
  donDeck: number
  donActive: number
  donRested: number
  mulliganDone: boolean

}

export interface BattleState {
  attacker: 'leader' | string
  target: 'leader' | string
  attackerPlayer: PlayerId
  step: 'block' | 'counter'
  counterPower: number

}

export interface GameState {
  seed: number
  defs: Record<string, CardDef>
  players: Record<PlayerId, PlayerState>
  first: PlayerId
  active: PlayerId
  turn: number
  phase: Phase
  winner: PlayerId | null
  battle: BattleState | null

}

export type Action =
  | { type: 'Mulligan'; player: PlayerId; redraw: boolean }
  | { type: 'PlayCharacter'; player: PlayerId; instanceId: string; replaceId?: string }
  | { type: 'AttachDon'; player: PlayerId; target: 'leader' | string }
  | { type: 'PassPhase'; player: PlayerId }
  | { type: 'Attack'; player: PlayerId; attacker: 'leader' | string; target: 'leader' | string }
  | { type: 'DeclareBlock'; player: PlayerId; blockerId: string }
  | { type: 'PassBlock'; player: PlayerId }
  | { type: 'UseCounter'; player: PlayerId; instanceId: string }
  | { type: 'PassCounter'; player: PlayerId }

export type GameEvent =
  | { type: 'MulliganDecided'; player: PlayerId; redraw: boolean }
  | { type: 'GameStarted'; first: PlayerId }
  | { type: 'PhaseChanged'; phase: Phase; turn: number; active: PlayerId }
  | { type: 'CardDrawn'; player: PlayerId; instanceId: string }
  | { type: 'DonAdded'; player: PlayerId; amount: number }
  | { type: 'CharacterPlayed'; player: PlayerId; instanceId: string }
  | { type: 'CharacterTrashed'; player: PlayerId; instanceId: string }
  | { type: 'DonAttached'; player: PlayerId; target: 'leader' | string }
  | { type: 'AttackDeclared'; player: PlayerId; attacker: 'leader' | string; target: 'leader' | string }
  | { type: 'BlockDeclared'; player: PlayerId; blockerId: string }
  | { type: 'BlockPassed'; player: PlayerId }
  | { type: 'CounterUsed'; player: PlayerId; instanceId: string; counterPower: number }
  | { type: 'CounterPassed'; player: PlayerId }
  | { type: 'LifeTaken'; player: PlayerId; instanceId: string }
  | { type: 'CharacterKOd'; player: PlayerId; instanceId: string }
  | { type: 'BattleEnded'; connected: boolean }
  | { type: 'GameOver'; winner: PlayerId }

export interface ApplyResult {
  state: GameState
  events: GameEvent[]

}
