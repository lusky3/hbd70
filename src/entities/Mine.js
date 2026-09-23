// src/entities/Mine.js
// Party cracker mine with proximity detonation and timed fuse

import { audio } from '../systems/AudioManager.js';

const SpriteBase = typeof Phaser !== 'undefined' && Phaser.Physics?.Arcade?.Sprite ? Phaser.Physics.Arcade.Sprite : class {};

export class Mine extends SpriteBase {
  constructor(scene, x, y, owner = 'player') {
    super(scene, x, y, 'mine');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.owner = owner;
    this.isArmed = false;
    this.explosionRadius = 55;
    this.setDepth(15);

    // Audio on mine deploy
    audio.playMineDrop();

    // Pulse animation
    this.pulseTween = scene.tweens.add({
      targets: this,
      scale: 1.25,
      duration: 350,
      yoyo: true,
      repeat: -1
    });

    // Arming delay: 0.8s
    scene.time.delayedCall(800, () => {
      this.isArmed = true;
    });

    // Fuse timer: 5s auto-detonation
    this.fuseTimer = scene.time.delayedCall(5000, () => {
      this.explode();
    });
  }

  explode() {
    if (!this.active) return;
    this.setActive(false);
    this.setVisible(false);

    if (this.pulseTween) this.pulseTween.stop();
    if (this.fuseTimer) this.fuseTimer.remove();

    audio.playExplosion();

    // Confetti and flash explosion
    if (this.scene.confettiEmitter) {
      this.scene.confettiEmitter.explode(24, this.x, this.y);
    }

    // Proximity check on nearby tanks and blocks
    if (typeof this.scene.onMineExplode === 'function') {
      this.scene.onMineExplode(this.x, this.y, this.explosionRadius);
    } else if (typeof this.scene.explodeMine === 'function') {
      this.scene.explodeMine(this);
    }

    this.destroy();
  }
}
