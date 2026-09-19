// src/scenes/Boot.js
// Procedural texture initialization and game bootstrap

import { generateTextures } from '../utils/Draw.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create() {
    // Generate all procedural canvas graphics without any external image assets
    generateTextures(this);

    // Transition immediately to Splash screen
    this.scene.start('Splash');
  }
}
