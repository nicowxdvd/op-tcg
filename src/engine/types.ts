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

export type Timing = 'onPlay' | 'whenAttacking' | 'onKO' | 'activateMain' | 'endOfYourTurn' | 'trigger' | 'counter' | 'main'

export type Duration = 'thisTurn' | 'thisBattle' | 'permanent'

export type EffectStep =
  | { op: 'draw'; player: PlayerId; amount: number }
  | { op: 'ko'; target: string }
  | { op: 'power'; target: string; amount: number; duration: Duration }
  | { op: 'rest'; target: string }
  | { op: 'activate'; target: string }
  | { op: 'search'; player: PlayerId; amount: number }
  | { op: 'toLife'; player: PlayerId; instanceId: string }
  | { op: 'toHand'; player: PlayerId; instanceId: string }
  | { op: 'choose'; chooser: PlayerId; kind: ChoiceKind; options: string[]; optional: boolean; then: EffectStep[] }

export interface EffectContext {
  state: GameState
  source: string
  owner: PlayerId
  target?: string

}

export interface EffectCost {
  restSelf?: boolean
  restDon?: number
  trashFromHand?: number

}

export interface EffectDef {
  timing: Timing
  donRequired?: number
  turn?: 'yours' | 'opponents'
  oncePerTurn?: boolean
  cost?: EffectCost
  condition?: (ctx: EffectContext) => boolean
  run: (ctx: EffectContext) => EffectStep[]

}

export type EffectRegistry = Record<string, EffectDef[]>

export interface QueuedEffect {
  source: string
  owner: PlayerId
  steps: EffectStep[]

}

export interface Modifier {
  target: string
  power: number
  duration: Duration
  sourceId: string

}

export type ChoiceKind = 'target' | 'option' | 'trashFromHand' | 'orderDeck' | 'confirm'

export interface ResumeToken {
  source: string
  owner: PlayerId
  rest: EffectStep[]

}

export interface PendingChoice {
  player: PlayerId
  kind: ChoiceKind
  options: string[]
  optional: boolean
  resume: ResumeToken

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
  stage: CardInstance | null
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
  effects: EffectRegistry
  pending: PendingChoice | null
  effectQueue: QueuedEffect[]
  modifiers: Modifier[]
  oncePerTurnUsed: string[]

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
  | { type: 'LifeBanished'; player: PlayerId; instanceId: string }
  | { type: 'CharacterKOd'; player: PlayerId; instanceId: string }
  | { type: 'EffectTriggered'; player: PlayerId; source: string; timing: Timing }
  | { type: 'PowerModified'; target: string; amount: number; duration: Duration }
  | { type: 'BattleEnded'; connected: boolean }
  | { type: 'GameOver'; winner: PlayerId }

export interface ApplyResult {
  state: GameState
  events: GameEvent[]

}
