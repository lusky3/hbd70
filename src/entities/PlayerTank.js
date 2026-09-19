// src/entities/PlayerTank.js
// Allan's Cruiser Motorcycle Tank with independent headlight turret

import { Bullet } from './Bullet.js';
import { Mine } from './Mine.js';
import { audio } from '../systems/AudioManager.js';

export class PlayerTank extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'motorcycle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.speed = 145;
    this.fireCooldown = 220;
    this.lastFireTime = 0;
    this.mineCooldown = 1000;
    this.lastMineTime = 0;

    // Body collider setup
    this.body.setCircle(13, 3, 3);
    this.body.setCollideWorldBounds(true);
    this.setDepth(20);

    // Independent aiming headlight turret
    this.turret = scene.add.sprite(x, y, 'turret');
    this.turret.setDepth(22);
    this.turretAngle = -Math.PI / 2; // Facing up by default
  }

  update(moveVector, aimVector, isFiring, wantsMine, time) {
    // 1. Movement Physics & Body Rotation
    if (moveVector.length() > 0.1) {
      this.setVelocity(moveVector.x * this.speed, moveVector.y * this.speed);

      // Rotate motorcycle toward movement direction
      const moveAngle = Math.atan2(moveVector.y, moveVector.x);
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, moveAngle, 0.2);

      // Rev engine SFX
      audio.playRev();
    } else {
      this.setVelocity(0, 0);
    }

    // 2. Turret Aiming (Forward-locked with tap-to-aim unlock)
    if (this.scene.controls && this.scene.controls.isAimUnlocked) {
      if (aimVector && aimVector.length() > 0.1) {
        this.turretAngle = Math.atan2(aimVector.y, aimVector.x);
      }
    } else if (this.scene.controls && !this.scene.controls.isAimUnlocked) {
      this.turretAngle = Phaser.Math.Angle.RotateTo(this.turretAngle, this.rotation, 0.25);
    } else if (aimVector && aimVector.length() > 0.1) {
      this.turretAngle = Math.atan2(aimVector.y, aimVector.x);
    }
    this.turret.setPosition(this.x, this.y);
    this.turret.rotation = this.turretAngle;

    // 3. Firing
    if (isFiring && time > this.lastFireTime + this.fireCooldown) {
      this.fireBullet(time);
    }

    // 4. Mine Placement
    if (wantsMine && time > this.lastMineTime + this.mineCooldown) {
      this.placeMine(time);
    }
  }

  fireBullet(time) {
    // Max 5 active bullets
    const activeCount = this.scene.playerBullets.countActive(true);
    if (activeCount >= 5) return;

    this.lastFireTime = time;

    // Calculate tip of headlight cannon
    const tipX = this.x + Math.cos(this.turretAngle) * 16;
    const tipY = this.y + Math.sin(this.turretAngle) * 16;

    const bullet = new Bullet(this.scene, tipX, tipY);
    this.scene.playerBullets.add(bullet);
    bullet.fire(tipX, tipY, Math.cos(this.turretAngle), Math.sin(this.turretAngle), 'player', this.scene.currentBounceCount || 1);
  }

  placeMine(time) {
    const activeMines = this.scene.playerMines.countActive(true);
    if (activeMines >= 2) return;

    this.lastMineTime = time;

    // Drop mine behind the motorcycle based on its body heading
    const behindAngle = this.rotation + Math.PI;
    const dropX = this.x + Math.cos(behindAngle) * 20;
    const dropY = this.y + Math.sin(behindAngle) * 20;

    const mine = new Mine(this.scene, dropX, dropY, 'player');
    this.scene.playerMines.add(mine);
  }

  destroyTank() {
    audio.playExplosion();
    if (this.scene.confettiEmitter) {
      this.scene.confettiEmitter.explode(30, this.x, this.y);
    }
    if (this.turret) this.turret.destroy();
    this.destroy();
  }
}
