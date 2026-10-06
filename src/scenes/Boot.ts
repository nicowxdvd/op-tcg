import * as Phaser from 'phaser'
import { loadDefs } from '../data'
import { findCardImages, findDonImage } from '../ui/textures'

export class Boot extends Phaser.Scene {

  constructor() {
    super('Boot')

  }


  async create() {
    const images   = await findCardImages(Object.keys(loadDefs()))
    const donImage = await findDonImage()

    this.scene.start(import.meta.env.DEV && new URLSearchParams(window.location.search).has('mock') ? 'Board' : 'Menu', { images, donImage })

  }

}
