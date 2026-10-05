import * as Phaser from 'phaser'
import { loadDefs } from '../data'
import { findCardImages } from '../ui/textures'

export class Boot extends Phaser.Scene {

  constructor() {
    super('Boot')

  }


  async create() {
    const images = await findCardImages(Object.keys(loadDefs()))

    this.scene.start('Board', { images })

  }

}
