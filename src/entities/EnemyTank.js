// src/entities/EnemyTank.js
// Enemy tank entity supporting 7 historical & celebratory archetypes

import { Bullet } from './Bullet.js';
import { Mine } from './Mine.js';
import { audio } from '../systems/AudioManager.js';
import { EnemyAI } from '../systems/EnemyAI.js';

export class EnemyTank extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = 'candle') {
    super(scene, x, y, type);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.type = type;
    this.lastFireTime = 0;
    this.lastMineTime = 0;

    this.setupTypeConfig();

    this.body.setCollideWorldBounds(true);
    this.body.setBounce(this.bounce, this.bounce);
    this.setDepth(18);

    this.ai = new EnemyAI(this);
  }

  setupTypeConfig() {
    switch (this.type) {
      case 'candle':
        this.hp = 1;
        this.speed = 0;
        this.fireCooldown = 2400;
        this.bulletBounces = 1;
        this.bounce = 0;
        this.body.setCircle(12, 4, 4);
        break;
      case 'golf':
        this.hp = 1;
        this.speed = 55;
        this.fireCooldown = 2500;
        this.bulletBounces = 2;
        this.bounce = 1;
        this.body.setCircle(12, 4, 4);
        break;
      case 'puck':
        this.hp = 1;
        this.speed = 135;
        this.fireCooldown = 1900;
        this.bulletBounces = 1;
        this.bounce = 1;
        this.body.setCircle(12, 4, 4);
        break;
      case 'boat':
        this.hp = 1;
        this.speed = 85;
        this.fireCooldown = 1800;
        this.bulletBounces = 1;
        this.bounce = 0.8;
        this.body.setCircle(12, 4, 4);
        break;
      case 'snowmobile':
        this.hp = 1;
        this.speed = 110;
        this.fireCooldown = 1600;
        this.bulletBounces = 1;
        this.bounce = 0.6;
        this.body.setCircle(12, 4, 4);
        break;
      case 'biker':
        this.hp = 1;
        this.speed = 120;
        this.fireCooldown = 1500;
        this.bulletBounces = 1;
        this.bounce = 0.5;
        this.body.setCircle(13, 3, 3);
        break;
      case 'boss':
        this.hp = 5;
        this.speed = 45;
        this.fireCooldown = 1500;
        this.bulletBounces = 2;
        this.bounce = 0.2;
        this.body.setCircle(24, 3, 3);
        break;
      default:
        this.hp = 1;
        this.speed = 50;
        this.fireCooldown = 2500;
        this.bulletBounces = 1;
        this.bounce = 0.5;
        this.body.setCircle(12, 4, 4);
    }
    this.maxHp = this.hp;
  }

  update(player, time, delta) {
    if (!this.active) return;
    this.ai.update(player, time, delta);
  }

  fireBullet(time, angle) {
    if (!this.active) return;
    // Limit active enemy bullets
    if (this.scene.enemyBullets.countActive(true) >= 8) return;

    this.lastFireTime = time;

    const tipDistance = this.type === 'boss' ? 24 : 16;
    const tipX = this.x + Math.cos(angle) * tipDistance;
    const tipY = this.y + Math.sin(angle) * tipDistance;

    const bullet = new Bullet(this.scene, tipX, tipY);
    this.scene.enemyBullets.add(bullet);
    bullet.fire(tipX, tipY, Math.cos(angle), Math.sin(angle), 'enemy', this.bulletBounces);
  }

  fireBossSalvo(time, baseAngle) {
    if (!this.active) return;
    this.lastFireTime = time;

    const angles = [baseAngle - 0.28, baseAngle, baseAngle + 0.28];
    angles.forEach((ang) => {
      const tipX = this.x + Math.cos(ang) * 24;
      const tipY = this.y + Math.sin(ang) * 24;

      const bullet = new Bullet(this.scene, tipX, tipY);
      this.scene.enemyBullets.add(bullet);
      bullet.fire(tipX, tipY, Math.cos(ang), Math.sin(ang), 'enemy', this.bulletBounces);
    });
  }

  placeMine(time) {
    if (!this.active) return;
    if (this.scene.enemyMines && this.scene.enemyMines.countActive(true) >= 2) return;

    this.lastMineTime = time;
    const mine = new Mine(this.scene, this.x, this.y, 'enemy');
    if (this.scene.enemyMines) {
      this.scene.enemyMines.add(mine);
    }
  }

  takeHit() {
    this.hp--;

    // Flash white/transparent effect
    this.scene.tweens.add({
      targets: this,
      alpha: 0.25,
      duration: 60,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (this.active) this.setAlpha(1);
      }
    });

    if (this.hp <= 0) {
      this.destroyTank();
      return true; // Killed
    } else {
      audio.playBounce();
      return false; // Damaged only
    }
  }

  destroyTank() {
    if (!this.active) return;
    audio.playExplosion();

    if (this.scene.confettiEmitter) {
      const particleCount = this.type === 'boss' ? 60 : 25;
      this.scene.confettiEmitter.explode(particleCount, this.x, this.y);
    }

    this.setActive(false);
    this.setVisible(false);
    this.destroy();
  }
}
