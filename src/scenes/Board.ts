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
import { LifeArea } from '../ui/LifeArea'
import { FanView } from '../ui/FanView'
import { instructionFor, phaseLabel } from '../ui/instructions'
import { PlayerBadge } from '../ui/PlayerBadge'
import { PlayerPanel } from '../ui/PlayerPanel'
import { MOCK_COUNTER_CLOCK, MOCK_RIVAL, MOCK_SELF } from '../ui/mockPlayers'
import { GameLog } from '../ui/GameLog'
import { describeEvent } from '../learn/describeEvent'
import { describePhase } from '../learn/describePhase'
import { PromptDialog } from '../ui/PromptDialog'
import type { PromptOption } from '../ui/PromptDialog'
import { collectSprites, playEvents } from '../ui/animations'
import { buildPrompt, describeAction } from '../ui/prompts'
import { buildCardBack, buildSmallCards, preloadCardImages, preloadDonImage } from '../ui/textures'
import { pixelRatio } from '../ui/viewport'
import { COLORS, RADIUS, textStyle } from '../ui/theme'
import { SidePanel } from '../ui/SidePanel'
import { Zone } from '../ui/Zone'

type DragSource =
  | { kind: 'hand'; id: string }
  | { kind: 'don' }
  | { kind: 'attacker'; id: string }

const PLAYABLE  = COLORS.playable
const ATTACK    = COLORS.attack
const ACTIVATE  = COLORS.activate
const NOTICE_MS = 3000
const RESULT_MS = 1800

const MOCK_CONFIG: MatchConfig = { mode: 'cpu', decks: { p1: 'st01', p2: 'st02' }, seed: 0 }


export class Board extends Phaser.Scene {

  private controller!: GameController
  private layout!: BoardLayout
  private layer!: Phaser.GameObjects.Container
  private zoom!: CardZoom
  private dialog: PromptDialog | null = null
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
  private config: MatchConfig = MOCK_CONFIG
  private ending = false
  private logArea: LearnLayout | null = null

  constructor() {
    super('Board')

  }


  init(data: { config?: MatchConfig; controller?: GameController; images?: string[]; donImage?: string | null }) {
    this.config     = data.config ?? MOCK_CONFIG
    this.ending     = false
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
    this.sources.clear()

    const actor = this.controller.actor()

    this.viewer = this.controller.isCpu(actor) ? opponentOf(actor) : actor
    this.legal  = this.controller.getLegal(this.viewer)
    this.layer  = this.add.container(0, 0)

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

    if (prompt)
      this.showDialog(prompt.title, prompt.options.map(option => ({ label: option.label, run: () => this.send(option.action) })))

    const events = this.queued

    this.queued = []
    playEvents(this, events, { sprites: collectSprites(this.layer), deckOf: player => center(this.sideOf(player).deck), leaderOf: player => this.controller.getState().players[player].leader.instanceId })

  }


  private scheduleResult() {
    const result = gameResult(this.controller.getState())

    if (!result || this.ending)
      return

    this.ending = true
    this.time.delayedCall(RESULT_MS, () => this.scene.start('GameOver', { config: this.config, result, images: this.images, donImage: this.donImage }))

  }


  private sideOf(player: PlayerId): SideLayout {
    return player === this.viewer ? this.layout.self : this.layout.rival

  }


  private drawFrames(active: PlayerId, rival: PlayerId) {
    const state   = this.controller.getState()
    const changed = this.lastActive !== null && this.lastActive !== active
    const counter = state.battle?.step === 'counter' ? opponentOf(state.battle.attackerPlayer) : null
    const sides   = [{ id: rival, side: this.layout.rival, mock: MOCK_RIVAL, isRival: true }, { id: this.viewer, side: this.layout.self, mock: MOCK_SELF, isRival: false }]

    this.lastActive = active

    for (const { id, side, mock, isRival } of sides)
      this.layer.add([new PlayerPanel(this, side.panel, isRival, id === active, changed), new PlayerBadge(this, side.badge, side.clock, mock, id === active, id === counter ? MOCK_COUNTER_CLOCK : mock.clock)])

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
    const label      = this.add.text(middle.x, middle.y, 'Terminar turno', textStyle(button.h * 0.4, COLORS.dialog)).setOrigin(0.5)

    box.fillStyle(COLORS.gold, 1).fillRoundedRect(button.x, button.y, button.w, button.h, RADIUS.button)
    hit.on('pointerup', () => this.send(pass))
    this.layer.add([box, label, hit])

  }


  private drawSide(player: PlayerId, side: SideLayout, own: boolean) {
    const state   = this.controller.getState()
    const data    = state.players[player]
    const card    = this.layout.card
    const defOf   = (instance: CardInstance) => state.defs[instance.defId]
    const started = state.phase !== 'mulligan'
    const attacks = new Set(own ? this.legal.flatMap(action => action.type === 'Attack' ? [action.attacker] : []) : [])
    const uses    = new Set(own ? this.legal.flatMap(action => action.type === 'ActivateEffect' ? [action.source] : []) : [])

    const place = (rect: SideLayout['leader'], instance: CardInstance, extra: Partial<CardView>, attackId: string) => {
      const middle = center(rect)
      const sprite = new CardSprite(this, middle.x, middle.y, card, { def: defOf(instance), instanceId: instance.instanceId, power: started ? getPower(state, instance.instanceId) : undefined, ...extra })

      this.layer.add(sprite)
      this.wireZoom(sprite)

      if (attacks.has(attackId)) {
        sprite.setHighlight(ATTACK).enableInput()
        this.input.setDraggable(sprite)
        this.sources.set(sprite, { kind: 'attacker', id: attackId })
      }
      else if (uses.has(instance.instanceId)) {
        sprite.setHighlight(ACTIVATE)
      }

      if (uses.has(instance.instanceId))
        sprite.on('pointerup', (pointer: Phaser.Input.Pointer) => {
          if (pointer.leftButtonReleased() && pointer.getDistance() < 6)
            this.activate(instance.instanceId)

        })

    }

    const stage = new Zone(this, side.stage, 'Stage', null, data.stage ? { def: defOf(data.stage), instanceId: data.stage.instanceId } : null, card)
    const trash = new Zone(this, side.trash, 'Trash', data.trash.length, data.trash.length ? { def: defOf(data.trash[data.trash.length - 1]) } : null, card)

    this.layer.add([stage, trash, new Zone(this, side.deck, 'Deck', data.deck.length, data.deck.length ? { def: null } : null, card), new Zone(this, side.leader, 'Leader', null, null, card)])

    for (const zone of [stage, trash])
      if (zone.sprite)
        this.wireZoom(zone.sprite)

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
    const area     = new DonArea(this, side.don, { active: data.donActive, rested: data.donRested, attached })

    this.layer.add([area, new Zone(this, side.donDeck, 'DON!! deck', data.donDeck, data.donDeck ? { def: null, donFace: true } : null, this.layout.card)])

    if (own && area.token && this.legal.some(action => action.type === 'AttachDon')) {
      area.token.setHighlight(PLAYABLE).enableInput()
      this.input.setDraggable(area.token)
      this.sources.set(area.token, { kind: 'don' })
    }

  }


  private drawHand(side: SideLayout, data: PlayerState, own: boolean) {
    const state    = this.controller.getState()
    const playable = new Set(this.legal.flatMap(action => action.type === 'PlayCharacter' || action.type === 'PlayEvent' || action.type === 'PlayStage' ? [action.instanceId] : []))
    const views    = data.hand.map((instance): CardView => ({ def: own ? state.defs[instance.defId] : null, instanceId: instance.instanceId }))

    if (!own) {
      const back = { w: this.layout.handCard.w * 0.8, h: this.layout.handCard.h * 0.8 }

      this.layer.add(new FanView(this, side.hand, views, back, 'rival'))

      return
    }

    const hand = new FanView(this, side.hand, views, this.layout.handCard, 'self')

    this.layer.add(hand)

    for (const sprite of hand.sprites) {
      this.wireZoom(sprite)

      if (sprite.instanceId && playable.has(sprite.instanceId)) {
        sprite.setHighlight(PLAYABLE).enableInput()
        this.input.setDraggable(sprite)
        this.sources.set(sprite, { kind: 'hand', id: sprite.instanceId })
      }
      else {
        sprite.enableInput()
      }
    }

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


  private targetAt(side: SideLayout, player: PlayerState, x: number, y: number): 'leader' | string | null {
    if (contains(side.leader, x, y))
      return 'leader'

    const index = player.characters.findIndex((_, i) => contains(side.slots[i], x, y))

    return index >= 0 ? player.characters[index].card.instanceId : null

  }


  private actionsAt(source: DragSource, x: number, y: number): Action[] {
    const state = this.controller.getState()
    const { self, rival } = this.layout

    if (source.kind === 'hand') {
      const card = state.players[this.viewer].hand.find(candidate => candidate.instanceId === source.id)
      const zone = card && state.defs[card.defId].type === 'Stage' ? self.stage : self.characters

      return contains(zone, x, y) ? this.legal.filter(action => (action.type === 'PlayCharacter' || action.type === 'PlayEvent' || action.type === 'PlayStage') && action.instanceId === source.id) : []

    }

    if (source.kind === 'don') {
      const target = this.targetAt(self, state.players[this.viewer], x, y)

      return target ? this.legal.filter(action => action.type === 'AttachDon' && action.target === target) : []

    }

    const target = this.targetAt(rival, state.players[opponentOf(this.viewer)], x, y)

    return target ? this.legal.filter(action => action.type === 'Attack' && action.attacker === source.id && action.target === target) : []

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


  private showDialog(title: string, options: PromptOption[]) {
    this.dialog?.destroy()
    this.dialog = new PromptDialog(this, { w: this.layout.width, h: this.layout.height }, title, options)
    this.add.existing(this.dialog)

  }


  private closeDialog() {
    this.dialog?.destroy()
    this.dialog = null

  }


  private send(action: Action) {
    this.closeDialog()

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
