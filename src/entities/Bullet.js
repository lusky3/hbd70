// src/entities/Bullet.js
// Ricochet party popper bullet with wall bounce physics

import { audio } from '../systems/AudioManager.js';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'bullet');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.speed = 280;
    this.maxBounces = 1;
    this.bouncesRemaining = 1;
    this.owner = null; // 'player' or 'enemy'

    this.body.setCircle(5);
    this.body.setBounce(1, 1);
    this.setDepth(25);
  }

  fire(x, y, dirX, dirY, owner, maxBounces = 1) {
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.owner = owner;
    this.maxBounces = maxBounces;
    this.bouncesRemaining = maxBounces;

    // Normalizing direction vector and setting velocity
    const length = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    this.setVelocity((dirX / length) * this.speed, (dirY / length) * this.speed);

    // Audio cue
    audio.playShoot();
  }

  onWallBounce() {
    const now = Date.now();
    if (this.lastBounceTime && now - this.lastBounceTime < 60) {
      return; // Debounce multi-tile seam collisions in the same frame
    }
    this.lastBounceTime = now;

    this.bouncesRemaining--;
    audio.playBounce();

    if (this.bouncesRemaining < 0) {
      this.explode();
    }
  }

  explode() {
    if (!this.active) return;
    this.setActive(false);
    this.setVisible(false);
    this.setVelocity(0, 0);

    // Mini spark on bullet expiry
    if (this.scene.confettiEmitter) {
      this.scene.confettiEmitter.explode(4, this.x, this.y);
    }
    this.destroy();
  }
}
