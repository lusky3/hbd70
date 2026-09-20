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

    // Godmode Invincibility Aura
    this.auraGraphics = null;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.turret && this.active) {
      this.turret.setPosition(this.x, this.y);
      this.turret.rotation = this.turretAngle;
    }
    if (this.auraGraphics && this.active) {
      this.auraGraphics.setPosition(this.x, this.y);
    }
  }

  setInvincibleAura(active) {
    if (active) {
      if (!this.auraGraphics && this.scene && this.scene.add) {
        this.auraGraphics = this.scene.add.graphics();
        this.auraGraphics.setPosition(this.x, this.y);
        this.auraGraphics.setDepth(24);

        this.auraGraphics.lineStyle(2.5, 0xffd700, 0.9);
        this.auraGraphics.strokeCircle(0, 0, 20);
        this.auraGraphics.fillStyle(0xfbbf24, 0.25);
        this.auraGraphics.fillCircle(0, 0, 20);

        this.scene.tweens.add({
          targets: this.auraGraphics,
          scaleX: 1.15,
          scaleY: 1.15,
          alpha: 0.6,
          duration: 400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    } else {
      if (this.auraGraphics) {
        this.auraGraphics.destroy();
        this.auraGraphics = null;
      }
    }
  }

  stop() {
    this.setVelocity(0, 0);
    if (this.turret && this.active) {
      this.turret.setPosition(this.x, this.y);
      this.turret.rotation = this.turretAngle;
    }
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
    const isRapid = !!(this.scene && this.scene.rapidFireCheat);
    const cooldown = isRapid ? 80 : this.fireCooldown;
    if (isFiring && time > this.lastFireTime + cooldown) {
      this.fireBullet(time, isRapid);
    }

    // 4. Mine Placement
    if (wantsMine && time > this.lastMineTime + this.mineCooldown) {
      this.placeMine(time);
    }
  }

  fireBullet(time, isRapid = false) {
    // Max active bullets (12 in rapid fire mode, 5 in standard mode)
    const maxBullets = (isRapid || (this.scene && this.scene.rapidFireCheat)) ? 12 : 5;
    const activeCount = this.scene.playerBullets.countActive(true);
    if (activeCount >= maxBullets) return;

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
    if (this.auraGraphics) {
      this.auraGraphics.destroy();
      this.auraGraphics = null;
    }
    if (this.turret) this.turret.destroy();
    this.destroy();
  }
}
