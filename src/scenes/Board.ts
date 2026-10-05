import * as Phaser from 'phaser'
import { getPower, opponentOf } from '../engine'
import type { Action, CardInstance, PlayerId, PlayerState } from '../engine'
import { createMockController } from '../dev/mockGame'
import { CardSprite } from '../ui/CardSprite'
import type { CardView } from '../ui/CardSprite'
import { CardZoom } from '../ui/CardZoom'
import { cardText } from '../ui/cardText'
import { DonArea } from '../ui/DonArea'
import { GameController } from '../ui/GameController'
import { HandView } from '../ui/HandView'
import { center, computeLayout, contains } from '../ui/layout'
import type { BoardLayout, SideLayout } from '../ui/layout'
import { LifeArea } from '../ui/LifeArea'
import { PromptDialog } from '../ui/PromptDialog'
import type { PromptOption } from '../ui/PromptDialog'
import { buildPrompt, describeAction } from '../ui/prompts'
import { preloadCardImages } from '../ui/textures'
import { Zone } from '../ui/Zone'

type DragSource =
  | { kind: 'hand'; id: string }
  | { kind: 'don' }
  | { kind: 'attacker'; id: string }

const PLAYABLE  = 0xffd54a
const ATTACK    = 0xff7043
const ACTIVATE  = 0x4dd0e1
const NOTICE_MS = 3000


export class Board extends Phaser.Scene {

  private controller!: GameController
  private layout!: BoardLayout
  private layer!: Phaser.GameObjects.Container
  private zoom!: CardZoom
  private dialog: PromptDialog | null = null
  private status!: Phaser.GameObjects.Text
  private notice: string | null = null
  private dirty = true
  private viewer: PlayerId = 'p1'
  private legal: Action[] = []
  private sources = new Map<Phaser.GameObjects.GameObject, DragSource>()
  private images: string[] = []

  constructor() {
    super('Board')

  }


  init(data: { controller?: GameController; images?: string[] }) {
    this.controller = data.controller ?? createMockController()
    this.images     = data.images ?? []

  }


  preload() {
    preloadCardImages(this, this.images)

  }


  create() {
    this.layout = computeLayout(this.scale.width, this.scale.height)
    this.input.mouse?.disableContextMenu()

    const unsubscribe = this.controller.on(() => { this.dirty = true })

    this.events.once('shutdown', unsubscribe)
    this.input.on('drag', (_pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.Container, x: number, y: number) => object.setPosition(x, y))
    this.input.on('dragend', (pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.GameObject) => this.onDragEnd(pointer, object))
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && this.zoom.pinned)
        this.zoom.hide()

    })

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

    this.viewer = this.controller.actor()
    this.legal  = this.controller.getLegal(this.viewer)
    this.layer  = this.add.container(0, 0)

    const { layout } = this
    const rival      = opponentOf(this.viewer)

    this.drawSide(rival, layout.rival, false)
    this.drawSide(this.viewer, layout.self, true)
    this.drawStatus()
    this.drawPassButton()

    this.zoom = new CardZoom(this, layout.zoom, cardText)
    this.add.existing(this.zoom)

    const prompt = buildPrompt(state, this.legal, this.viewer)

    if (prompt)
      this.showDialog(prompt.title, prompt.options.map(option => ({ label: option.label, run: () => this.send(option.action) })))

  }


  private drawStatus() {
    const state = this.controller.getState()
    const rect  = this.layout.status
    const line  = state.winner ? `Game over: ${state.winner.toUpperCase()} wins` : state.phase === 'mulligan' ? `Mulligan (${this.viewer.toUpperCase()})` : `Turn ${state.turn} - ${state.active.toUpperCase()} - ${state.phase}  (viewing ${this.viewer.toUpperCase()})`
    const text  = this.add.text(rect.x, rect.y + rect.h / 2, this.notice ?? line, { fontSize: `${Math.round(rect.h * 0.45)}px`, color: this.notice ? '#ff8a80' : '#ffffff' }).setOrigin(0, 0.5)

    this.layer.add(text)

  }


  private drawPassButton() {
    const pass = this.legal.find(action => action.type === 'PassPhase')

    if (!pass)
      return

    const { button } = this.layout
    const middle     = center(button)
    const box        = this.add.rectangle(middle.x, middle.y, button.w, button.h, 0x2e7d32).setStrokeStyle(2, 0xffffff)
    const label      = this.add.text(middle.x, middle.y, 'End turn', { fontSize: `${Math.round(button.h * 0.5)}px`, color: '#ffffff' }).setOrigin(0.5)

    box.setInteractive({ useHandCursor: true })
    box.on('pointerup', () => this.send(pass))
    this.layer.add([box, label])

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
    const area = new DonArea(this, side.don, { deck: data.donDeck, active: data.donActive, rested: data.donRested })

    this.layer.add(area)

    if (own && area.token && this.legal.some(action => action.type === 'AttachDon')) {
      area.token.setStrokeStyle(4, PLAYABLE).setInteractive({ useHandCursor: true })
      this.input.setDraggable(area.token)
      this.sources.set(area.token, { kind: 'don' })
    }

  }


  private drawHand(side: SideLayout, data: PlayerState, own: boolean) {
    const state    = this.controller.getState()
    const playable = new Set(this.legal.flatMap(action => action.type === 'PlayCharacter' || action.type === 'PlayEvent' || action.type === 'PlayStage' ? [action.instanceId] : []))
    const views    = data.hand.map((instance): CardView => ({ def: own ? state.defs[instance.defId] : null, instanceId: instance.instanceId }))
    const hand     = new HandView(this, side.hand, views, this.layout.handCard)

    this.layer.add(hand)

    if (!own)
      return

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

    const actions = this.actionsAt(source, pointer.x, pointer.y)

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
    this.dialog = new PromptDialog(this, this.layout.width / 2, this.layout.height / 2, title, options)
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
