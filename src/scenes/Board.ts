import * as Phaser from 'phaser'
import { getPower, opponentOf } from '../engine'
import type { Action, CardInstance, GameEvent, PlayerId, PlayerState } from '../engine'
import { createController } from '../app/createController'
import type { MatchConfig } from '../app/gameConfig'
import { gameResult } from '../app/gameResult'
import { soundsFor } from '../app/sounds'
import { loadPreferences, savePreferences } from '../app/preferences'
import { createMockController } from '../dev/mockGame'
import { audio } from '../ui/AudioManager'
import { CardSprite } from '../ui/CardSprite'
import type { CardView } from '../ui/CardSprite'
import { CardZoom } from '../ui/CardZoom'
import { cardText } from '../ui/cardText'
import { DonArea } from '../ui/DonArea'
import { GameController } from '../ui/GameController'
import { center, computeLayout, contains, splitLearn } from '../ui/layout'
import type { BoardLayout, LearnLayout, SideLayout } from '../ui/layout'
import { drawIcon } from '../ui/icons'
import { LifeArea } from '../ui/LifeArea'
import { FanView } from '../ui/FanView'
import { HandActionDialog } from '../ui/HandActionDialog'
import { handActionsFor } from '../ui/handActions'
import type { HandAction, HandSelection } from '../ui/handActions'
import { nextHandSort, sortHand } from '../ui/handSort'
import type { HandSort } from '../ui/handSort'
import { instructionFor, phaseLabel } from '../ui/instructions'
import { PlayerBadge } from '../ui/PlayerBadge'
import { PlayerPanel } from '../ui/PlayerPanel'
import { MOCK_COUNTER_CLOCK, MOCK_RIVAL, MOCK_SELF } from '../ui/mockPlayers'
import { GameLog } from '../ui/GameLog'
import { describeEvent } from '../learn/describeEvent'
import { describePhase } from '../learn/describePhase'
import { PromptDialog } from '../ui/PromptDialog'
import { StartRollDialog } from '../ui/StartRollDialog'
import type { PromptDetails, PromptOption } from '../ui/PromptDialog'
import { collectSprites, playEvents } from '../ui/animations'
import { buildPrompt, describeAction, nameOf } from '../ui/prompts'
import { buildCardBack, buildSmallCards, preloadCardImages, preloadDonImage } from '../ui/textures'
import { pixelRatio } from '../ui/viewport'
import { fadeIn, goTo } from '../ui/transitions'
import { COLORS, CARD_FACES, RADIUS, textStyle } from '../ui/theme'
import { drawAttackArrow } from '../ui/AttackArrow'
import { SidePanel } from '../ui/SidePanel'
import { Zone } from '../ui/Zone'

type DragSource =
  | { kind: 'hand'; id: string }

const PLAYABLE  = COLORS.playable
const ATTACK    = COLORS.attack
const ACTIVATE  = COLORS.activate
const NOTICE_MS = 3000
const CLICK_DISTANCE = 6
const RESULT_MS = 1800

const MOCK_CONFIG: MatchConfig = { mode: 'cpu', decks: { p1: 'st01', p2: 'st02' }, seed: 0, difficulty: 'normal' }


export class Board extends Phaser.Scene {

  private controller!: GameController
  private layout!: BoardLayout
  private layer!: Phaser.GameObjects.Container
  private zoom!: CardZoom
  private dialog: PromptDialog | StartRollDialog | null = null
  private rollShown = false
  private handDialog: HandActionDialog | null = null
  private selection: HandSelection | null = null
  private hand: FanView | null = null
  private counterOpen = false
  private attackerId: string | null = null
  private selectedDon = 0
  private press: { attackId: string; source: string; canAttack: boolean } | null = null
  private pressedButton = false
  private activating: string | null = null
  private dragArrow: Phaser.GameObjects.Graphics | null = null
  private pendingAttack: Action | null = null
  private notice: string | null = null
  private dirty = true
  private viewer: PlayerId = 'p1'
  private legal: Action[] = []
  private sources = new Map<Phaser.GameObjects.GameObject, DragSource>()
  private images: string[] = []
  private donImage: string | null = null
  private ratio = 1
  private queued: GameEvent[] = []
  private lastActive: PlayerId | null = null
  private log = new GameLog()
  private learnOpen = true
  private handSort: HandSort = 'original'
  private config: MatchConfig = MOCK_CONFIG
  private ending = false
  private logArea: LearnLayout | null = null

  constructor() {
    super('Board')

  }


  init(data: { config?: MatchConfig; controller?: GameController; images?: string[]; donImage?: string | null }) {
    this.config     = data.config ?? MOCK_CONFIG
    this.ending     = false
    this.rollShown  = false
    this.controller = data.controller ?? (data.config ? createController(data.config) : createMockController())
    this.images     = data.images ?? []
    this.donImage   = data.donImage ?? null
    this.log        = new GameLog()
    this.learnOpen  = loadPreferences().learnPanel

    const state = this.controller.getState()

    this.log.add(describeEvent({ type: 'GameStarted', first: state.first }, state))

  }


  preload() {
    preloadCardImages(this, this.images)
    preloadDonImage(this, this.donImage)

  }


  create() {
    this.ratio = pixelRatio(window.devicePixelRatio)
    fadeIn(this)
    buildSmallCards(this, this.images)
    buildCardBack(this)
    this.fitCamera()
    this.input.mouse?.disableContextMenu()

    const unsubscribe = this.controller.on(events => {
      this.queued.push(...events)

      for (const name of soundsFor(events))
        audio.play(name)

      for (const event of events)
        this.log.add(describeEvent(event, this.controller.getState()))

      this.dirty = true

    })

    this.events.once('shutdown', () => {
      unsubscribe()
      this.controller.dispose()

    })
    this.scale.on('resize', () => this.fitCamera())
    this.events.once('shutdown', () => this.scale.off('resize'))
    this.input.on('drag', (_pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.Container, x: number, y: number) => object.setPosition(x, y))
    this.input.on('dragend', (pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.GameObject) => this.onDragEnd(pointer, object))
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      if (this.logArea && contains(this.logArea.log, pointer.worldX, pointer.worldY)) {
        this.log.scroll(dy > 0 ? -1 : 1)
        this.dirty = true
      }

    })
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && this.zoom.pinned)
        this.zoom.hide()

      if (this.handDialog && !this.handDialog.contains(pointer.worldX, pointer.worldY))
        this.closeHandDialog()

      if (this.activating && !this.pressedButton)
        this.closeActivate()

      this.pressedButton = false

    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.moveAttackArrow(pointer))
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.endPress(pointer))
    this.input.keyboard?.on('keydown-ESC', () => {
      this.closeHandDialog()
      this.cancelAttack()
      this.closeActivate()

    })

  }


  private fitCamera() {
    this.cameras.main.setOrigin(0, 0).setZoom(this.ratio)
    this.layout = computeLayout(this.scale.width / this.ratio, this.scale.height / this.ratio)
    this.dirty  = true

  }


  update() {
    if (!this.dirty)
      return

    this.dirty = false
    this.render()

  }


  private render() {
    const state = this.controller.getState()

    this.layer?.destroy()
    this.zoom?.destroy()
    this.dialog?.destroy()
    this.dialog = null
    this.handDialog?.destroy()
    this.handDialog = null
    this.selection  = null
    this.hand       = null
    this.sources.clear()

    const actor = this.controller.actor()

    this.viewer = this.controller.isCpu(actor) ? opponentOf(actor) : actor
    this.legal  = this.controller.getLegal(this.viewer)
    this.layer  = this.add.container(0, 0)

    if (!this.inCounterStep())
      this.counterOpen = false

    this.selectedDon = this.legal.some(action => action.type === 'AttachDon') ? Math.min(this.selectedDon, state.players[this.viewer].donActive) : 0

    if (this.attackerId && !this.legal.some(action => action.type === 'Attack' && action.attacker === this.attackerId))
      this.cancelAttack()

    const { layout } = this
    const rival      = opponentOf(this.viewer)

    this.drawFrames(state.active, rival)
    this.drawSide(rival, layout.rival, false)
    this.drawSide(this.viewer, layout.self, true)
    this.drawSidePanel()
    this.drawPassButton()

    this.scheduleResult()
    this.zoom = new CardZoom(this, layout.zoom, cardText)
    this.add.existing(this.zoom)

    const prompt = buildPrompt(state, this.legal, this.viewer)

    if (state.phase === 'startRoll')
      this.showStartRoll()
    else if (prompt)
      this.showDialog(prompt.title, prompt.options.map(option => ({ label: option.label, run: () => this.send(option.action) })), true, { subtitle: prompt.subtitle, hint: prompt.hint })
    else if (this.inCounterStep())
      this.showCounterPrompt()
    else
      this.showAttackConfirm()

    const events = this.queued

    this.queued = []
    playEvents(this, events, { sprites: collectSprites(this.layer), deckOf: player => center(this.sideOf(player).deck), leaderOf: player => this.controller.getState().players[player].leader.instanceId })

  }


  private scheduleResult() {
    const result = gameResult(this.controller.getState())

    if (!result || this.ending)
      return

    this.ending = true
    this.time.delayedCall(RESULT_MS, () => goTo(this, 'GameOver', { config: this.config, result, images: this.images, donImage: this.donImage }))

  }


  private sideOf(player: PlayerId): SideLayout {
    return player === this.viewer ? this.layout.self : this.layout.rival

  }


  private drawFrames(active: PlayerId, rival: PlayerId) {
    const state   = this.controller.getState()
    const changed = this.lastActive !== null && this.lastActive !== active
    const counter = state.battle?.step === 'counter' ? opponentOf(state.battle.attackerPlayer) : null
    const sides   = [{ id: rival, side: this.layout.rival, mock: MOCK_RIVAL }, { id: this.viewer, side: this.layout.self, mock: MOCK_SELF }]

    this.lastActive = active

    for (const { id, side, mock } of sides)
      this.layer.add([new PlayerPanel(this, side.panel, this.leaderColor(id), id === active, changed), new PlayerBadge(this, side.badge, side.clock, mock, id === active, id === counter ? MOCK_COUNTER_CLOCK : mock.clock)])

  }


  private drawSidePanel() {
    const state = this.controller.getState()

    this.logArea = splitLearn(this.layout.log, this.learnOpen)

    const info = this.learnOpen ? describePhase(state, this.viewer) : null

    this.layer.add(new SidePanel(this, this.layout, { header: phaseLabel(state), banner: instructionFor(state, this.legal, this.viewer), notice: this.notice, log: this.log.visible(), learn: this.logArea, info, onToggleLearn: () => this.toggleLearn(), onFullscreen: () => this.toggleFullscreen() }))

  }


  private toggleLearn() {
    this.learnOpen = !this.learnOpen
    savePreferences({ ...loadPreferences(), learnPanel: this.learnOpen })
    this.dirty     = true

  }


  private toggleFullscreen() {
    if (this.scale.isFullscreen)
      this.scale.stopFullscreen()
    else
      this.scale.startFullscreen()

  }


  private drawPassButton() {
    const pass = this.legal.find(action => action.type === 'PassPhase')

    if (!pass)
      return

    const { button } = this.layout
    const middle     = center(button)
    const box        = this.add.graphics()
    const hit        = this.add.rectangle(middle.x, middle.y, button.w, button.h, COLORS.white, 0).setInteractive({ useHandCursor: true })
    const label      = this.add.text(middle.x - button.h * 0.2, middle.y, 'Terminar turno', textStyle(button.h * 0.4, COLORS.dialog)).setOrigin(0.5)
    const arrow      = this.add.graphics()

    box.fillStyle(COLORS.gold, 1).fillRoundedRect(button.x, button.y, button.w, button.h, RADIUS.button)
    drawIcon(arrow, 'play', label.x + label.width / 2 + button.h * 0.4, middle.y, button.h * 0.4, COLORS.dialog)
    hit.on('pointerup', () => this.send(pass))
    this.layer.add([box, label, arrow, hit])

  }


  private drawSide(player: PlayerId, side: SideLayout, own: boolean) {
    const state      = this.controller.getState()
    const data       = state.players[player]
    const card       = this.layout.card
    const defOf      = (instance: CardInstance) => state.defs[instance.defId]
    const started    = state.phase !== 'mulligan' && state.phase !== 'startRoll'
    const attacks    = new Set(own ? this.legal.flatMap(action => action.type === 'Attack' ? [action.attacker] : []) : [])
    const uses       = new Set(own ? this.legal.flatMap(action => action.type === 'ActivateEffect' ? [action.source] : []) : [])
    const donTargets = new Set(own && this.selectedDon > 0 ? this.legal.flatMap(action => action.type === 'AttachDon' ? [action.target] : []) : [])
    const targets    = new Set(!own && this.attackerId ? this.legal.flatMap(action => action.type === 'Attack' && action.attacker === this.attackerId ? [action.target] : []) : [])

    const place = (rect: SideLayout['leader'], instance: CardInstance, extra: Partial<CardView>, attackId: string) => {
      const middle = center(rect)
      const sprite = new CardSprite(this, middle.x, middle.y, card, { def: defOf(instance), instanceId: instance.instanceId, power: started ? getPower(state, instance.instanceId) : undefined, ...extra })

      this.layer.add(sprite)
      this.wireZoom(sprite)

      if (donTargets.has(attackId)) {
        sprite.setHighlight(PLAYABLE).enableInput()
        sprite.on('pointerup', (pointer: Phaser.Input.Pointer) => {
          if (pointer.leftButtonReleased() && pointer.getDistance() < CLICK_DISTANCE)
            this.attachDon(attackId)

        })
      }
      else if (attacks.has(attackId) || uses.has(instance.instanceId)) {
        const canAttack = attacks.has(attackId)

        sprite.setHighlight(this.attackerId === attackId ? COLORS.gold : canAttack ? ATTACK : ACTIVATE).enableInput()
        sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          if (pointer.leftButtonDown())
            this.beginPress(attackId, instance.instanceId, canAttack)

        })
      }
      else if (targets.has(attackId)) {
        sprite.setHighlight(ATTACK).enableInput()
      }

      if (this.activating === instance.instanceId)
        this.drawActivateButton(sprite, instance.instanceId)

    }

    const stage = new Zone(this, side.stage, 'Stage', null, data.stage ? { def: defOf(data.stage), instanceId: data.stage.instanceId } : null, card)
    const trash = new Zone(this, side.trash, 'Trash', data.trash.length, data.trash.length ? { def: defOf(data.trash[data.trash.length - 1]) } : null, card)

    this.layer.add([stage, trash, new Zone(this, side.deck, 'Deck', data.deck.length, data.deck.length ? { def: null } : null, card), new Zone(this, side.leader, 'Leader', null, null, card)])

    for (const zone of [stage, trash])
      if (zone.sprite)
        this.wireZoom(zone.sprite)

    if (stage.sprite && data.stage && uses.has(data.stage.instanceId)) {
      const stageId = data.stage.instanceId

      stage.sprite.setHighlight(ACTIVATE)
      stage.sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.leftButtonDown())
          this.beginPress(stageId, stageId, false)

      })

      if (this.activating === stageId)
        this.drawActivateButton(stage.sprite, stageId)

    }

    place(side.leader, data.leader, { rested: data.leaderRested, don: data.leaderAttachedDon }, 'leader')

    data.characters.forEach((character, i) => {
      this.layer.add(new Zone(this, side.slots[i], '', null, null, card))
      place(side.slots[i], character.card, { rested: character.rested, don: character.attachedDon }, character.card.instanceId)

    })

    for (let i = data.characters.length; i < side.slots.length; i++)
      this.layer.add(new Zone(this, side.slots[i], 'Character', null, null, card))

    this.layer.add(new LifeArea(this, side.life, data.life.length, card))
    this.drawDon(side, data, own)
    this.drawHand(side, data, own)

  }


  private drawDon(side: SideLayout, data: PlayerState, own: boolean) {
    const attached = data.leaderAttachedDon + data.characters.reduce((sum, character) => sum + character.attachedDon, 0)
    const selected = own ? Math.min(this.selectedDon, data.donActive) : 0
    const area     = new DonArea(this, side.don, { active: data.donActive, rested: data.donRested, attached }, selected)

    this.layer.add([area, new Zone(this, side.donDeck, 'DON!! deck', data.donDeck, data.donDeck ? { def: null, donFace: true } : null, this.layout.card)])

    if (own && this.legal.some(action => action.type === 'AttachDon'))
      area.sprites.forEach((sprite, i) => {
        sprite.setHighlight(i < selected ? COLORS.gold : PLAYABLE).enableInput()

        if (i < selected)
          sprite.y -= sprite.cardSize.h * 0.12

        sprite.on('pointerup', (pointer: Phaser.Input.Pointer) => {
          if (pointer.leftButtonReleased() && pointer.getDistance() < CLICK_DISTANCE)
            this.toggleDon(i)

        })
      })

  }


  private drawHand(side: SideLayout, data: PlayerState, own: boolean) {
    const state    = this.controller.getState()
    const playable = new Set(this.legal.flatMap(action => action.type === 'PlayCharacter' || action.type === 'PlayEvent' || action.type === 'PlayStage' ? [action.instanceId] : []))
    const counters = new Set(this.counterOpen ? this.legal.flatMap(action => action.type === 'UseCounter' || action.type === 'UseCounterEvent' ? [action.instanceId] : []) : [])
    const views    = data.hand.map((instance): CardView => ({ def: own ? state.defs[instance.defId] : null, instanceId: instance.instanceId }))

    if (!own) {
      const back = { w: this.layout.handCard.w * 0.8, h: this.layout.handCard.h * 0.8 }

      this.layer.add(new FanView(this, side.hand, views, back, 'rival'))

      return
    }

    const hand = new FanView(this, side.hand, sortHand(views, this.handSort), this.layout.handCard, 'self', this.handSort, () => this.cycleHandSort())

    this.layer.add(hand)
    this.hand = hand

    for (const sprite of hand.sprites) {
      this.wireZoom(sprite)

      if (sprite.instanceId && playable.has(sprite.instanceId)) {
        sprite.setHighlight(PLAYABLE).enableInput()
        this.input.setDraggable(sprite)
        this.sources.set(sprite, { kind: 'hand', id: sprite.instanceId })
      }
      else if (sprite.instanceId && counters.has(sprite.instanceId)) {
        sprite.setHighlight(PLAYABLE).enableInput()
      }
      else {
        sprite.enableInput()
      }

      sprite.on('pointerup', (pointer: Phaser.Input.Pointer) => this.pick(hand, sprite, pointer))
    }

  }


  private inCounterStep(): boolean {
    const battle = this.controller.getState().battle

    return battle?.step === 'counter' && battle.attackerPlayer !== this.viewer

  }


  private showCounterPrompt() {
    const pass        = this.legal.find(action => action.type === 'PassCounter')
    const hasCounters = this.legal.some(action => action.type === 'UseCounter' || action.type === 'UseCounterEvent')

    if (!pass)
      return

    if (this.counterOpen)
      this.showDialog('Fase counter: elegí una carta con counter', [{ label: 'No usar counter', run: () => this.send(pass) }], false)
    else if (hasCounters)
      this.showDialog('Fase counter: ¿usar counter?', [{ label: 'Sí', run: () => this.openCounters() }, { label: 'No', run: () => this.send(pass) }], false)
    else
      this.showDialog('Fase counter: no tenés cartas con counter', [{ label: 'Continuar', run: () => this.send(pass) }], false)

  }


  private openCounters() {
    this.counterOpen = true
    this.dirty       = true

  }


  private pick(hand: FanView, sprite: CardSprite, pointer: Phaser.Input.Pointer) {
    if (!sprite.instanceId || !pointer.leftButtonReleased() || pointer.getDistance() > CLICK_DISTANCE)
      return

    const actions = handActionsFor(this.controller.getState(), this.legal, sprite.instanceId)

    if (actions.length === 0 || (this.inCounterStep() && !this.counterOpen))
      return

    this.handDialog?.destroy()
    this.selection  = { instanceId: sprite.instanceId, actions }
    this.handDialog = new HandActionDialog(this, { w: this.layout.width, h: this.layout.height }, hand.anchorOf(sprite), nameOf(this.controller.getState(), sprite.instanceId), actions, {
      run:   (action: HandAction) => this.send(action.action),
      close: () => this.closeHandDialog(),
      info:  () => {
        if (sprite.def) {
          this.zoom.show(sprite.def)
          this.zoom.pinned = true
        }
      }
    })
    this.add.existing(this.handDialog)
    hand.select(sprite)

  }


  private closeHandDialog() {
    this.handDialog?.destroy()
    this.handDialog = null
    this.selection  = null
    this.hand?.select(null)

  }


  private cycleHandSort() {
    this.handSort = nextHandSort(this.handSort)
    this.dirty    = true

  }


  private wireZoom(sprite: CardSprite) {
    const def = sprite.def

    if (!def)
      return

    sprite.enableInput()
    sprite.on('pointerover', () => {
      if (!this.zoom.pinned)
        this.zoom.show(def)

    })
    sprite.on('pointerout', () => {
      if (!this.zoom.pinned)
        this.zoom.hide()

    })
    sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.zoom.show(def)
        this.zoom.pinned = true
      }

    })

  }


  private onDragEnd(pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.GameObject) {
    const source  = this.sources.get(object)

    this.dirty = true

    if (!source)
      return

    const actions = this.actionsAt(source, pointer.worldX, pointer.worldY)

    if (actions.length === 1)
      this.send(actions[0])
    else if (actions.length > 1)
      this.chooseReplacement(actions)

  }


  private actionsAt(source: DragSource, x: number, y: number): Action[] {
    const state = this.controller.getState()
    const { self } = this.layout

    const card = state.players[this.viewer].hand.find(candidate => candidate.instanceId === source.id)
    const zone = card && state.defs[card.defId].type === 'Stage' ? self.stage : self.characters

    return contains(zone, x, y) ? this.legal.filter(action => (action.type === 'PlayCharacter' || action.type === 'PlayEvent' || action.type === 'PlayStage') && action.instanceId === source.id) : []

  }


  private toggleDon(index: number) {
    this.selectedDon   = this.selectedDon === index + 1 ? index : index + 1
    this.attackerId    = null
    this.pendingAttack = null
    this.dirty         = true

  }


  private attachDon(target: string) {
    const action = this.legal.find(candidate => candidate.type === 'AttachDon' && candidate.target === target)
    const count  = this.selectedDon

    this.selectedDon = 0

    if (!action)
      return

    for (let i = 0; i < count; i++)
      this.send(action)

  }


  private beginPress(attackId: string, source: string, canAttack: boolean) {
    this.press      = { attackId, source, canAttack }
    this.activating = null

    if (!canAttack)
      return

    this.attackerId    = attackId
    this.pendingAttack = null
    this.selectedDon   = 0
    this.dirty         = true

  }


  private moveAttackArrow(pointer: Phaser.Input.Pointer) {
    if (!this.press?.canAttack || pointer.getDistance() < CLICK_DISTANCE)
      return

    const { self } = this.layout
    const color    = this.leaderColor(this.viewer)

    this.dragArrow?.destroy()
    this.dragArrow = drawAttackArrow(this, this.centerOf(this.viewer, self, this.press.attackId), { x: pointer.worldX, y: pointer.worldY }, color, color).setDepth(1000)

  }


  private endPress(pointer: Phaser.Input.Pointer) {
    const press = this.press

    this.press = null
    this.dragArrow?.destroy()
    this.dragArrow = null

    if (!press || !pointer.leftButtonReleased())
      return

    if (pointer.getDistance() < CLICK_DISTANCE) {
      this.cancelAttack()
      this.activating = this.legal.some(action => action.type === 'ActivateEffect' && action.source === press.source) ? press.source : null
      this.dirty      = true

      return
    }

    if (!press.canAttack)
      return

    const target = this.rivalTargetAt(pointer.worldX, pointer.worldY)

    if (target)
      this.askAttack(target)
    else
      this.cancelAttack()

  }


  private rivalTargetAt(x: number, y: number): string | null {
    const { rival } = this.layout

    if (contains(rival.leader, x, y))
      return 'leader'

    const characters = this.controller.getState().players[opponentOf(this.viewer)].characters
    const index      = characters.findIndex((_, i) => contains(rival.slots[i], x, y))

    return index >= 0 ? characters[index].card.instanceId : null

  }


  private drawActivateButton(sprite: CardSprite, source: string) {
    const { w, h } = sprite.cardSize
    const width    = Math.max(w, 90)
    const height   = Math.max(28, h * 0.22)
    const x        = sprite.x
    const y        = sprite.y + h / 2 + 6 + height / 2
    const face     = this.add.graphics()
    const hit      = this.add.rectangle(x, y, width, height, COLORS.white, 0).setInteractive({ useHandCursor: true })
    const label    = this.add.text(x, y, 'Activar', textStyle(height * 0.5, COLORS.dialog)).setOrigin(0.5)

    face.fillStyle(COLORS.gold, 1).fillRoundedRect(x - width / 2, y - height / 2, width, height, RADIUS.button)
    hit.on('pointerdown', () => {
      this.pressedButton = true
    })
    hit.on('pointerup', () => {
      this.activating = null
      this.activate(source)
    })
    this.layer.add([face, label, hit])

  }


  private closeActivate() {
    this.activating = null
    this.dirty      = true

  }


  private askAttack(target: string) {
    this.pendingAttack = this.legal.find(action => action.type === 'Attack' && action.attacker === this.attackerId && action.target === target) ?? null
    this.dirty         = true

  }


  private cancelAttack() {
    this.attackerId    = null
    this.pendingAttack = null
    this.dirty         = true

  }


  private centerOf(player: PlayerId, side: SideLayout, id: string) {
    const characters = this.controller.getState().players[player].characters
    const index      = characters.findIndex(character => character.card.instanceId === id)

    return center(id === 'leader' ? side.leader : side.slots[index])

  }


  private nameFor(player: PlayerId, id: string): string {
    const state = this.controller.getState()

    return nameOf(state, id === 'leader' ? state.players[player].leader.instanceId : id)

  }


  private leaderColor(player: PlayerId): number {
    const state = this.controller.getState()

    return CARD_FACES[state.defs[state.players[player].leader.defId].colors[0]] ?? COLORS.gold

  }


  private showAttackConfirm() {
    const attack = this.pendingAttack

    if (!attack || attack.type !== 'Attack' || !this.attackerId)
      return

    const rival = opponentOf(this.viewer)
    const { self, rival: rivalSide } = this.layout

    this.layer.add(drawAttackArrow(this, this.centerOf(this.viewer, self, attack.attacker), this.centerOf(rival, rivalSide, attack.target), this.leaderColor(this.viewer), this.leaderColor(rival)))
    this.showDialog(`¿Atacar a ${this.nameFor(rival, attack.target)} con ${this.nameFor(this.viewer, attack.attacker)}?`, [{ label: 'Atacar', run: () => this.confirmAttack(attack) }, { label: 'Cancelar', run: () => this.cancelAttack() }], false)

  }


  private confirmAttack(attack: Action) {
    this.attackerId    = null
    this.pendingAttack = null
    this.send(attack)

  }


  private activate(source: string) {
    const actions = this.legal.filter(action => action.type === 'ActivateEffect' && action.source === source)

    if (actions.length === 1)
      this.send(actions[0])
    else if (actions.length > 1)
      this.showDialog('Activate which effect?', actions.map(action => ({ label: describeAction(this.controller.getState(), action), run: () => this.send(action) })))

  }


  private chooseReplacement(actions: Action[]) {
    const state = this.controller.getState()

    this.showDialog('Characters are full: replace which one?', [...actions.map(action => ({ label: describeAction(state, action), run: () => this.send(action) })), { label: 'Cancel', run: () => this.closeDialog() }])

  }


  private showDialog(title: string, options: PromptOption[], veiled = true, details?: PromptDetails) {
    this.dialog?.destroy()
    this.dialog = new PromptDialog(this, { w: this.layout.width, h: this.layout.height }, title, options, veiled, details)
    this.add.existing(this.dialog)

  }


  private showStartRoll() {
    const state    = this.controller.getState()
    const cpu      = this.config.mode === 'cpu'
    const rival    = opponentOf(this.viewer)
    const leader   = (player: PlayerId) => ({ defId: state.players[player].leader.defId, name: state.defs[state.players[player].leader.defId].name, color: state.defs[state.players[player].leader.defId].colors[0] })
    const labels   = cpu ? { [this.viewer]: 'Tú', [rival]: 'CPU' } as Record<PlayerId, string> : { p1: 'Jugador 1', p2: 'Jugador 2' }
    const winner   = state.rollWinner
    const headline = !cpu ? `${labels[winner]} ganó el sorteo` : winner === this.viewer ? '¡Ganaste el sorteo!' : 'La CPU ganó el sorteo'
    const animate  = !this.rollShown

    this.rollShown = true
    this.dialog?.destroy()
    this.dialog = new StartRollDialog(this, { w: this.layout.width, h: this.layout.height }, {
      leaders: { p1: leader('p1'), p2: leader('p2') },
      labels,
      dice: state.dice,
      winner,
      headline,
      canChoose: this.legal.some(action => action.type === 'ChooseFirst'),
      animate,
      onChoose: goFirst => this.send({ type: 'ChooseFirst', player: this.viewer, goFirst })
    })
    this.add.existing(this.dialog)

  }


  private closeDialog() {
    this.dialog?.destroy()
    this.dialog = null

  }


  private send(action: Action) {
    this.closeDialog()
    this.closeHandDialog()

    try {
      this.controller.dispatch(action)
    }
    catch (error) {
      this.notice = error instanceof Error ? error.message : String(error)
      this.dirty  = true
      this.time.delayedCall(NOTICE_MS, () => {
        this.notice = null
        this.dirty  = true
      })
    }

  }

}
