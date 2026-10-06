import { loadPreferences, savePreferences } from '../app/preferences'
import type { SoundName } from '../app/sounds'

interface Tone {
  freq: number
  at: number
  dur: number
  type: OscillatorType
  gain: number
  slideTo?: number

}

const EFFECTS: Record<SoundName, Tone[]> = {
  draw   : [{ freq: 600, slideTo: 900, at: 0, dur: 0.09, type: 'triangle', gain: 0.25 }],
  play   : [{ freq: 330, at: 0, dur: 0.08, type: 'square', gain: 0.15 }, { freq: 495, at: 0.07, dur: 0.1, type: 'square', gain: 0.15 }],
  attack : [{ freq: 420, slideTo: 120, at: 0, dur: 0.2, type: 'sawtooth', gain: 0.2 }],
  damage : [{ freq: 200, slideTo: 60, at: 0, dur: 0.28, type: 'square', gain: 0.25 }],
  victory: [523, 659, 784, 1047].map((freq, i): Tone => ({ freq, at: i * 0.14, dur: 0.3, type: 'triangle', gain: 0.25 })),
}

const MELODY     = [220, 262, 330, 262, 294, 262, 220, 196]
const STEP       = 0.45
const MUSIC_GAIN = 0.12


export class AudioManager {

  private context: AudioContext | null = null
  private master: GainNode | null = null
  private music: GainNode | null = null
  private musicTimer: ReturnType<typeof setTimeout> | null = null
  private musicWanted = false
  private volume = 0.5
  private muted = false

  constructor() {
    const { volume, muted } = loadPreferences()

    this.volume = volume
    this.muted  = muted

  }


  attach(target: Window = window) {
    const unlock = () => {
      this.unlock()
      target.removeEventListener('pointerdown', unlock)
      target.removeEventListener('keydown', unlock)

    }

    target.addEventListener('pointerdown', unlock)
    target.addEventListener('keydown', unlock)

  }


  getVolume(): number {
    return this.volume

  }


  isMuted(): boolean {
    return this.muted

  }


  setVolume(volume: number) {
    this.volume = Math.round(Math.min(1, Math.max(0, volume)) * 10) / 10
    this.apply()

  }


  toggleMute() {
    this.muted = !this.muted
    this.apply()

  }


  play(name: SoundName) {
    if (!this.context || !this.master || this.muted)
      return

    for (const tone of EFFECTS[name])
      this.tone(this.master, tone, this.context.currentTime)

  }


  startMusic() {
    this.musicWanted = true

    if (this.context && !this.musicTimer)
      this.scheduleBar()

  }


  stopMusic() {
    this.musicWanted = false

    if (this.musicTimer)
      clearTimeout(this.musicTimer)

    this.musicTimer = null

  }


  private unlock() {
    if (this.context)
      return

    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

    if (!Context)
      return

    this.context = new Context()
    this.master  = this.context.createGain()
    this.music   = this.context.createGain()
    this.music.gain.value = MUSIC_GAIN
    this.music.connect(this.master)
    this.master.connect(this.context.destination)
    this.apply()

    if (this.musicWanted)
      this.scheduleBar()

  }


  private apply() {
    if (this.master)
      this.master.gain.value = this.muted ? 0 : this.volume

    savePreferences({ ...loadPreferences(), volume: this.volume, muted: this.muted })

  }


  private scheduleBar() {
    if (!this.context || !this.music)
      return

    const start = this.context.currentTime + 0.05

    MELODY.forEach((freq, i) => this.tone(this.music as GainNode, { freq, at: i * STEP, dur: STEP * 0.9, type: 'triangle', gain: 1 }, start))
    this.musicTimer = setTimeout(() => this.scheduleBar(), MELODY.length * STEP * 1000)

  }


  private tone(destination: GainNode, tone: Tone, base: number) {
    const context = this.context as AudioContext
    const osc     = context.createOscillator()
    const env     = context.createGain()
    const start   = base + tone.at
    const end     = start + tone.dur

    osc.type = tone.type
    osc.frequency.setValueAtTime(tone.freq, start)

    if (tone.slideTo)
      osc.frequency.exponentialRampToValueAtTime(tone.slideTo, end)

    env.gain.setValueAtTime(0.0001, start)
    env.gain.exponentialRampToValueAtTime(tone.gain, start + 0.01)
    env.gain.exponentialRampToValueAtTime(0.0001, end)
    osc.connect(env)
    env.connect(destination)
    osc.start(start)
    osc.stop(end + 0.02)

  }

}


export const audio = new AudioManager()
